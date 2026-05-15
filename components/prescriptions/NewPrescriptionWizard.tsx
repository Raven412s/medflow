"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
    createPrescription,
    getPatientAppointments,
    getPrescriptionDoctors,
    quickRegisterPatient,
    searchPatients,
} from "@/modules/prescriptions/actions/prescriptionActions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Trash2,
    Upload,
    UserPlus,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
}

interface Appointment {
  _id: string;
  date: string;
  timeSlot: string;
  doctorId: { _id: string; name: string };
}

// ── Zod schemas ────────────────────────────────────────────────────────────
const QuickRegisterSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  dateOfBirth: z.string().min(1, "DOB required"),
  gender: z.enum(["male", "female", "other"]),
});

const MedicineRowSchema = z.object({
  name: z.string().min(1, "Required"),
  dose: z.string().min(1, "Required"),
  frequency: z.string().min(1, "Required"),
  duration: z.string().min(1, "Required"),
  instructions: z.string().optional(),
});

const PrescriptionFormSchema = z.object({
  doctorId: z.string().min(1, "Doctor required"),
  appointmentId: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnosis required"),
  medicines: z.array(MedicineRowSchema).min(1, "Add at least one medicine"),
  generalInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
});

type QuickRegisterInput = z.infer<typeof QuickRegisterSchema>;
type PrescriptionFormInput = z.infer<typeof PrescriptionFormSchema>;

