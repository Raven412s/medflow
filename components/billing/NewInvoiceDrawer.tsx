"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createInvoice } from "@/modules/billing/actions/billingActions";
import { searchPatients } from "@/modules/prescriptions/actions/prescriptionActions";
import { Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const LineSchema = z.object({
    description: z.string().min(1, "Required"),
    type: z.enum(["consultation", "medicine", "lab", "procedure", "other"]),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
});

const FormSchema = z.object({
    patientId: z.string().min(1, "Patient required"),
    lineItems: z.array(LineSchema).min(1, "Add at least one item"),
    gstRate: z.number().min(0).max(100).default(0),
    discountAmount: z.number().min(0).default(0),
    paidAmount: z.number().min(0).default(0),
    paymentMethod: z
        .enum(["cash", "card", "upi", "insurance", "other"])
        .optional(),
    notes: z.string().optional(),
});

type FormInput = z.infer<typeof FormSchema>;

interface Patient {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
}

const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewInvoiceDrawer({
    open,
    onClose,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [patientSearch, setPatientSearch] = useState("");
    const [searchResults, setSearchResults] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searching, setSearching] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm<FormInput>({
        resolver: zodResolver(FormSchema) as Resolver<FormInput>,
        defaultValues: {
            lineItems: [
                {
                    description: "Consultation Fee",
                    type: "consultation",
                    quantity: 1,
                    unitPrice: 0,
                    total: 0,
                },
            ],
            gstRate: 0,
            discountAmount: 0,
            paidAmount: 0,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lineItems",
    });

    const watchedItems = watch("lineItems");
    const gstRate = watch("gstRate") || 0;
    const discount = watch("discountAmount") || 0;
    const paidAmount = watch("paidAmount") || 0;

    const subtotal = watchedItems?.reduce((sum, item) => {
        return sum + (Number(item.quantity) * Number(item.unitPrice) || 0);
    }, 0) ?? 0;

    const gstAmount = Math.round((subtotal * Number(gstRate)) / 100);
    const total = Math.round(subtotal + gstAmount - Number(discount));
    const balance = Math.max(0, total - Math.round(Number(paidAmount)));

    // Auto-calculate row total when qty or price changes
    const updateRowTotal = useCallback(
        (index: number) => {
            const qty = Number(watchedItems?.[index]?.quantity ?? 1);
            const price = Number(watchedItems?.[index]?.unitPrice ?? 0);
            setValue(`lineItems.${index}.total`, parseFloat((qty * price).toFixed(2)));
        },
        [watchedItems, setValue]
    );

    // Patient search
    useEffect(() => {
        if (patientSearch.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            const r = await searchPatients(patientSearch);
            if (r.success) setSearchResults(r.data ?? []);
            setSearching(false);
        }, 300);
        return () => clearTimeout(t);
    }, [patientSearch]);

    function handleClose() {
        reset();
        setPatientSearch("");
        setSearchResults([]);
        setSelectedPatient(null);
        setServerError(null);
        onClose();
    }

    async function onSubmit(data: FormInput) {
        setServerError(null);
        const result = await createInvoice(data);
        if (!result.success) {
            setServerError(result.error ?? "Failed to create invoice");
            return;
        }
        handleClose();
        onSuccess();
    }

    return (
        <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto lg:min-w-1/2">
                <SheetHeader className="mb-5">
                    <SheetTitle>New Invoice</SheetTitle>
                    <SheetDescription>
                        Create a billing invoice for a patient.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Patient search */}
                    <div className="space-y-2">
                        <Label>Patient *</Label>
                        {selectedPatient ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                                <div>
                                    <p className="text-sm font-medium">{selectedPatient.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPatient.patientId} · {selectedPatient.phone}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setSelectedPatient(null);
                                        setValue("patientId", "");
                                    }}
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Search patient by name or phone..."
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                    />
                                </div>
                                {patientSearch.length >= 2 && (
                                    <div className="border rounded-lg overflow-hidden">
                                        {searching ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">
                                                Searching...
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="p-3 text-sm text-muted-foreground text-center">
                                                No patients found
                                            </div>
                                        ) : (
                                            searchResults.map((p) => (
                                                <button
                                                    key={p._id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm border-b last:border-0"
                                                    onClick={() => {
                                                        setSelectedPatient(p);
                                                        setValue("patientId", p._id);
                                                        setPatientSearch("");
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    <span className="font-medium">{p.name}</span>
                                                    <span className="text-muted-foreground ml-2 text-xs">
                                                        {p.phone}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {errors.patientId && (
                            <p className="text-xs text-destructive">
                                {errors.patientId.message}
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Line items */}
                    <div className="space-y-3">
                        <Label>Line Items *</Label>

                        <div
                            className="grid gap-1.5 text-xs text-muted-foreground font-medium"
                            style={{ gridTemplateColumns: "2fr 1fr 80px 80px 80px 28px" }}
                        >
                            <span>Description</span>
                            <span>Type</span>
                            <span>Qty</span>
                            <span>Price ₹</span>
                            <span>Total ₹</span>
                            <span />
                        </div>

                        {fields.map((field, index) => (
                            <div
                                key={field.id}
                                className="grid gap-1.5 items-start"
                                style={{ gridTemplateColumns: "2fr 1fr 80px 80px 80px 28px" }}
                            >
                                <Input
                                    placeholder="Consultation fee"
                                    className="text-sm h-9"
                                    {...register(`lineItems.${index}.description`)}
                                />
                                <select
                                    className={cn(selectClass, "h-9 text-xs px-2")}
                                    {...register(`lineItems.${index}.type`)}
                                >
                                    <option value="consultation">Consult</option>
                                    <option value="medicine">Medicine</option>
                                    <option value="lab">Lab</option>
                                    <option value="procedure">Procedure</option>
                                    <option value="other">Other</option>
                                </select>
                                <Input
                                    type="number"
                                    min={1}
                                    className="text-sm h-9 px-2"
                                    {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                                    onChange={(e) => {
                                        register(`lineItems.${index}.quantity`).onChange(e);
                                        setTimeout(() => updateRowTotal(index), 50);
                                    }}
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="text-sm h-9 px-2"
                                    {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                                    onChange={(e) => {
                                        register(`lineItems.${index}.unitPrice`).onChange(e);
                                        setTimeout(() => updateRowTotal(index), 50);
                                    }}
                                />
                                <Input
                                    type="number"
                                    min={0}
                                    className="text-sm h-9 px-2 bg-muted"
                                    readOnly
                                    {...register(`lineItems.${index}.total`, { valueAsNumber: true })}
                                />
                                <button
                                    type="button"
                                    onClick={() => fields.length > 1 && remove(index)}
                                    className={cn(
                                        "flex items-center justify-center w-7 h-9 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                                        fields.length === 1 && "opacity-30 cursor-not-allowed"
                                    )}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                                append({
                                    description: "",
                                    type: "other",
                                    quantity: 1,
                                    unitPrice: 0,
                                    total: 0,
                                })
                            }
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add Item
                        </Button>
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">GST</span>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-16 h-7 text-xs px-2"
                                    {...register("gstRate", { valueAsNumber: true })}
                                />
                                <span className="text-muted-foreground text-xs">%</span>
                            </div>
                            <span>₹{gstAmount.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Discount</span>
                                <Input
                                    type="number"
                                    min={0}
                                    className="w-20 h-7 text-xs px-2"
                                    {...register("discountAmount", { valueAsNumber: true })}
                                />
                            </div>
                            <span className="text-green-600">
                                -₹{Number(discount).toLocaleString("en-IN")}
                            </span>
                        </div>

                        <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>₹{total.toLocaleString("en-IN")}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Payment */}
                    <div className="space-y-3">
                        <Label>Payment Received</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">
                                    Amount ₹
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0"
                                    {...register("paidAmount", { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Method</Label>
                                <select className={selectClass} {...register("paymentMethod")}>
                                    <option value="">Select</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="upi">UPI</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Balance summary */}
                        <div className="flex justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
                            <span className="text-muted-foreground">Balance due</span>
                            <span
                                className={
                                    balance > 0 ? "text-amber-600 font-medium" : "text-teal-600 font-medium"
                                }
                            >
                                ₹{balance.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Notes</Label>
                        <textarea
                            placeholder="Optional notes..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            {...register("notes")}
                        />
                    </div>

                    {serverError && (
                        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                            {serverError}
                        </p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Create Invoice"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}