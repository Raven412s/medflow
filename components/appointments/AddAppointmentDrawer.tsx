"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { createAppointment } from "@/modules/appointments/actions/appointmentActions";
import { getDoctors } from "@/modules/appointments/actions/appointmentActions";
import { getPatients } from "@/modules/patients/actions/patientActions";
import { TIME_SLOTS } from "@/modules/appointments/types";

const Schema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  type: z.enum(["consultation", "follow_up", "emergency", "procedure"]),
  notes: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

interface AddAppointmentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate: string;
}

export function AddAppointmentDrawer({
  open,
  onClose,
  onSuccess,
  defaultDate,
}: AddAppointmentDrawerProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<{ _id: string; name: string; specialization?: string }[]>([]);
  const [patients, setPatients] = useState<{ _id: string; name: string; patientId: string }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema),
    defaultValues: { date: defaultDate, type: "consultation" },
  });

  useEffect(() => {
    if (!open) return;
    async function load() {
      const [d, p] = await Promise.all([
        getDoctors(),
        getPatients({ limit: 100 }),
      ]);
      if (d.success) setDoctors(d.data ?? []);
      if (p.success) setPatients(p.data ?? []);
    }
    load();
  }, [open]);

  async function onSubmit(data: FormInput) {
    setServerError(null);
    const result = await createAppointment({ ...data, duration: 30 });

    if (!result.success) {
      setServerError(result.error ?? "Failed to book appointment");
      return;
    }

    reset();
    onSuccess();
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto py-2 px-3">
        <SheetHeader className="mb-6">
          <SheetTitle>Book Appointment</SheetTitle>
          <SheetDescription>
            Schedule a new patient appointment.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient *</Label>
            <select {...register("patientId")} className={selectClass}>
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.patientId})
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="text-xs text-destructive">{errors.patientId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Doctor *</Label>
            <select {...register("doctorId")} className={selectClass}>
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}{d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
            {errors.doctorId && (
              <p className="text-xs text-destructive">{errors.doctorId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Time Slot *</Label>
              <select {...register("timeSlot")} className={selectClass}>
                <option value="">Select time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.display}
                  </option>
                ))}
              </select>
              {errors.timeSlot && (
                <p className="text-xs text-destructive">{errors.timeSlot.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Appointment Type *</Label>
            <select {...register("type")} className={selectClass}>
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow Up</option>
              <option value="emergency">Emergency</option>
              <option value="procedure">Procedure</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              {...register("notes")}
              placeholder="Optional notes..."
              className="flex min-h-17.5 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {serverError && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {serverError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { reset(); onClose(); }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Booking..." : "Book Appointment"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}