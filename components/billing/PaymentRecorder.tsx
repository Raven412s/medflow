"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPayment } from "@/modules/billing/actions/billingActions";

export function PaymentRecorder({
  invoiceId,
  balanceAmount,
}: {
  invoiceId: string;
  balanceAmount: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(balanceAmount.toString());
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  function handleRecord() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        paidAmount: amt,
        paymentMethod: method,
      });
      if (!result.success) {
        setError(result.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-sm font-medium">Record Payment</h2>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-32">
          <Label className="text-xs text-muted-foreground">Amount ₹</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 flex-1 min-w-32">
          <Label className="text-xs text-muted-foreground">Method</Label>
          <select
            className={selectClass}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="insurance">Insurance</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Button onClick={handleRecord} disabled={isPending}>
          {isPending ? "Recording..." : "Record Payment"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </Card>
  );
}