import { getLabOrderById } from "@/modules/lab/actions/labActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { LabResultsEntry } from "@/components/lab/LabResultsEntry";

const STATUS_STYLES = {
  ordered: "bg-blue-50 text-blue-700 border-blue-200",
  sample_collected: "bg-violet-50 text-violet-700 border-violet-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_LABELS = {
  ordered: "Ordered",
  sample_collected: "Sample Collected",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function LabOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLabOrderById(id);
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

      {/* Tests ordered */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Tests Ordered</h2>
        <div className="border rounded-lg overflow-hidden">
          <div
            className="grid gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: "80px 1fr 1fr 80px" }}
          >
            <span>Code</span>
            <span>Test Name</span>
            <span>Normal Range</span>
            <span className="text-right">Price</span>
          </div>
          {order.tests?.map(
            (test: {
              _id: string;
              code: string;
              name: string;
              normalRange?: { general?: string; male?: string; female?: string };
              price: number;
            }) => (
              <div
                key={test._id}
                className="grid gap-3 px-4 py-3 border-t text-sm items-center"
                style={{ gridTemplateColumns: "80px 1fr 1fr 80px" }}
              >
                <span className="font-mono text-xs font-medium">{test.code}</span>
                <span>{test.name}</span>
                <span className="text-muted-foreground text-xs">
                  {test.normalRange?.general ??
                    (test.normalRange?.male
                      ? `M: ${test.normalRange.male} / F: ${test.normalRange.female}`
                      : "—")}
                </span>
                <span className="text-right text-muted-foreground">
                  ₹{test.price?.toLocaleString("en-IN")}
                </span>
              </div>
            )
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-medium">Order Timeline</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3 text-muted-foreground">
            <span className="w-40 shrink-0">Ordered</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          {order.sampleCollectedAt && (
            <div className="flex gap-3 text-muted-foreground">
              <span className="w-40 shrink-0">Sample collected</span>
              <span>{formatDate(order.sampleCollectedAt)}</span>
            </div>
          )}
          {order.processingStartedAt && (
            <div className="flex gap-3 text-muted-foreground">
              <span className="w-40 shrink-0">Processing started</span>
              <span>{formatDate(order.processingStartedAt)}</span>
            </div>
          )}
          {order.completedAt && (
            <div className="flex gap-3 text-muted-foreground">
              <span className="w-40 shrink-0">Completed</span>
              <span>{formatDate(order.completedAt)}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      {order.status === "completed" && order.results?.length > 0 ? (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-medium">Results</h2>
          <div className="border rounded-lg overflow-hidden">
            <div
              className="grid gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: "80px 1fr 80px 1fr 80px" }}
            >
              <span>Code</span>
              <span>Test</span>
              <span>Value</span>
              <span>Normal Range</span>
              <span>Flag</span>
            </div>
            {order.results.map(
              (
                r: {
                  testCode: string;
                  testName: string;
                  value: string;
                  unit?: string;
                  normalRange?: string;
                  isAbnormal: boolean;
                  notes?: string;
                },
                i: number
              ) => (
                <div
                  key={i}
                  className={cn(
                    "grid gap-3 px-4 py-3 border-t text-sm items-center",
                    r.isAbnormal && "bg-red-50/50"
                  )}
                  style={{ gridTemplateColumns: "80px 1fr 80px 1fr 80px" }}
                >
                  <span className="font-mono text-xs">{r.testCode}</span>
                  <span>{r.testName}</span>
                  <span className={cn("font-medium", r.isAbnormal && "text-red-600")}>
                    {r.value} {r.unit}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {r.normalRange ?? "—"}
                  </span>
                  <span>
                    {r.isAbnormal ? (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                        Abnormal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Normal
                      </Badge>
                    )}
                  </span>
                </div>
              )
            )}
          </div>

          {order.reportUrl && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Uploaded Report
              </p>
              <a
                href={order.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View / Download Report →
              </a>
            </div>
          )}
        </Card>
      ) : order.status === "processing" || order.status === "sample_collected" ? (
        <LabResultsEntry orderId={id} tests={order.tests ?? []} />
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