import { getInvoices, getBillingSummary } from "@/modules/billing/actions/billingActions";
import { BillingClient } from "@/components/billing/BillingClient";
import { Card } from "@/components/ui/card";
import { Receipt, TrendingUp, Clock, FileText } from "lucide-react";

export default async function BillingPage() {
  const [invoicesResult, summaryResult] = await Promise.all([
    getInvoices({ page: 1, limit: 20 }),
    getBillingSummary(),
  ]);

  const summary = summaryResult.data ?? {
    totalRevenue: 0,
    totalPending: 0,
    totalInvoices: 0,
    pendingCount: 0,
  };

  const stats = [
    {
      label: "Total Revenue",
      value: `₹${summary.totalRevenue.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-teal-500",
    },
    {
      label: "Pending Amount",
      value: `₹${summary.totalPending.toLocaleString("en-IN")}`,
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: "Total Invoices",
      value: summary.totalInvoices.toString(),
      icon: FileText,
      color: "text-blue-500",
    },
    {
      label: "Pending Invoices",
      value: summary.pendingCount.toString(),
      icon: Receipt,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invoices, payments, and revenue tracking
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-xl font-semibold">{stat.value}</div>
            </Card>
          );
        })}
      </div>

      <BillingClient initialInvoices={invoicesResult.data ?? []} />
    </div>
  );
}