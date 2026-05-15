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
import { updateStaff } from "@/modules/staff/actions/staffActions";

const Schema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Valid phone required"),
  role: z.enum(["doctor", "receptionist", "pharmacist", "lab_tech", "clinic_admin"]),
  specialization: z.string().optional(),
});

type FormInput = z.infer<typeof Schema>;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  specialization?: string;
  isActive: boolean;
}

interface EditStaffDrawerProps {
  open: boolean;
  staff: StaffMember;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStaffDrawer({
  open,
  staff,
  onClose,
  onSuccess,
}: EditStaffDrawerProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: staff.name,
      phone: staff.phone ?? "",
      role: staff.role as FormInput["role"],
      specialization: staff.specialization ?? "",
    },
  });

  async function onSubmit(data: FormInput) {
    setServerError(null);
    const result = await updateStaff(staff._id, data);
    if (!result.success) {
      setServerError(result.error ?? "Failed to update");
      return;
    }
    onSuccess();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit Staff Member</SheetTitle>
          <SheetDescription>{staff.email}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role *</Label>
            <select {...register("role")} className={selectClass}>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="lab_tech">Lab Technician</option>
              <option value="clinic_admin">Clinic Admin</option>
            </select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Specialization</Label>
            <Input
              placeholder="General Physician..."
              {...register("specialization")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
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
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}