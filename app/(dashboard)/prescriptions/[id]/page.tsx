import { getPrescriptionById } from "@/modules/prescriptions/actions/prescriptionActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { FileText, User, Stethoscope, ImageIcon } from "lucide-react";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPrescriptionById(id);
  if (!result.success || !result.data) notFound();

  const rx = result.data;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-mono text-sm text-muted-foreground">
              {rx.prescriptionNumber}
            </p>
            <h1 className="text-lg font-semibold">{rx.diagnosis}</h1>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {formatDate(rx.createdAt)}
        </Badge>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4 text-muted-foreground" />
            Patient
          </div>
          <div>
            <p className="font-medium">{rx.patientId?.name}</p>
            <p className="text-xs text-muted-foreground">
              {rx.patientId?.patientId} · {rx.patientId?.phone}
            </p>
          </div>
        </Card>

        {/* Doctor */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            Doctor
          </div>
          <div>
            <p className="font-medium">{rx.doctorId?.name}</p>
            {rx.doctorId?.specialization && (
              <p className="text-xs text-muted-foreground">
                {rx.doctorId.specialization}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Medicines */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Medicines</h2>
        <div className="space-y-0 border rounded-lg overflow-hidden">
          <div
            className="grid gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1.5fr" }}
          >
            <span>Medicine</span>
            <span>Dose</span>
            <span>Frequency</span>
            <span>Duration</span>
            <span>Instructions</span>
          </div>
          {rx.medicines?.map(
            (
              med: {
                name: string;
                dose: string;
                frequency: string;
                duration: string;
                instructions?: string;
              },
              i: number
            ) => (
              <div
                key={i}
                className="grid gap-3 px-4 py-3 border-t text-sm items-center"
                style={{ gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1.5fr" }}
              >
                <span className="font-medium uppercase">{med.name}</span>
                <span>{med.dose}</span>
                <span className="font-mono">{med.frequency}</span>
                <span>{med.duration}</span>
                <span className="text-muted-foreground">
                  {med.instructions ?? "—"}
                </span>
              </div>
            )
          )}
        </div>
      </Card>

      {/* Instructions + Follow up */}
      {(rx.generalInstructions || rx.followUpDate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rx.generalInstructions && (
            <Card className="p-4 space-y-2">
              <h2 className="text-sm font-medium">General Instructions</h2>
              <p className="text-sm text-muted-foreground">
                {rx.generalInstructions}
              </p>
            </Card>
          )}
          {rx.followUpDate && (
            <Card className="p-4 space-y-2">
              <h2 className="text-sm font-medium">Follow Up</h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(rx.followUpDate)}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Scanned image */}
      {rx.scannedImageUrl && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            Physical Prescription Scan
          </div>
          <a
            href={rx.scannedImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rx.scannedImageUrl}
              alt="Prescription scan"
              className="max-w-md w-full rounded-lg border object-contain hover:opacity-90 transition-opacity"
            />
          </a>
          <p className="text-xs text-muted-foreground">
            Click image to open full size
          </p>
        </Card>
      )}
    </div>
  );
}