const FREQ_SHORTCUTS = [
  { label: "1-0-1", title: "BD" },
  { label: "1-1-1", title: "TDS" },
  { label: "1-0-0", title: "OD Morning" },
  { label: "0-0-1", title: "OD Night" },
  { label: "0-1-0", title: "OD Afternoon" },
  { label: "1-1-1-1", title: "QID" },
  { label: "SOS", title: "As needed" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// ── Main Component ─────────────────────────────────────────────────────────
interface NewPrescriptionWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewPrescriptionWizard({
  open,
  onClose,
  onSuccess,
}: NewPrescriptionWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [searching, setSearching] = useState(false);

  // Step 2 state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Quick register form
  const qrForm = useForm<QuickRegisterInput>({
    resolver: zodResolver(QuickRegisterSchema),
  });

  // Prescription form
  const rxForm = useForm<PrescriptionFormInput>({
    resolver: zodResolver(PrescriptionFormSchema),
    defaultValues: {
      medicines: [{ name: "", dose: "", frequency: "", duration: "", instructions: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: rxForm.control,
    name: "medicines",
  });

  // Reset on close
  function handleClose() {
  setStep(1);
  setPatientSearch("");
  setSearchResults([]);
  setSelectedPatient(null);
  setShowQuickRegister(false);
  setImagePreview(null);
  setImageBase64(null);
  setServerError(null);
  qrForm.reset();
  rxForm.reset({
    medicines: [{ name: "", dose: "", frequency: "", duration: "", instructions: "" }],
  });
  onClose();
}

  // Load doctors + appointments when entering step 2
  useEffect(() => {
    if (step === 2 && selectedPatient) {
      getPrescriptionDoctors().then((r) => { if (r.success) setDoctors(r.data ?? []); });
      getPatientAppointments(selectedPatient._id).then((r) => {
        if (r.success) setAppointments(r.data ?? []);
      });
    }
  }, [step, selectedPatient]);

  // Patient search with debounce
  const handlePatientSearch = useCallback((value: string) => {
    setPatientSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const result = await searchPatients(value);
      if (result.success) setSearchResults(result.data ?? []);
      setSearching(false);
    }, 300);
  }, []);

  // Quick register submit
  async function handleQuickRegister(data: QuickRegisterInput) {
    const result = await quickRegisterPatient(data);
    if (!result.success) return;
    setSelectedPatient(result.data);
    setShowQuickRegister(false);
    setStep(2);
  }

  // Image upload handler
  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  }

  // Final submit
  async function handleSubmit(data: PrescriptionFormInput) {
    if (!selectedPatient) return;
    setSaving(true);
    setServerError(null);

    const result = await createPrescription({
      ...data,
      patientId: selectedPatient._id,
      scannedImageBase64: imageBase64 ?? undefined,
      scannedImageMimeType: imageMimeType ?? undefined,
    });

    setSaving(false);

    if (!result.success) {
      setServerError(result.error ?? "Failed to save");
      return;
    }

    onSuccess();
  }

  // Keyboard: Enter adds new medicine row
  function handleMedicineKeyDown(
    e: React.KeyboardEvent,
    index: number,
    field: string
  ) {
    if (e.key === "Enter" && field === "instructions" && index === fields.length - 1) {
      e.preventDefault();
      append({ name: "", dose: "", frequency: "", duration: "", instructions: "" });
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        className="w-full lg:min-w-screen sm:max-w-5xl overflow-y-auto p-0"
        side="right"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">New Prescription</SheetTitle>
            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border",
                    step === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : step > s
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    {step > s ? <Check className="w-3 h-3" /> : s}
                  </div>
                  <span className={cn(
                    "text-xs hidden sm:block",
                    step === s ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {s === 1 ? "Select Patient" : "Prescription Details"}
                  </span>
                  {s < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </SheetHeader>

        {/* ── STEP 1 — Patient Selection ── */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            {selectedPatient ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                <div>
                  <p className="font-medium text-sm">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.patientId} · {selectedPatient.phone}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change
                  </Button>
                  <Button size="sm" onClick={() => setStep(2)}>
                    Continue <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search Patient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name, phone, or patient ID..."
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Results */}
                  {patientSearch.length >= 2 && (
                    <div className="border rounded-lg overflow-hidden">
                      {searching ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No patients found for &quot;{patientSearch}&quot;
                        </div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p._id}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted text-left border-b last:border-0"
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch("");
                              setSearchResults([]);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.patientId} · {p.phone}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                {/* Quick Register toggle */}
                {!showQuickRegister ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowQuickRegister(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register New Patient
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Quick Patient Registration</p>
                      <button
                        onClick={() => setShowQuickRegister(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      onSubmit={qrForm.handleSubmit(handleQuickRegister)}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Full Name *</Label>
                          <Input
                            placeholder="Rahul Sharma"
                            {...qrForm.register("name")}
                          />
                          {qrForm.formState.errors.name && (
                            <p className="text-xs text-destructive">
                              {qrForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Phone *</Label>
                          <Input
                            placeholder="9876543210"
                            {...qrForm.register("phone")}
                          />
                          {qrForm.formState.errors.phone && (
                            <p className="text-xs text-destructive">
                              {qrForm.formState.errors.phone.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Date of Birth *</Label>
                          <Input type="date" {...qrForm.register("dateOfBirth")} />
                          {qrForm.formState.errors.dateOfBirth && (
                            <p className="text-xs text-destructive">
                              {qrForm.formState.errors.dateOfBirth.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Gender *</Label>
                          <select
                            {...qrForm.register("gender")}
                            className={selectClass}
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={qrForm.formState.isSubmitting}
                      >
                        {qrForm.formState.isSubmitting
                          ? "Registering..."
                          : "Register & Continue"}
                      </Button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── STEP 2 — Prescription Details ── */}
        {step === 2 && selectedPatient && (
          <div className="flex flex-col h-full">
            {/* Patient context bar */}
            <div className="px-6 py-3 bg-muted/40 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-medium">{selectedPatient.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {selectedPatient.patientId} · {selectedPatient.phone}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            </div>

            {/* Split layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT — Image upload */}
              <div className="w-80 shrink-0 border-r p-4 space-y-4 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Physical Prescription Scan
                </p>

                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="relative border rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Prescription scan"
                        className="w-full object-contain max-h-96"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setImageBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Scan uploaded ✓
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace image
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/30"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">Drop image here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      JPG, PNG, WEBP supported
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                />

                <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                  Upload the physical prescription for verification and record keeping.
                </p>
              </div>

              {/* RIGHT — Data entry form */}
              <div className="flex-1 p-5 overflow-y-auto space-y-5">
                <form
                  id="rx-form"
                  onSubmit={rxForm.handleSubmit(handleSubmit)}
                  className="space-y-5"
                >
                  {/* Doctor + Appointment row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Doctor *</Label>
                      <select
                        {...rxForm.register("doctorId")}
                        className={selectClass}
                      >
                        <option value="">Select doctor</option>
                        {doctors.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name}
                            {d.specialization ? ` — ${d.specialization}` : ""}
                          </option>
                        ))}
                      </select>
                      {rxForm.formState.errors.doctorId && (
                        <p className="text-xs text-destructive">
                          {rxForm.formState.errors.doctorId.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Link to Appointment</Label>
                      <select
                        {...rxForm.register("appointmentId")}
                        className={selectClass}
                      >
                        <option value="">No appointment</option>
                        {appointments.map((a) => (
                          <option key={a._id} value={a._id}>
                            {new Date(a.date).toLocaleDateString("en-IN")} {a.timeSlot}
                            {a.doctorId?.name ? ` — ${a.doctorId.name}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="space-y-1.5">
                    <Label>Diagnosis *</Label>
                    <Input
                      placeholder="e.g. Viral fever, Hypertension, Type 2 Diabetes"
                      {...rxForm.register("diagnosis")}
                    />
                    {rxForm.formState.errors.diagnosis && (
                      <p className="text-xs text-destructive">
                        {rxForm.formState.errors.diagnosis.message}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Medicines table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Medicines *</Label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">Quick freq:</span>
                        {FREQ_SHORTCUTS.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            title={s.title}
                            className="text-xs px-1.5 py-0.5 border rounded hover:bg-muted font-mono"
                            onClick={() => {
                              const lastIndex = fields.length - 1;
                              rxForm.setValue(
                                `medicines.${lastIndex}.frequency`,
                                s.label
                              );
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column headers */}
                    <div className="grid gap-1.5 text-xs text-muted-foreground font-medium"
                      style={{ gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1.5fr 28px" }}
                    >
                      <span>Medicine Name</span>
                      <span>Dose</span>
                      <span>Frequency</span>
                      <span>Duration</span>
                      <span>Instructions</span>
                      <span />
                    </div>

                    {/* Medicine rows */}
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-1.5 items-start"
                          style={{ gridTemplateColumns: "2fr 1fr 1.2fr 1fr 1.5fr 28px" }}
                        >
                          <div>
                            <Input
                              placeholder="PARACETAMOL"
                              className="uppercase placeholder:normal-case text-sm h-9"
                              {...rxForm.register(`medicines.${index}.name`)}
                            />
                            {rxForm.formState.errors.medicines?.[index]?.name && (
                              <p className="text-xs text-destructive mt-0.5">Required</p>
                            )}
                          </div>
                          <Input
                            placeholder="500mg"
                            className="text-sm h-9"
                            {...rxForm.register(`medicines.${index}.dose`)}
                          />
                          <Input
                            placeholder="1-0-1"
                            className="font-mono text-sm h-9"
                            {...rxForm.register(`medicines.${index}.frequency`)}
                          />
                          <Input
                            placeholder="5 days"
                            className="text-sm h-9"
                            {...rxForm.register(`medicines.${index}.duration`)}
                          />
                          <Input
                            placeholder="after food"
                            className="text-sm h-9"
                            {...rxForm.register(`medicines.${index}.instructions`)}
                            onKeyDown={(e) =>
                              handleMedicineKeyDown(e, index, "instructions")
                            }
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

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        append({
                          name: "",
                          dose: "",
                          frequency: "",
                          duration: "",
                          instructions: "",
                        })
                      }
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Medicine
                    </Button>
                  </div>

                  <Separator />

                  {/* Bottom fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>General Instructions</Label>
                      <textarea
                        placeholder="Drink plenty of water. Rest for 2 days..."
                        className="flex min-h-17.5 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        {...rxForm.register("generalInstructions")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Follow Up Date</Label>
                      <Input
                        type="date"
                        {...rxForm.register("followUpDate")}
                      />
                    </div>
                  </div>

                  {serverError && (
                    <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {serverError}
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-background flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {imagePreview ? "✓ Scan attached" : "No scan attached"}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="rx-form"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Prescription"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}