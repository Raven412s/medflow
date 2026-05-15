"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { createPatient } from "@/modules/patients/actions/patientActions";

const Schema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  "address.line1": z.string().optional(),
  "address.city": z.string().optional(),
  "address.state": z.string().optional(),
  "address.pincode": z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

interface AddPatientDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPatientDrawer({
  open,
  onClose,
  onSuccess,
}: AddPatientDrawerProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(Schema) });

  async function onSubmit(data: FormInput) {
    setServerError(null);

    const payload = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      bloodGroup: data.bloodGroup,
      address: {
        line1: data["address.line1"],
        city: data["address.city"],
        state: data["address.state"],
        pincode: data["address.pincode"],
      },
      allergies: data.allergies,
      medicalHistory: data.medicalHistory,
    };

    const result = await createPatient(payload);

    if (!result.success) {
      setServerError(result.error ?? "Failed to add patient");
      return;
    }

    reset();
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto  ">
        <SheetHeader className="mb-6">
          <SheetTitle>Add New Patient</SheetTitle>
          <SheetDescription>
            Fill in the patient details below. Fields marked * are required.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic info */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="Rahul Sharma" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input placeholder="9876543210" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input placeholder="optional" {...register("email")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <select
                  {...register("gender")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth *</Label>
                <Input type="date" {...register("dateOfBirth")} />
                {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Blood Group</Label>
              <select
                {...register("bloodGroup")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unknown</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Address</p>
            <div className="space-y-1.5">
              <Label>Street / Area</Label>
              <Input placeholder="123 MG Road" {...register("address.line1")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="Mumbai" {...register("address.city")} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input placeholder="Maharashtra" {...register("address.state")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input placeholder="400001" {...register("address.pincode")} />
            </div>
          </div>

          <Separator />

          {/* Medical */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Medical Info</p>
            <div className="space-y-1.5">
              <Label>Allergies</Label>
              <Input
                placeholder="Penicillin, Peanuts (comma separated)"
                {...register("allergies")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Medical History</Label>
              <textarea
                {...register("medicalHistory")}
                placeholder="Diabetes, Hypertension..."
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
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
              {isSubmitting ? "Saving..." : "Add Patient"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}