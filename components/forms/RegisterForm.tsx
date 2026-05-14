"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { registerTenant } from "@/modules/tenants/actions/registerTenant";

const RegisterSchema = z.object({
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters"),
  adminName: z.string().min(2, "Your name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    const result = await registerTenant(data);

    if (!result.success) {
      setServerError(result.error ?? "Registration failed.");
      return;
    }

    router.push("/login?registered=true");
  }

  const fields: {
    name: keyof RegisterInput;
    label: string;
    placeholder: string;
    type?: string;
  }[] = [
    { name: "clinicName", label: "Clinic name", placeholder: "City Care Clinic" },
    { name: "adminName", label: "Your name", placeholder: "Dr. Ravi Kumar" },
    { name: "email", label: "Email", placeholder: "you@clinic.com", type: "email" },
    { name: "password", label: "Password", placeholder: "Min. 8 characters", type: "password" },
    { name: "phone", label: "Phone", placeholder: "9876543210" },
    { name: "city", label: "City", placeholder: "Mumbai" },
    { name: "state", label: "State", placeholder: "Maharashtra" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            type={field.type ?? "text"}
            placeholder={field.placeholder}
            {...register(field.name)}
          />
          {errors[field.name] && (
            <p className="text-xs text-destructive">
              {errors[field.name]?.message}
            </p>
          )}
        </div>
      ))}

      {serverError && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Spinner className="w-4 h-4 mr-2" />}
        {isSubmitting ? "Creating your clinic..." : "Create clinic account"}
      </Button>
    </form>
  );
}