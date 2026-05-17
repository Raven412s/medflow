"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getInvoices } from "@/modules/billing/actions/billingActions";
import { formatDate, cn } from "@/lib/utils";
import { Plus, ChevronRight } from "lucide-react";
import { NewInvoiceDrawer } from "@/components/billing/NewInvoiceDrawer";

const STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_LABELS = {
    pending: "Pending",
    paid: "Paid",
    partial: "Partial",
    cancelled: "Cancelled",
};

interface Invoice {
    _id: string;
    invoiceNumber: string;
    patientId: { name: string; patientId: string };
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentStatus: keyof typeof STATUS_STYLES;
    createdAt: string;
    lineItems: { type: string }[];
}

export function BillingClient({
    initialInvoices,
}: {
    initialInvoices: Invoice[];
}) {
    const router = useRouter();
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
    const [statusFilter, setStatusFilter] = useState("all");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    function refresh(status?: string) {
        startTransition(async () => {
            const result = await getInvoices({
                status: status && status !== "all" ? status : undefined,
                limit: 20,
            });
            if (result.success) setInvoices(result.data ?? []);
        });
    }

    function handleStatusFilter(value: string | null) {
        const v = value ?? "all";
        setStatusFilter(v);
        refresh(v);
    }
    
    return (
        <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All invoices" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All invoices</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <Button onClick={() => setDrawerOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Invoice
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-48">Invoice No.</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                                    No invoices found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow
                                    key={inv._id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/billing/${inv._id}`)}
                                >
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {inv.invoiceNumber}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">
                                            {inv.patientId?.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {inv.patientId?.patientId}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {inv.lineItems?.length ?? 0} item
                                        {inv.lineItems?.length !== 1 ? "s" : ""}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-sm">
                                        ₹{inv.totalAmount.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-teal-600">
                                        ₹{inv.paidAmount.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-amber-600">
                                        ₹{inv.balanceAmount.toLocaleString("en-IN")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs border",
                                                STATUS_STYLES[inv.paymentStatus]
                                            )}
                                        >
                                            {STATUS_LABELS[inv.paymentStatus]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(inv.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <NewInvoiceDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onSuccess={() => {
                    setDrawerOpen(false);
                    refresh(statusFilter);
                }}
            />
        </>
    );
}