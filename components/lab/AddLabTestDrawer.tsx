"use client";

import { useState } from "react";
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
import { createLabTest } from "@/modules/lab/actions/labActions";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ParameterSchema = z.object({
  code: z.string().min(1, "Code required"),
  name: z.string().min(1, "Name required"),
  unit: z.string().optional(),
  normalRangeGeneral: z.string().optional(),
  normalRangeMale: z.string().optional(),
  normalRangeFemale: z.string().optional(),
  sortOrder: z.number().default(0),
});

const Schema = z.object({
  name: z.string().min(1, "Test name required"),
  code: z.string().min(1, "Code required"),
  category: z.string().min(1, "Category required"),
  price: z.number().min(0),
  turnaroundHours: z.number().min(1),
  parameters: z.array(ParameterSchema).min(1, "Add at least one parameter"),
});

type FormInput = z.infer<typeof Schema>;

const CATEGORIES = [
  "Haematology",
  "Biochemistry",
  "Microbiology",
  "Serology",
  "Pathology",
  "Other",
];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema) as Resolver<FormInput>,
    defaultValues: {
      turnaroundHours: 24,
      price: 0,
      parameters: [
        {
          code: "",
          name: "",
          unit: "",
          normalRangeGeneral: "",
          normalRangeMale: "",
          normalRangeFemale: "",
          sortOrder: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "parameters",
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
      price: data.price,
      turnaroundHours: data.turnaroundHours,
      parameters: data.parameters.map((p, i) => ({
        code: p.code.toUpperCase(),
        name: p.name,
        unit: p.unit,
        normalRange: {
          general: p.normalRangeGeneral,
          male: p.normalRangeMale,
          female: p.normalRangeFemale,
        },
        sortOrder: i,
      })),
    });

    if (!result.success) {
      setServerError(result.error ?? "Failed to create test");
      return;
    }

    handleClose();
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Add Lab Test</SheetTitle>
          <SheetDescription>
            Add a test with its parameters to your clinic&apos;s catalogue.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Test info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Test Name *</Label>
              <Input
                placeholder="Complete Blood Count"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                placeholder="CBC"
                className="uppercase"
                {...register("code")}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
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
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ₹ *</Label>
              <Input
                type="number"
                min={0}
                placeholder="300"
                {...register("price", { valueAsNumber: true })}
              />
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

          <Separator />

          {/* Parameters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Parameters *</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  CBC has 15+ parameters. Simple tests like RBS have 1.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() =>
                  append({
                    code: "",
                    name: "",
                    unit: "",
                    normalRangeGeneral: "",
                    normalRangeMale: "",
                    normalRangeFemale: "",
                    sortOrder: fields.length,
                  })
                }
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Parameter
              </Button>
            </div>

            {/* Column headers */}
            <div
              className="grid gap-2 text-xs font-medium text-muted-foreground"
              style={{ gridTemplateColumns: "80px 1fr 70px 100px 90px 90px 28px" }}
            >
              <span>Code</span>
              <span>Parameter Name</span>
              <span>Unit</span>
              <span>General Range</span>
              <span>Male Range</span>
              <span>Female Range</span>
              <span />
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-2 items-start"
                  style={{
                    gridTemplateColumns: "80px 1fr 70px 100px 90px 90px 28px",
                  }}
                >
                  <Input
                    placeholder="HB"
                    className="uppercase text-xs h-9 px-2"
                    {...register(`parameters.${index}.code`)}
                  />
                  <Input
                    placeholder="Haemoglobin"
                    className="text-xs h-9 px-2"
                    {...register(`parameters.${index}.name`)}
                  />
                  <Input
                    placeholder="g/dL"
                    className="text-xs h-9 px-2"
                    {...register(`parameters.${index}.unit`)}
                  />
                  <Input
                    placeholder="—"
                    className="text-xs h-9 px-2"
                    {...register(`parameters.${index}.normalRangeGeneral`)}
                  />
                  <Input
                    placeholder="13.5-17.5"
                    className="text-xs h-9 px-2"
                    {...register(`parameters.${index}.normalRangeMale`)}
                  />
                  <Input
                    placeholder="12.0-15.5"
                    className="text-xs h-9 px-2"
                    {...register(`parameters.${index}.normalRangeFemale`)}
                  />
                  <button
                    type="button"
                    onClick={() => fields.length > 1 && remove(index)}
                    className={cn(
                      "flex items-center justify-center w-7 h-9 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors",
                      fields.length === 1 && "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {errors.parameters && (
              <p className="text-xs text-destructive">
                {errors.parameters.message ?? "Check parameter fields"}
              </p>
            )}
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
              {isSubmitting ? "Adding..." : "Add Test"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}