"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { enterLabResults } from "@/modules/lab/actions/labActions";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabParameter {
  code: string;
  name: string;
  unit?: string;
  normalRange?: {
    general?: string;
    male?: string;
    female?: string;
  };
}

interface LabTest {
  _id: string;
  name: string;
  code: string;
  parameters: LabParameter[];
}

interface ParameterResultRow {
  parameterCode: string;
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
  notes: string;
}

interface TestResultGroup {
  testId: string;
  testName: string;
  testCode: string;
  parameterResults: ParameterResultRow[];
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

  // Initialize result groups from tests + parameters
  const [resultGroups, setResultGroups] = useState<TestResultGroup[]>(
    tests.map((test) => ({
      testId: test._id,
      testName: test.name,
      testCode: test.code,
      parameterResults: (test.parameters ?? []).map((p) => ({
        parameterCode: p.code,
        parameterName: p.name,
        value: "",
        unit: p.unit ?? "",
        normalRange: p.normalRange?.general ?? "",
        isAbnormal: false,
        notes: "",
      })),
    }))
  );

  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [reportBase64, setReportBase64] = useState<string | null>(null);
  const [reportMimeType, setReportMimeType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParameter(
    groupIndex: number,
    paramIndex: number,
    field: keyof ParameterResultRow,
    value: string | boolean
  ) {
    setResultGroups((prev) =>
      prev.map((group, gi) => {
        if (gi !== groupIndex) return group;
        return {
          ...group,
          parameterResults: group.parameterResults.map((p, pi) =>
            pi === paramIndex ? { ...p, [field]: value } : p
          ),
        };
      })
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
    // Validate all values filled
    for (const group of resultGroups) {
      for (const param of group.parameterResults) {
        if (param.value.trim() === "") {
          setError(`Enter value for ${param.parameterName} (${group.testCode})`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    const result = await enterLabResults(orderId, {
      results: resultGroups,
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

      {/* One section per test */}
      {resultGroups.map((group, groupIndex) => (
        <div key={group.testId} className="space-y-3">
          {resultGroups.length > 1 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {group.testCode}
              </Badge>
              <span className="text-sm font-medium">{group.testName}</span>
            </div>
          )}

          {/* Column headers */}
          <div
            className="grid gap-2 text-xs font-medium text-muted-foreground"
            style={{
              gridTemplateColumns: "80px 1fr 120px 130px 70px 1fr",
            }}
          >
            <span>Code</span>
            <span>Parameter</span>
            <span>Value</span>
            <span>Normal Range</span>
            <span>Abnormal</span>
            <span>Notes</span>
          </div>

          {/* Parameter rows */}
          <div className="space-y-1.5">
            {group.parameterResults.map((param, paramIndex) => (
              <div
                key={param.parameterCode}
                className={cn(
                  "grid gap-2 items-center p-2 rounded-md transition-colors",
                  param.isAbnormal
                    ? "bg-red-50 border border-red-100"
                    : "hover:bg-muted/30"
                )}
                style={{
                  gridTemplateColumns: "80px 1fr 120px 130px 70px 1fr",
                }}
              >
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {param.parameterCode}
                </span>
                <span className="text-sm">{param.parameterName}</span>
                <div className="flex items-center gap-1">
                  <Input
                    value={param.value}
                    onChange={(e) =>
                      updateParameter(groupIndex, paramIndex, "value", e.target.value)
                    }
                    placeholder="0.0"
                    className="h-8 text-sm px-2 flex-1"
                  />
                  {param.unit && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {param.unit}
                    </span>
                  )}
                </div>
                <Input
                  value={param.normalRange}
                  onChange={(e) =>
                    updateParameter(
                      groupIndex,
                      paramIndex,
                      "normalRange",
                      e.target.value
                    )
                  }
                  placeholder="—"
                  className="h-8 text-sm px-2"
                />
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={param.isAbnormal}
                    onChange={(e) =>
                      updateParameter(
                        groupIndex,
                        paramIndex,
                        "isAbnormal",
                        e.target.checked
                      )
                    }
                    className="w-4 h-4 accent-red-500"
                  />
                </div>
                <Input
                  value={param.notes}
                  onChange={(e) =>
                    updateParameter(groupIndex, paramIndex, "notes", e.target.value)
                  }
                  placeholder="Optional"
                  className="h-8 text-sm px-2"
                />
              </div>
            ))}
          </div>

          {groupIndex < resultGroups.length - 1 && <Separator />}
        </div>
      ))}

      {/* Report upload */}
      <Separator />
      <div className="space-y-2">
        <p className="text-sm font-medium">Upload Report (optional)</p>
        {reportPreview ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
            <span className="text-sm text-muted-foreground flex-1">
              Report attached ✓
            </span>
            <button
              onClick={() => {
                setReportPreview(null);
                setReportBase64(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              Drop PDF or image, or click to browse
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