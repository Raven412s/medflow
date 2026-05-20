"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { addMedicine } from "@/modules/pharmacy/actions/pharmacyActions";

const Schema = z.object({
  name: z.string().min(1, "Required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Required"),
  manufacturer: z.string().optional(),
  batchNumber: z.string().optional(),
  form: z.enum(["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"]),
  strength: z.string().optional(),
  unit: z.string().min(1, "Required"),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  currentStock: z.number().min(0),
  reorderLevel: z.number().min(0),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

const MEDICINE_CATEGORIES = [
  "Analgesic", "Antibiotic", "Antifungal", "Antihistamine",
  "Antihypertensive", "Antidiabetic", "Antacid", "Antiemetic",
  "Vitamin/Supplement", "Steroid", "Cardiac", "Respiratory",
  "Dermatological", "Eye/Ear Drops", "Other",
];

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AddMedicineDrawer({
  open, onClose, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema) as Resolver<FormInput>,
    defaultValues: {
      reorderLevel: 10,
      currentStock: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      unit: "strip",
      form: "tablet",
    },
  });

  function handleClose() {
    reset();
    setServerError(null);
    onClose();
  }

  async function onSubmit(data: FormInput) {
    setServerError(null);
    const result = await addMedicine(data);
    if (!result.success) {
      setServerError(result.error ?? "Failed");
      return;
    }
    handleClose();
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto lg:min-w-1/2">
        <SheetHeader className="mb-5">
          <SheetTitle>Add Medicine</SheetTitle>
          <SheetDescription>Add a medicine to your pharmacy inventory.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Medicine Name *</Label>
              <Input placeholder="PARACETAMOL" className="uppercase" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Generic Name</Label>
              <Input placeholder="Acetaminophen" {...register("genericName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <select {...register("category")} className={selectClass}>
                <option value="">Select</option>
                {MEDICINE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Form *</Label>
              <select {...register("form")} className={selectClass}>
                {["tablet","capsule","syrup","injection","cream","drops","other"].map((f) => (
                  <option key={f} value={f} className="capitalize">{f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Strength</Label>
              <Input placeholder="500mg" {...register("strength")} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit *</Label>
              <Input placeholder="strip" {...register("unit")} />
              {errors.unit && <p className="text-xs text-destructive">{errors.unit.message}</p>}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Price ₹ *</Label>
              <Input type="number" min={0} step="0.01" {...register("purchasePrice", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price ₹ *</Label>
              <Input type="number" min={0} step="0.01" {...register("sellingPrice", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Current Stock *</Label>
              <Input type="number" min={0} {...register("currentStock", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Level</Label>
              <Input type="number" min={0} {...register("reorderLevel", { valueAsNumber: true })} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input type="date" {...register("expiryDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer</Label>
              <Input placeholder="Sun Pharma" {...register("manufacturer")} />
            </div>
            <div className="space-y-1.5">
              <Label>Batch Number</Label>
              <Input placeholder="BT2024001" {...register("batchNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="Rack A-3" {...register("location")} />
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Medicine"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}