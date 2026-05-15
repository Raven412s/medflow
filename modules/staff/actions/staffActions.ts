"use server";

import { connectDB } from "@/lib/db";
import User from "@/modules/auth/models/User";
import Role from "@/modules/rbac/models/Role";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";

const StaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Invalid phone number"),
  role: z.enum([
    "doctor",
    "receptionist",
    "pharmacist",
    "lab_tech",
    "clinic_admin",
  ]),
  specialization: z.string().optional(),
});

const UpdateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  specialization: z.string().optional(),
  role: z
    .enum(["doctor", "receptionist", "pharmacist", "lab_tech", "clinic_admin"])
    .optional(),
  isActive: z.boolean().optional(),
});

export type StaffInput = z.infer<typeof StaffSchema>;

// CREATE STAFF
export async function createStaff(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  // Only clinic_admin and super_admin can create staff
  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const parsed = StaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  // Check email unique within tenant
  const existing = await User.findOne({
    tenantId: session.user.tenantId,
    email: parsed.data.email.toLowerCase(),
  });
  if (existing) {
    return { success: false, error: "A staff member with this email already exists" };
  }

  try {
    // Find the role document for this tenant
    const roleDoc = await Role.findOne({
      tenantId: session.user.tenantId,
      name: parsed.data.role,
    });

    if (!roleDoc) {
      return { success: false, error: "Role not found for this clinic" };
    }

    const hashedPassword = await hash(parsed.data.password, 12);

    const staff = await User.create({
      tenantId: session.user.tenantId,
      roleId: roleDoc._id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      password: hashedPassword,
      role: parsed.data.role,
      specialization: parsed.data.specialization,
      phone: parsed.data.phone,
      permissions: ROLE_PERMISSIONS[parsed.data.role] ?? [],
      isActive: true,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "staff",
      resourceId: staff._id.toString(),
      description: `Added staff member ${staff.name} as ${staff.role}`,
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("[createStaff]", error);
    return { success: false, error: "Failed to create staff member" };
  }
}

// GET ALL STAFF
export async function getStaff() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const staff = await User.find({
      tenantId: session.user.tenantId,
    })
      .select("-password")
      .sort({ role: 1, name: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(staff)) };
  } catch (error) {
    console.error("[getStaff]", error);
    return { success: false, error: "Failed to fetch staff" };
  }
}

// UPDATE STAFF
export async function updateStaff(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const parsed = UpdateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const updateData: Record<string, unknown> = { ...parsed.data };

    // If role changed, update permissions too
    if (parsed.data.role) {
      updateData.permissions = ROLE_PERMISSIONS[parsed.data.role] ?? [];
      const roleDoc = await Role.findOne({
        tenantId: session.user.tenantId,
        name: parsed.data.role,
      });
      if (roleDoc) updateData.roleId = roleDoc._id;
    }

    const staff = await User.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      updateData,
      { new: true }
    );

    if (!staff) return { success: false, error: "Staff member not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "staff",
      resourceId: id,
      description: `Updated staff member ${staff.name}`,
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("[updateStaff]", error);
    return { success: false, error: "Failed to update staff member" };
  }
}

// TOGGLE ACTIVE STATUS
export async function toggleStaffStatus(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const staff = await User.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { isActive },
      { new: true }
    );

    if (!staff) return { success: false, error: "Staff member not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "staff",
      resourceId: id,
      description: `${isActive ? "Activated" : "Deactivated"} staff member ${staff.name}`,
    });

    revalidatePath("/staff");
    return { success: true };
  } catch (error) {
    console.error("[toggleStaffStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}