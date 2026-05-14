"use server";

import { connectDB } from "@/lib/db";
import Patient from "@/modules/patients/models/Patient";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { generatePatientId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  address: z
    .object({
      line1: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      relation: z.string().optional(),
    })
    .optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

// CREATE
export async function createPatient(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = PatientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const { allergies, ...rest } = parsed.data;

    const patient = await Patient.create({
      ...rest,
      tenantId: session.user.tenantId,
      patientId: generatePatientId(),
      dateOfBirth: new Date(parsed.data.dateOfBirth),
      allergies: allergies
        ? allergies.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "patient",
      resourceId: patient._id.toString(),
      description: `Registered new patient ${patient.name} (${patient.patientId})`,
    });

    revalidatePath("/patients");
    return { success: true, patientId: patient._id.toString() };
  } catch (error) {
    console.error("[createPatient]", error);
    return { success: false, error: "Failed to create patient" };
  }
}

// GET ALL (paginated + search)
export async function getPatients({
  page = 1,
  limit = 20,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: session.user.tenantId,
      isActive: true,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
      ];
    }

    const [patients, total] = await Promise.all([
      Patient.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Patient.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(patients)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getPatients]", error);
    return { success: false, error: "Failed to fetch patients" };
  }
}

// GET ONE
export async function getPatientById(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const patient = await Patient.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    }).lean();

    if (!patient) return { success: false, error: "Patient not found" };

    return { success: true, data: JSON.parse(JSON.stringify(patient)) };
  } catch (error) {
    console.error("[getPatientById]", error);
    return { success: false, error: "Failed to fetch patient" };
  }
}

// UPDATE
export async function updatePatient(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = PatientSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const patient = await Patient.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { ...parsed.data },
      { new: true }
    );

    if (!patient) return { success: false, error: "Patient not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "patient",
      resourceId: id,
      description: `Updated patient ${patient.name} (${patient.patientId})`,
    });

    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[updatePatient]", error);
    return { success: false, error: "Failed to update patient" };
  }
}