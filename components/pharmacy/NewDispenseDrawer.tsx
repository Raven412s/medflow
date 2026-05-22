"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createDispense } from "@/modules/pharmacy/actions/pharmacyActions";
import { searchPatients } from "@/modules/prescriptions/actions/prescriptionActions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

const Schema = z.object({
  patientId: z.string().min(1, "Patient required"),
  prescriptionId: z.string().optional(),
  items: z.array(z.object({
    medicineId: z.string().min(1, "Required"),
    medicineName: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
  })).min(1, "Add at least one item"),
  paidAmount: z.number().min(0),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

interface Medicine {
  _id: string;
  name: string;
  strength?: string;
  form: string;
  unit: string;
  sellingPrice: number;
  currentStock: number;
}

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
}

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewDispenseDrawer({
  open, medicines, onClose, onSuccess,
}: {
  open: boolean;
  medicines: Medicine[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const {
    register, handleSubmit, setValue, watch,
    reset, control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema) as Resolver<FormInput>,
    defaultValues: {
      items: [{ medicineId: "", medicineName: "", quantity: 1, unitPrice: 0, total: 0 }],
      paidAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paidAmount = watch("paidAmount") || 0;

  const totalAmount = watchedItems?.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0), 0
  ) ?? 0;

  const balance = Math.max(0, totalAmount - Number(paidAmount));

  const handlePatientSearch = useCallback((value: string) => {
    setPatientSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const r = await searchPatients(value);
      if (r.success) setSearchResults(r.data ?? []);
      setSearching(false);
    }, 300);
  }, []);

  function handleMedicineSelect(index: number, medicineId: string) {
    const med = medicines.find((m) => m._id === medicineId);
    if (!med) return;
    setValue(`items.${index}.medicineId`, med._id);
    setValue(`items.${index}.medicineName`, med.name);
    setValue(`items.${index}.unitPrice`, med.sellingPrice);
    const qty = watchedItems?.[index]?.quantity ?? 1;
    setValue(`items.${index}.total`, qty * med.sellingPrice);
  }

  function handleQtyChange(index: number, qty: number) {
    const price = watchedItems?.[index]?.unitPrice ?? 0;
    setValue(`items.${index}.total`, qty * price);
  }

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
    const result = await createDispense({
      ...data,
      items: data.items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      })),
    });
    if (!result.success) {
      setServerError(result.error ?? "Failed");
      return;
    }
    handleClose();
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Dispense Medicines</SheetTitle>
          <SheetDescription>Dispense medicines to a patient.</SheetDescription>
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
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setSelectedPatient(null); setValue("patientId", ""); }}>
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search patient..."
                    value={patientSearch} onChange={(e) => handlePatientSearch(e.target.value)} />
                </div>
                {patientSearch.length >= 2 && (
                  <div className="border rounded-lg overflow-hidden">
                    {searching ? (
                      <div className="p-3 text-sm text-center text-muted-foreground">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-center text-muted-foreground">No patients found</div>
                    ) : (
                      searchResults.map((p) => (
                        <button key={p._id} type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm border-b last:border-0"
                          onClick={() => {
                            setSelectedPatient(p);
                            setValue("patientId", p._id);
                            setPatientSearch("");
                            setSearchResults([]);
                          }}>
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{p.phone}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.patientId && <p className="text-xs text-destructive">{errors.patientId.message}</p>}
          </div>

          <Separator />

          {/* Medicine items */}
          <div className="space-y-3">
            <Label>Medicines *</Label>
            <div className="grid gap-1.5 text-xs text-muted-foreground font-medium"
              style={{ gridTemplateColumns: "2fr 60px 80px 70px 28px" }}>
              <span>Medicine</span>
              <span>Qty</span>
              <span>Price ₹</span>
              <span>Total ₹</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-1.5 items-start"
                style={{ gridTemplateColumns: "2fr 60px 80px 70px 28px" }}>
                <select className={cn(selectClass, "h-9 text-xs px-2")}
                  value={watchedItems?.[index]?.medicineId ?? ""}
                  onChange={(e) => handleMedicineSelect(index, e.target.value)}>
                  <option value="">Select medicine</option>
                  {medicines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} {m.strength ?? ""} ({m.currentStock} {m.unit})
                    </option>
                  ))}
                </select>
                <Input type="number" min={1} className="h-9 text-sm px-2"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  onChange={(e) => {
                    register(`items.${index}.quantity`).onChange(e);
                    setTimeout(() => handleQtyChange(index, Number(e.target.value)), 50);
                  }} />
                <Input type="number" min={0} step="0.01" className="h-9 text-sm px-2 bg-muted" readOnly
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                <Input type="number" min={0} className="h-9 text-sm px-2 bg-muted" readOnly
                  {...register(`items.${index}.total`, { valueAsNumber: true })} />
                <button type="button"
                  onClick={() => fields.length > 1 && remove(index)}
                  className={cn(
                    "flex items-center justify-center w-7 h-9 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
                    fields.length === 1 && "opacity-30 cursor-not-allowed"
                  )}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" className="text-xs"
              onClick={() => append({ medicineId: "", medicineName: "", quantity: 1, unitPrice: 0, total: 0 })}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Medicine
            </Button>
          </div>

          <Separator />

          {/* Total + payment */}
          <div className="space-y-3">
            <div className="flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>₹{totalAmount.toLocaleString("en-IN")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount Paid ₹</Label>
                <Input type="number" min={0} step="0.01" placeholder="0"
                  {...register("paidAmount", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <select {...register("paymentMethod")} className={selectClass}>
                  <option value="">Select</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between text-sm bg-muted/40 rounded px-3 py-2">
              <span className="text-muted-foreground">Balance due</span>
              <span className={balance > 0 ? "text-amber-600 font-medium" : "text-teal-600 font-medium"}>
                ₹{balance.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional notes" {...register("notes")} />
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Dispensing..." : "Confirm Dispense"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}