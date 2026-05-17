"use client";

import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
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
import { createLabTest } from "@/modules/lab/actions/labActions";

const Schema = z.object({
  name: z.string().min(1, "Test name required"),
  code: z.string().min(1, "Code required"),
  category: z.string().min(1, "Category required"),
  unit: z.string().optional(),
  price: z.number().min(0),
  turnaroundHours: z.number().min(1),  // remove .default()
  normalRangeMale: z.string().optional(),
  normalRangeFemale: z.string().optional(),
  normalRangeGeneral: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

const CATEGORIES = [
  "Haematology",
  "Biochemistry",
  "Microbiology",
  "Serology",
  "Pathology",
  "Radiology",
  "Other",
];

export function AddLabTestDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

const {
  register,
  handleSubmit,
  reset,
  formState: { errors, isSubmitting },
} = useForm<FormInput>({
  resolver: zodResolver(Schema) as Resolver<FormInput>,
  defaultValues: { turnaroundHours: 24, price: 0 },
});

  function handleClose() {
    reset();
    setServerError(null);
    onClose();
  }

  async function onSubmit(data: FormInput) {
    setServerError(null);
    const result = await createLabTest({
      name: data.name,
      code: data.code.toUpperCase(),
      category: data.category,
      unit: data.unit,
      price: data.price,
      turnaroundHours: data.turnaroundHours,
      normalRange: {
        male: data.normalRangeMale,
        female: data.normalRangeFemale,
        general: data.normalRangeGeneral,
      },
    });

    if (!result.success) {
      setServerError(result.error ?? "Failed");
      return;
    }
    handleClose();
    onSuccess();
  }

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Add Lab Test</SheetTitle>
          <SheetDescription>
            Add a test to your clinic&apos;s catalogue.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Test Name *</Label>
              <Input placeholder="Complete Blood Count" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input placeholder="CBC" className="uppercase" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category *</Label>
            <select {...register("category")} className={selectClass}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input placeholder="mg/dL, g/dL, %" {...register("unit")} />
            </div>
            <div className="space-y-1.5">
              <Label>TAT (hours)</Label>
              <Input
                type="number"
                min={1}
                {...register("turnaroundHours", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Price ₹ *</Label>
            <Input
              type="number"
              min={0}
              placeholder="250"
              {...register("price", { valueAsNumber: true })}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">Normal Ranges</p>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">General</Label>
              <Input placeholder="e.g. 70-100" {...register("normalRangeGeneral")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Male</Label>
                <Input placeholder="13.5-17.5" {...register("normalRangeMale")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Female</Label>
                <Input placeholder="12.0-15.5" {...register("normalRangeFemale")} />
              </div>
            </div>
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Test"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}