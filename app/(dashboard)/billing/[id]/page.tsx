import { getInvoiceById } from "@/modules/billing/actions/billingActions";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PaymentRecorder } from "@/components/billing/PaymentRecorder";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getInvoiceById(id);
  if (!result.success || !result.data) notFound();

  const inv = result.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <DashboardBreadcrumb
        sectionHref="/billing"
        sectionLabel="Billing"
        detailLabel={inv.invoiceNumber}
      />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">
            {inv.invoiceNumber}
          </p>
          <h1 className="text-xl font-semibold mt-0.5">
            {inv.patientId?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {inv.patientId?.patientId} · {inv.patientId?.phone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "text-xs border capitalize",
              STATUS_STYLES[inv.paymentStatus as keyof typeof STATUS_STYLES]
            )}
          >
            {inv.paymentStatus}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(inv.createdAt)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Line items */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-medium">Invoice Items</h2>
        <div className="border rounded-lg overflow-hidden">
          <div
            className="grid gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: "3fr 1fr 80px 80px 90px" }}
          >
            <span>Description</span>
            <span>Type</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">Total</span>
          </div>
          {inv.lineItems?.map(
            (
              item: {
                description: string;
                type: string;
                quantity: number;
                unitPrice: number;
                total: number;
              },
              i: number
            ) => (
              <div
                key={i}
                className="grid gap-3 px-4 py-3 border-t text-sm items-center"
                style={{ gridTemplateColumns: "3fr 1fr 80px 80px 90px" }}
              >
                <span>{item.description}</span>
                <Badge variant="outline" className="text-xs capitalize w-fit">
                  {item.type}
                </Badge>
                <span className="text-right text-muted-foreground">
                  {item.quantity}
                </span>
                <span className="text-right text-muted-foreground">
                  ₹{item.unitPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-right font-medium">
                  ₹{item.total.toLocaleString("en-IN")}
                </span>
              </div>
            )
          )}
        </div>

        {/* Totals */}
        <div className="space-y-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{inv.subtotal?.toLocaleString("en-IN")}</span>
          </div>
          {inv.gstRate > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>GST ({inv.gstRate}%)</span>
              <span>₹{inv.gstAmount?.toLocaleString("en-IN")}</span>
            </div>
          )}
          {inv.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-₹{inv.discountAmount?.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base border-t pt-2">
            <span>Total</span>
            <span>₹{inv.totalAmount?.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-teal-600">
            <span>Paid</span>
            <span>₹{inv.paidAmount?.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-amber-600 font-medium">
            <span>Balance</span>
            <span>₹{inv.balanceAmount?.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </Card>

      {/* Payment recorder */}
      {inv.paymentStatus !== "paid" && inv.paymentStatus !== "cancelled" && (
        <PaymentRecorder
          invoiceId={inv._id}
          balanceAmount={inv.balanceAmount}
        />
      )}

      {/* Payment info */}
      {inv.paymentDate && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-medium">Payment Info</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {inv.paymentMethod} · {formatDate(inv.paymentDate)}
          </p>
        </Card>
      )}

      {inv.notes && (
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-medium">Notes</h2>
          <p className="text-sm text-muted-foreground">{inv.notes}</p>
        </Card>
      )}
    </div>
  );
}
