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
import { createStaff } from "@/modules/staff/actions/staffActions";

const Schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Min 8 characters"),
  phone: z.string().min(10, "Valid phone required"),
  role: z.enum(["doctor", "receptionist", "pharmacist", "lab_tech", "clinic_admin"]),
  specialization: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface AddStaffDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStaffDrawer({ open, onClose, onSuccess }: AddStaffDrawerProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(Schema) });

  async function onSubmit(data: FormInput) {
    setServerError(null);
    const result = await createStaff(data);
    if (!result.success) {
      setServerError(result.error ?? "Failed to add staff");
      return;
    }
    reset();
    setSelectedRole("");
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Add Staff Member</SheetTitle>
          <SheetDescription>
            Create a new staff account for your clinic.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input placeholder="Dr. Priya Sharma" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role *</Label>
            <select
              {...register("role")}
              className={selectClass}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Select role</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_tech">Lab Technician</option>
              <option value="clinic_admin">Clinic Admin</option>
            </select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          {selectedRole === "doctor" && (
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Input
                placeholder="General Physician, Cardiologist..."
                {...register("specialization")}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" placeholder="staff@clinic.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input placeholder="9876543210" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" placeholder="Min 8 chars" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
              onClick={() => { reset(); setSelectedRole(""); onClose(); }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}