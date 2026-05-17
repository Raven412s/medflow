"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enterLabResults } from "@/modules/lab/actions/labActions";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabTest {
  _id: string;
  name: string;
  code: string;
  unit?: string;
  normalRange?: {
    general?: string;
    male?: string;
    female?: string;
  };
}

interface ResultRow {
  testId: string;
  testName: string;
  testCode: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
  notes: string;
}

export function LabResultsEntry({
  orderId,
  tests,
}: {
  orderId: string;
  tests: LabTest[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<ResultRow[]>(
    tests.map((t) => ({
      testId: t._id,
      testName: t.name,
      testCode: t.code,
      value: "",
      unit: t.unit ?? "",
      normalRange: t.normalRange?.general ?? "",
      isAbnormal: false,
      notes: "",
    }))
  );

  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [reportBase64, setReportBase64] = useState<string | null>(null);
  const [reportMimeType, setReportMimeType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateResult(index: number, field: keyof ResultRow, value: string | boolean) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function handleFile(file: File) {
    setReportMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setReportPreview(result);
      setReportBase64(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const incomplete = results.some((r) => r.value.trim() === "");
    if (incomplete) {
      setError("Please enter values for all tests");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await enterLabResults(orderId, {
      results,
      reportBase64: reportBase64 ?? undefined,
      reportMimeType: reportMimeType ?? undefined,
    });

    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save results");
      return;
    }

    router.refresh();
  }

  return (
    <Card className="p-5 space-y-5">
      <h2 className="text-sm font-medium">Enter Results</h2>

      {/* Result rows */}
      <div className="space-y-3">
        <div
          className="grid gap-2 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "80px 1fr 120px 120px 80px 1fr" }}
        >
          <span>Code</span>
          <span>Test</span>
          <span>Value</span>
          <span>Normal Range</span>
          <span>Abnormal?</span>
          <span>Notes</span>
        </div>

        {results.map((row, index) => (
          <div
            key={row.testId}
            className={cn(
              "grid gap-2 items-center p-2 rounded-md",
              row.isAbnormal && "bg-red-50/50 border border-red-100"
            )}
            style={{ gridTemplateColumns: "80px 1fr 120px 120px 80px 1fr" }}
          >
            <span className="font-mono text-xs font-medium">{row.testCode}</span>
            <span className="text-sm">{row.testName}</span>
            <div className="flex gap-1 items-center">
              <Input
                value={row.value}
                onChange={(e) => updateResult(index, "value", e.target.value)}
                placeholder="0.0"
                className="h-8 text-sm px-2"
              />
              {row.unit && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {row.unit}
                </span>
              )}
            </div>
            <Input
              value={row.normalRange}
              onChange={(e) => updateResult(index, "normalRange", e.target.value)}
              placeholder="—"
              className="h-8 text-sm px-2"
            />
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={row.isAbnormal}
                onChange={(e) =>
                  updateResult(index, "isAbnormal", e.target.checked)
                }
                className="w-4 h-4 accent-red-500"
              />
            </div>
            <Input
              value={row.notes}
              onChange={(e) => updateResult(index, "notes", e.target.value)}
              placeholder="Optional notes"
              className="h-8 text-sm px-2"
            />
          </div>
        ))}
      </div>

      {/* Report upload */}
      <div className="space-y-2">
        <Label className="text-sm">Upload Report (optional)</Label>
        {reportPreview ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
            <span className="text-sm text-muted-foreground flex-1 truncate">
              Report uploaded ✓
            </span>
            <button
              onClick={() => {
                setReportPreview(null);
                setReportBase64(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Drop report PDF/image or click to browse
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving Results..." : "Save Results & Complete Order"}
      </Button>
    </Card>
  );
}