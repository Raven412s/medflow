"use client";

import { useState, useCallback, useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { createRadiologyOrder } from "@/modules/radiology/actions/radiologyActions";
import { searchPatients } from "@/modules/prescriptions/actions/prescriptionActions";
import { Search } from "lucide-react";

const Schema = z.object({
  patientId: z.string().min(1, "Patient required"),
  imagingType: z.enum([
    "x_ray", "mri", "ct_scan", "ultrasound",
    "echo", "mammography", "dexa", "other",
  ]),
  bodyPart: z.string().min(1, "Body part required"),
  clinicalHistory: z.string().optional(),
  contrast: z.boolean(),
  notes: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const IMAGING_TYPES = [
  { value: "x_ray", label: "X-Ray" },
  { value: "mri", label: "MRI" },
  { value: "ct_scan", label: "CT Scan" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "echo", label: "Echo" },
  { value: "mammography", label: "Mammography" },
  { value: "dexa", label: "DEXA Scan" },
  { value: "other", label: "Other" },
];

const BODY_PARTS = [
  "Chest", "Abdomen", "Pelvis", "Head", "Brain", "Neck",
  "Spine (Cervical)", "Spine (Lumbar)", "Spine (Thoracic)",
  "Left Shoulder", "Right Shoulder", "Left Knee", "Right Knee",
  "Left Hip", "Right Hip", "Left Ankle", "Right Ankle",
  "Left Wrist", "Right Wrist", "Both Hands", "Whole Body", "Other",
];

export function NewRadiologyOrderDrawer({
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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema) as Resolver<FormInput>,
    defaultValues: { contrast: false, imagingType: "x_ray" },
  });

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
    const result = await createRadiologyOrder(data);
    if (!result.success) {
      setServerError(result.error ?? "Failed");
      return;
    }
    handleClose();
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>New Radiology Order</SheetTitle>
          <SheetDescription>
            Order an imaging study for a patient.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Patient */}
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
                    placeholder="Search patient..."
                    value={patientSearch}
                    onChange={(e) => handlePatientSearch(e.target.value)}
                  />
                </div>
                {patientSearch.length >= 2 && (
                  <div className="border rounded-lg overflow-hidden">
                    {searching ? (
                      <div className="p-3 text-sm text-center text-muted-foreground">
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-center text-muted-foreground">
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

          {/* Imaging type */}
          <div className="space-y-1.5">
            <Label>Imaging Type *</Label>
            <select {...register("imagingType")} className={selectClass}>
              {IMAGING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Body part */}
          <div className="space-y-1.5">
            <Label>Body Part *</Label>
            <select {...register("bodyPart")} className={selectClass}>
              <option value="">Select body part</option>
              {BODY_PARTS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {errors.bodyPart && (
              <p className="text-xs text-destructive">
                {errors.bodyPart.message}
              </p>
            )}
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="contrast"
              className="w-4 h-4"
              {...register("contrast")}
            />
            <Label htmlFor="contrast" className="cursor-pointer">
              With Contrast
            </Label>
          </div>

          {/* Clinical history */}
          <div className="space-y-1.5">
            <Label>Clinical History</Label>
            <textarea
              placeholder="Relevant clinical information for radiologist..."
              className="flex min-h-17.5 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              {...register("clinicalHistory")}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input
              placeholder="Urgent, fasting required, etc."
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
              {isSubmitting ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}