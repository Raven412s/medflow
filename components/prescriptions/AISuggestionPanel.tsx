"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPrescriptionSuggestions, MedicineSuggestion } from "@/modules/prescriptions/actions/aiActions";
import { Sparkles, Plus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISuggestionPanelProps {
  diagnosis: string;
  patientAge?: number;
  patientGender?: string;
  knownAllergies?: string;
  onApply: (medicines: MedicineSuggestion[]) => void;
}

export function AISuggestionPanel({
  diagnosis,
  patientAge,
  patientGender,
  knownAllergies,
  onApply,
}: AISuggestionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[] | null>(null);
  const [generalInstructions, setGeneralInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function handleFetch() {
    if (!diagnosis.trim()) {
      setError("Enter a diagnosis first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions(null);
    setApplied(false);

    const result = await getPrescriptionSuggestions({
      diagnosis,
      patientAge,
      patientGender,
      knownAllergies,
    });

    setLoading(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "Failed to get suggestions");
      return;
    }

    setSuggestions(result.data.medicines);
    setGeneralInstructions(result.data.generalInstructions);
  }

  function handleApply() {
    if (!suggestions) return;
    onApply(suggestions);
    setApplied(true);
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-violet-50 to-indigo-50 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-violet-700">
            AI Suggestion
          </span>
          <Badge
            variant="outline"
            className="text-xs bg-violet-100 text-violet-700 border-violet-200"
          >
            Beta
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs h-7 border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={handleFetch}
          disabled={loading || !diagnosis.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-1.5" />
              {suggestions ? "Regenerate" : "Suggest Medicines"}
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {!suggestions && !loading && !error && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Enter diagnosis above and click &quot;Suggest Medicines&quot; to get AI recommendations.
            <br />
            <span className="text-violet-600">Doctor must review all suggestions before prescribing.</span>
          </p>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            <p className="text-xs text-muted-foreground">
              Analyzing diagnosis and generating suggestions...
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 py-3 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {suggestions && !loading && (
          <div className="space-y-3">
            {/* Medicines */}
            <div className="space-y-2">
              {suggestions.map((med, i) => (
                <div
                  key={i}
                  className="grid gap-2 text-xs p-2.5 rounded-md bg-muted/40 border"
                  style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
                >
                  <span className="font-medium uppercase truncate">
                    {med.name}
                  </span>
                  <span className="text-muted-foreground">{med.dose}</span>
                  <span className="font-mono text-muted-foreground">
                    {med.frequency}
                  </span>
                  <span className="text-muted-foreground">{med.duration}</span>
                  {med.instructions && (
                    <span className="text-muted-foreground col-span-4 italic">
                      {med.instructions}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {generalInstructions && (
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded p-2">
                {generalInstructions}
              </p>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                AI suggestions only. Review carefully before prescribing. Not a substitute for clinical judgment.
              </span>
            </div>

            <Separator />

            {/* Apply button */}
            <Button
              type="button"
              className={cn(
                "w-full text-xs h-8",
                applied && "bg-green-600 hover:bg-green-700"
              )}
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? (
                "✓ Applied to prescription"
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Apply to Prescription
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}