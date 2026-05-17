"use server";

import { connectDB } from "@/lib/db";
import LabTest from "@/modules/lab/models/LabTest";
import LabOrder from "@/modules/lab/models/LabOrder";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { uploadFile } from "@/lib/cloudinary";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";

// ── Lab Test Catalogue ─────────────────────────────────────────────────────

const LabTestSchema = z.object({
  name: z.string().min(1, "Test name required"),
  code: z.string().min(1, "Code required"),
  category: z.string().min(1, "Category required"),
  parameters: z
    .array(
      z.object({
        code: z.string().min(1, "Parameter code required"),
        name: z.string().min(1, "Parameter name required"),
        unit: z.string().optional(),
        normalRange: z
          .object({
            male: z.string().optional(),
            female: z.string().optional(),
            general: z.string().optional(),
          })
          .optional(),
        sortOrder: z.number().default(0),
      })
    )
    .min(1, "Add at least one parameter"),
  price: z.number().min(0),
  turnaroundHours: z.number().default(24),
});

export async function createLabTest(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const parsed = LabTestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const test = await LabTest.create({
      ...parsed.data,
      tenantId: session.user.tenantId,
    });

    revalidatePath("/lab");
    return { success: true, testId: test._id.toString() };
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return { success: false, error: "A test with this code already exists" };
    }
    return { success: false, error: "Failed to create test" };
  }
}

export async function getLabTests() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const tests = await LabTest.find({
      tenantId: session.user.tenantId,
      isActive: true,
    })
      .sort({ category: 1, name: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(tests)) };
  } catch (error) {
    console.error("[getLabTests]", error);
    return { success: false, error: "Failed to fetch tests" };
  }
}

export async function toggleLabTestStatus(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    await LabTest.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      { isActive }
    );
    revalidatePath("/lab");
    return { success: true };
  } catch (error) {
    console.error("[toggleLabTestStatus]", error);
    return { success: false, error: "Failed to update" };
  }
}

// ── Lab Orders ─────────────────────────────────────────────────────────────

function generateOrderNumber(tenantId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const suffix = tenantId.slice(-4).toUpperCase();
  return `LAB-${suffix}-${yy}${mm}${dd}-${rand}`;
}

const CreateOrderSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  testIds: z.array(z.string()).min(1, "Select at least one test"),
  appointmentId: z.string().optional(),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
});

export async function createLabOrder(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const orderNumber = generateOrderNumber(session.user.tenantId);

    const order = await LabOrder.create({
      tenantId: session.user.tenantId,
      patientId: new mongoose.Types.ObjectId(parsed.data.patientId),
      orderedBy: new mongoose.Types.ObjectId(session.user.id),
      appointmentId:
        parsed.data.appointmentId && parsed.data.appointmentId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.appointmentId)
          : undefined,
      prescriptionId:
        parsed.data.prescriptionId && parsed.data.prescriptionId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.prescriptionId)
          : undefined,
      tests: parsed.data.testIds.map((id) => new mongoose.Types.ObjectId(id)),
      orderNumber,
      notes: parsed.data.notes,
      status: "ordered",
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "lab_order",
      resourceId: order._id.toString(),
      description: `Created lab order ${orderNumber} with ${parsed.data.testIds.length} test(s)`,
    });

    revalidatePath("/lab");
    return { success: true, orderId: order._id.toString(), orderNumber };
  } catch (error) {
    console.error("[createLabOrder]", error);
    return { success: false, error: "Failed to create lab order" };
  }
}

export async function getLabOrders({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      LabOrder.find(query)
        .populate("patientId", "name patientId phone")
        .populate("orderedBy", "name")
        .populate("tests", "name code price")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LabOrder.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(orders)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getLabOrders]", error);
    return { success: false, error: "Failed to fetch orders" };
  }
}

export async function getLabOrderById(id: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const order = await LabOrder.findOne({
      _id: id,
      tenantId: session.user.tenantId,
    })
      .populate("patientId", "name patientId phone gender dateOfBirth")
      .populate("orderedBy", "name specialization")
      .populate("labTechId", "name")
      .populate("tests") // populate ALL fields — parameters included
      .lean();

    if (!order) return { success: false, error: "Order not found" };

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (error) {
    console.error("[getLabOrderById]", error);
    return { success: false, error: "Failed to fetch order" };
  }
}

// UPDATE STATUS
export async function updateLabOrderStatus(id: string, status: LabOrderStatus) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const update: Record<string, unknown> = { status };

    if (status === "sample_collected") update.sampleCollectedAt = new Date();
    if (status === "processing") update.processingStartedAt = new Date();
    if (status === "completed") update.completedAt = new Date();

    const order = await LabOrder.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      update,
      { new: true }
    );

    if (!order) return { success: false, error: "Order not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "lab_order",
      resourceId: id,
      description: `Lab order status updated to ${status}`,
    });

    revalidatePath("/lab");
    revalidatePath(`/lab/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[updateLabOrderStatus]", error);
    return { success: false, error: "Failed to update status" };
  }
}

// ENTER RESULTS — parameter-wise with snapshots
const ResultEntrySchema = z.object({
  results: z.array(
    z.object({
      testId: z.string(),
      testName: z.string(),
      testCode: z.string(),
      parameterResults: z.array(
        z.object({
          parameterCode: z.string(),
          parameterName: z.string(),
          value: z.string().min(1, "Value required"),
          unit: z.string().default(""),
          normalRange: z.string().default(""),
          isAbnormal: z.boolean().default(false),
          notes: z.string().optional(),
        })
      ),
    })
  ),
  reportBase64: z.string().optional(),
  reportMimeType: z.string().optional(),
});

export async function enterLabResults(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = ResultEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    let reportUrl: string | undefined;
    let reportPublicId: string | undefined;

    if (parsed.data.reportBase64 && parsed.data.reportMimeType) {
      const base64Data = parsed.data.reportBase64.replace(
        /^data:(image|application)\/\w+;base64,/,
        ""
      );
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `lab-${id}-${Date.now()}`;
      reportUrl = await uploadFile(
        buffer,
        "lab-reports",
        fileName,
        parsed.data.reportMimeType // mimeType pass karo
      );
      reportPublicId = `medflow/lab-reports/${fileName}`;
    }

    const update: Record<string, unknown> = {
      results: parsed.data.results,
      status: "completed",
      completedAt: new Date(),
    };

    if (reportUrl) {
      update.reportUrl = reportUrl;
      update.reportPublicId = reportPublicId;
    }

    const order = await LabOrder.findOneAndUpdate(
      { _id: id, tenantId: session.user.tenantId },
      update,
      { new: true }
    );

    if (!order) return { success: false, error: "Order not found" };

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "update",
      resource: "lab_order",
      resourceId: id,
      description: `Lab results entered for order ${order.orderNumber}`,
    });

    revalidatePath("/lab");
    revalidatePath(`/lab/${id}`);
    return { success: true };
  } catch (error) {
    console.error("[enterLabResults]", error);
    return { success: false, error: "Failed to save results" };
  }
}

type LabOrderStatus =
  | "ordered"
  | "sample_collected"
  | "processing"
  | "completed"
  | "cancelled";
