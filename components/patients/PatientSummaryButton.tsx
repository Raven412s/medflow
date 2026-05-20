"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generatePatientSummary } from "@/modules/prescriptions/actions/aiActions";
import { Sparkles, Loader2, X } from "lucide-react";

export function PatientSummaryButton({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generatePatientSummary(patientId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setSummary(result.summary ?? null);
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="text-xs border-violet-200 text-violet-700 hover:bg-violet-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        )}
        {loading ? "Generating..." : "AI Clinical Summary"}
      </Button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {summary && (
        <div className="relative border border-violet-200 rounded-lg p-4 bg-violet-50/50">
          <button
            onClick={() => setSummary(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-medium text-violet-700">
              AI Clinical Summary
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{summary}</p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            AI generated — review before use
          </p>
        </div>
      )}
    </div>
  );
}