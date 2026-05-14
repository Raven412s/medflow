"use server";

import { connectDB } from "@/lib/db";
import Tenant from "@/modules/tenants/models/Tenant";
import Role from "@/modules/rbac/models/Role";
import User from "@/modules/auth/models/User";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { hash } from "bcryptjs";
import { siteConfig } from "@/config/site";
import mongoose from "mongoose";
import { z } from "zod";

const RegisterSchema = z.object({
  clinicName: z.string().min(2, "Clinic name must be at least 2 characters"),
  adminName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Invalid phone number"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
});

export type RegisterTenantInput = z.infer<typeof RegisterSchema>;

export async function registerTenant(input: RegisterTenantInput) {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { clinicName, adminName, email, password, phone, city, state } =
    parsed.data;

  await connectDB();

  // Check if email already exists across all tenants
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return { success: false, error: "An account with this email already exists" };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create tenant
    const slug = slugify(clinicName);
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const [tenant] = await Tenant.create(
      [
        {
          name: clinicName,
          slug: uniqueSlug,
          email: email.toLowerCase(),
          phone,
          address: { line1: "-", city, state, pincode: "000000" },
          subscription: {
            plan: "free",
            status: "trial",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          },
        },
      ],
      { session }
    );

    // 2. Seed all default roles for this tenant
    const roleDisplayNames: Record<string, string> = {
      super_admin: "Super Admin",
      clinic_admin: "Clinic Admin",
      doctor: "Doctor",
      receptionist: "Receptionist",
      pharmacist: "Pharmacist",
      lab_tech: "Lab Technician",
    };

    const roleDocs = await Role.insertMany(
      siteConfig.roles.map((roleName) => ({
        tenantId: tenant._id,
        name: roleName,
        displayName: roleDisplayNames[roleName],
        permissions: ROLE_PERMISSIONS[roleName] ?? [],
        isSystem: true,
      })),
      { session }
    );

    // 3. Find the clinic_admin role
    const adminRole = roleDocs.find((r) => r.name === "clinic_admin");
    if (!adminRole) throw new Error("Failed to seed roles");

    // 4. Create the first admin user
    const hashedPassword = await hash(password, 12);

    await User.create(
      [
        {
          tenantId: tenant._id,
          roleId: adminRole._id,
          name: adminName,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "clinic_admin",
          permissions: ROLE_PERMISSIONS["clinic_admin"],
          isActive: true,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return { success: true, message: "Clinic registered successfully" };
  } catch (error) {
    await session.abortTransaction();
    console.error("[registerTenant] error:", error);
    return { success: false, error: "Registration failed. Please try again." };
  } finally {
    session.endSession();
  }
}