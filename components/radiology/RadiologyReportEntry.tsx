"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveRadiologyReport } from "@/modules/radiology/actions/radiologyActions";
import { Upload, X, ImagePlus } from "lucide-react";

interface ImageItem {
    preview: string;
    base64: string;
    mimeType: string;
}

export function RadiologyReportEntry({ orderId }: { orderId: string }) {
    const router = useRouter();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const reportInputRef = useRef<HTMLInputElement>(null);

    const [findings, setFindings] = useState("");
    const [impression, setImpression] = useState("");
    const [images, setImages] = useState<ImageItem[]>([]);
    const [reportBase64, setReportBase64] = useState<string | null>(null);
    const [reportMimeType, setReportMimeType] = useState("");
    const [reportPreview, setReportPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function handleImageFiles(files: FileList) {
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setImages((prev) => [
                    ...prev,
                    { preview: result, base64: result, mimeType: file.type },
                ]);
            };
            reader.readAsDataURL(file);
        });
    }

    function handleReportFile(file: File) {
        setReportMimeType(file.type);
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setReportBase64(result);
            setReportPreview(true);
        };
        reader.readAsDataURL(file);
    }

    async function handleSave() {
        if (!findings.trim()) {
            setError("Findings are required");
            return;
        }
        if (!impression.trim()) {
            setError("Impression is required");
            return;
        }

        setSaving(true);
        setError(null);

        const result = await saveRadiologyReport(orderId, {
            findings,
            impression,
            imageBase64List: images.map((i) => i.base64),
            imageMimeTypes: images.map((i) => i.mimeType),
            reportBase64: reportBase64 ?? undefined,
            reportMimeType: reportMimeType ?? undefined,
        });

        setSaving(false);

        if (!result.success) {
            setError(result.error ?? "Failed to save report");
            return;
        }

        router.refresh();
    }

    const textareaClass =
        "flex w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none";

    return (
        <Card className="p-5 space-y-5">
            <h2 className="text-sm font-medium">Enter Radiology Report</h2>

            {/* Findings */}
            <div className="space-y-1.5">
                <Label>Findings *</Label>
                <textarea
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    placeholder="Describe what is seen in the imaging study..."
                    className={textareaClass}
                    style={{ minHeight: "120px" }}
                />
            </div>

            {/* Impression */}
            <div className="space-y-1.5">
                <Label>Impression *</Label>
                <textarea
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    placeholder="Radiologist's conclusion and diagnosis..."
                    className={textareaClass}
                    style={{ minHeight: "80px" }}
                />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
                <Label>Upload Images (optional)</Label>
                <div className="flex flex-wrap gap-3">
                    {images.map((img, i) => (
                        <div key={i} className="relative w-24 h-24">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={img.preview}
                                alt={`Image ${i + 1}`}
                                className="w-full h-full object-cover rounded-lg border"
                            />
                            <button
                                onClick={() =>
                                    setImages((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    >
                        <ImagePlus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add image</span>
                    </button>
                </div>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) handleImageFiles(e.target.files);
                    }}
                />
            </div>

            {/* Report PDF upload */}
            <div className="space-y-2">
                <Label>Upload Report PDF (optional)</Label>
                {reportPreview ? (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
                        <span className="text-sm text-muted-foreground flex-1">
                            Report attached ✓
                        </span>
                        <button
                            onClick={() => {
                                setReportBase64(null);
                                setReportPreview(false);
                                if (reportInputRef.current) reportInputRef.current.value = "";
                            }}
                        >
                            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                    </div>
                ) : (
                    <div
                        className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                        onClick={() => reportInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) handleReportFile(file);
                        }}
                    >
                        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                        <p className="text-sm text-muted-foreground">
                            Drop PDF or click to browse
                        </p>
                    </div>
                )}
                <input
                    ref={reportInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleReportFile(file);
                    }}
                />
            </div>

            {error && (
                <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {error}
                </p>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving Report..." : "Save Report & Complete Order"}
            </Button>
        </Card>
    );
}