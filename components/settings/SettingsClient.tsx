"use client";

import { useState, useRef } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  updateClinicProfile,
  uploadClinicLogo,
} from "@/modules/tenants/actions/settingsActions";
import { Upload, X, Building2, MapPin, CreditCard, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const Schema = z.object({
  name: z.string().min(2, "Required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required"),
  address: z.object({
    line1: z.string().min(1, "Required"),
    line2: z.string().optional(),
    city: z.string().min(1, "Required"),
    state: z.string().min(1, "Required"),
    pincode: z.string().min(6, "Required"),
    country: z.string(),              // remove .default()
  }),
  settings: z.object({
    gstNumber: z.string().optional(),
    timezone: z.string(),             // remove .default()
    currency: z.string(),             // remove .default()
    dateFormat: z.string(),           // remove .default()
  }),
});

type FormInput = z.infer<typeof Schema>;

interface SettingsClientProps {
  initialData: {
    name: string;
    phone: string;
    email: string;
    logo?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    settings?: {
      gstNumber?: string;
      timezone?: string;
      currency?: string;
      dateFormat?: string;
    };
    subscription?: {
      plan: string;
      status: string;
      trialEndsAt?: string;
    };
  };
}

export function SettingsClient({ initialData }: SettingsClientProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialData?.logo ?? null
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormInput>({
    resolver: zodResolver(Schema) as Resolver<FormInput>,
    defaultValues: {
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      address: {
        line1: initialData?.address?.line1 ?? "",
        line2: initialData?.address?.line2 ?? "",
        city: initialData?.address?.city ?? "",
        state: initialData?.address?.state ?? "",
        pincode: initialData?.address?.pincode ?? "",
        country: initialData?.address?.country ?? "India",
      },
      settings: {
        gstNumber: initialData?.settings?.gstNumber ?? "",
        timezone: initialData?.settings?.timezone ?? "Asia/Kolkata",
        currency: initialData?.settings?.currency ?? "INR",
        dateFormat: initialData?.settings?.dateFormat ?? "DD/MM/YYYY",
      },
    },
  });

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setLogoPreview(base64);
      const result = await uploadClinicLogo(base64, file.type);
      if (!result.success) {
        setSaveError("Logo upload failed");
      }
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: FormInput) {
    setSaveSuccess(false);
    setSaveError(null);
    const result = await updateClinicProfile(data);
    if (!result.success) {
      setSaveError(result.error ?? "Failed to save");
      return;
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Subscription badge */}
      {initialData?.subscription && (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium capitalize">
              {initialData.subscription.plan} Plan
            </p>
            {initialData.subscription.trialEndsAt && (
              <p className="text-xs text-muted-foreground">
                Trial ends{" "}
                {new Date(
                  initialData.subscription.trialEndsAt
                ).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs capitalize",
              initialData.subscription.status === "trial"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-green-50 text-green-700 border-green-200"
            )}
          >
            {initialData.subscription.status}
          </Badge>
        </div>
      )}

      {/* Clinic profile */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Clinic Profile</h2>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Clinic Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {logoUploading ? "Uploading..." : "Upload Logo"}
              </Button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => setLogoPreview(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 2MB. Appears on invoices and prescriptions.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
            }}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Clinic Name *</Label>
            <Input placeholder="City Care Clinic" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <Input placeholder="9876543210" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="clinic@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Address</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Street / Area *</Label>
            <Input
              placeholder="123 MG Road, Near Civil Hospital"
              {...register("address.line1")}
            />
            {errors.address?.line1 && (
              <p className="text-xs text-destructive">
                {errors.address.line1.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Line 2</Label>
            <Input
              placeholder="Building name, floor (optional)"
              {...register("address.line2")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input placeholder="Mumbai" {...register("address.city")} />
            </div>
            <div className="space-y-1.5">
              <Label>State *</Label>
              <Input
                placeholder="Maharashtra"
                {...register("address.state")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pincode *</Label>
              <Input placeholder="400001" {...register("address.pincode")} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input {...register("address.country")} />
            </div>
          </div>
        </div>
      </Card>

      {/* Billing & GST */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Billing & Tax</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>GST Number</Label>
            <Input
              placeholder="22AAAAA0000A1Z5"
              className="uppercase"
              {...register("settings.gstNumber")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select
              {...register("settings.currency")}
              className={selectClass}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Preferences</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <select
              {...register("settings.timezone")}
              className={selectClass}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Date Format</Label>
            <select
              {...register("settings.dateFormat")}
              className={selectClass}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Save */}
      {saveError && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {saveError}
        </p>
      )}

      {saveSuccess && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">
          ✓ Settings saved successfully
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}