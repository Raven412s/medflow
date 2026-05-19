"use server";

import { connectDB } from "@/lib/db";
import Tenant from "@/modules/tenants/models/Tenant";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ClinicProfileSchema = z.object({
  name: z.string().min(2, "Clinic name required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required"),
  address: z.object({
    line1: z.string().min(1, "Address required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City required"),
    state: z.string().min(1, "State required"),
    pincode: z.string().min(6, "Valid pincode required"),
    country: z.string().default("India"),
  }),
  settings: z.object({
    gstNumber: z.string().optional(),
    timezone: z.string().default("Asia/Kolkata"),
    currency: z.string().default("INR"),
    dateFormat: z.string().default("DD/MM/YYYY"),
  }),
});

export async function getTenantProfile() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const tenant = await Tenant.findById(session.user.tenantId).lean();
    if (!tenant) return { success: false, error: "Clinic not found" };
    return { success: true, data: JSON.parse(JSON.stringify(tenant)) };
  } catch (error) {
    console.error("[getTenantProfile]", error);
    return { success: false, error: "Failed to fetch profile" };
  }
}

export async function updateClinicProfile(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Only clinic admins can update settings" };
  }

  const parsed = ClinicProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    await Tenant.findByIdAndUpdate(session.user.tenantId, {
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      "settings.gstNumber": parsed.data.settings.gstNumber,
      "settings.timezone": parsed.data.settings.timezone,
      "settings.currency": parsed.data.settings.currency,
      "settings.dateFormat": parsed.data.settings.dateFormat,
    });

    revalidatePath("/settings");
    return { success: true, message: "Settings updated successfully" };
  } catch (error) {
    console.error("[updateClinicProfile]", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function uploadClinicLogo(
  base64: string,
  mimeType: string
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  await connectDB();

  try {
    const cleaned = base64.replace(
      /^data:(image)\/\w+;base64,/,
      ""
    );
    const buffer = Buffer.from(cleaned, "base64");
    const fileName = `logo-${session.user.tenantId}`;
    const url = await uploadFile(buffer, "logos", fileName, mimeType);

    await Tenant.findByIdAndUpdate(session.user.tenantId, { logo: url });

    revalidatePath("/settings");
    return { success: true, logoUrl: url };
  } catch (error) {
    console.error("[uploadClinicLogo]", error);
    return { success: false, error: "Failed to upload logo" };
  }
}