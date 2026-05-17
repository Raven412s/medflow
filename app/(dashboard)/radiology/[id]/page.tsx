import { getRadiologyOrderById } from "@/modules/radiology/actions/radiologyActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { RadiologyReportEntry } from "@/components/radiology/RadiologyReportEntry";
import { IMAGING_LABELS } from "@/modules/radiology/constants";

const STATUS_STYLES = {
  ordered: "bg-blue-50 text-blue-700 border-blue-200",
  imaging_done: "bg-violet-50 text-violet-700 border-violet-200",
  reported: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_LABELS = {
  ordered: "Ordered",
  imaging_done: "Imaging Done",
  reported: "Reported",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function RadiologyOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getRadiologyOrderById(id);
  if (!result.success || !result.data) notFound();

  const order = result.data;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            {order.orderNumber}
          </p>
          <h1 className="text-xl font-semibold mt-0.5">
            {order.patientId?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {order.patientId?.patientId} · Ordered by {order.orderedBy?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "text-xs border",
              STATUS_STYLES[order.status as keyof typeof STATUS_STYLES]
            )}
          >
            {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(order.createdAt)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Order details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-medium">Imaging Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <div className="flex items-center gap-1.5">
                <span>{IMAGING_LABELS[order.imagingType] ?? order.imagingType}</span>
                {order.contrast && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                  >
                    +Contrast
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Body Part</span>
              <span>{order.bodyPart}</span>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-medium">Timeline</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-3 text-muted-foreground">
              <span className="w-36 shrink-0">Ordered</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.imagingDoneAt && (
              <div className="flex gap-3 text-muted-foreground">
                <span className="w-36 shrink-0">Imaging done</span>
                <span>{formatDate(order.imagingDoneAt)}</span>
              </div>
            )}
            {order.reportedAt && (
              <div className="flex gap-3 text-muted-foreground">
                <span className="w-36 shrink-0">Reported</span>
                <span>{formatDate(order.reportedAt)}</span>
              </div>
            )}
            {order.completedAt && (
              <div className="flex gap-3 text-muted-foreground">
                <span className="w-36 shrink-0">Completed</span>
                <span>{formatDate(order.completedAt)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Clinical history */}
      {order.clinicalHistory && (
        <Card className="p-4 space-y-2">
          <h2 className="text-sm font-medium">Clinical History</h2>
          <p className="text-sm text-muted-foreground">{order.clinicalHistory}</p>
        </Card>
      )}

      {/* Report — completed */}
      {order.status === "completed" && (order.findings || order.impression) ? (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-medium">Radiology Report</h2>

          {order.findings && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Findings
              </p>
              <p className="text-sm whitespace-pre-wrap">{order.findings}</p>
            </div>
          )}

          {order.impression && (
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Impression
              </p>
              <p className="text-sm font-medium">{order.impression}</p>
            </div>
          )}

          {/* Uploaded images */}
          {order.imageUrls?.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Images ({order.imageUrls.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {order.imageUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Radiology image ${i + 1}`}
                      className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {order.reportUrl && (
            <div className="pt-2 border-t">
              <a
                href={order.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View / Download Full Report →
              </a>
            </div>
          )}
        </Card>
      ) : order.status === "imaging_done" || order.status === "reported" ? (
        <RadiologyReportEntry orderId={id} />
      ) : null}

      {order.notes && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-medium">Notes</h2>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </Card>
      )}
    </div>
  );
}