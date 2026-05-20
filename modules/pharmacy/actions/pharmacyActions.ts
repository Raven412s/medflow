"use server";

import { connectDB } from "@/lib/db";
import Medicine from "@/modules/pharmacy/models/Medicine";
import Dispense from "@/modules/pharmacy/models/Dispense";
import { auth } from "@/auth";
import { createAuditLog } from "@/modules/audit-logs/actions/createAuditLog";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";

function generateDispenseNumber(tenantId: string): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  const suffix = tenantId.slice(-4).toUpperCase();
  return `DIS-${suffix}-${yy}${mm}${dd}-${rand}`;
}

// ── Medicine CRUD ──────────────────────────────────────────────────────────

const MedicineSchema = z.object({
  name: z.string().min(1, "Name required"),
  genericName: z.string().optional(),
  category: z.string().min(1, "Category required"),
  manufacturer: z.string().optional(),
  batchNumber: z.string().optional(),
  form: z.enum(["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"]),
  strength: z.string().optional(),
  unit: z.string().min(1, "Unit required"),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  currentStock: z.number().min(0),
  reorderLevel: z.number().min(0).default(10),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
});

export async function addMedicine(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };
  if (!["clinic_admin", "super_admin", "pharmacist"].includes(session.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const parsed = MedicineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const medicine = await Medicine.create({
      ...parsed.data,
      tenantId: session.user.tenantId,
      expiryDate: parsed.data.expiryDate
        ? new Date(parsed.data.expiryDate)
        : undefined,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "medicine",
      resourceId: medicine._id.toString(),
      description: `Added medicine ${medicine.name} — stock: ${medicine.currentStock}`,
    });

    revalidatePath("/pharmacy");
    return { success: true };
  } catch (error) {
    console.error("[addMedicine]", error);
    return { success: false, error: "Failed to add medicine" };
  }
}

export async function getMedicines(includeInactive = false) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };
    if (!includeInactive) query.isActive = true;

    const medicines = await Medicine.find(query)
      .sort({ category: 1, name: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(medicines)) };
  } catch (error) {
    console.error("[getMedicines]", error);
    return { success: false, error: "Failed to fetch medicines" };
  }
}

export async function updateMedicineStock(
  id: string,
  adjustment: number,
  type: "add" | "remove"
) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const medicine = await Medicine.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    });

    if (!medicine) return { success: false, error: "Medicine not found" };

    const newStock =
      type === "add"
        ? medicine.currentStock + adjustment
        : medicine.currentStock - adjustment;

    if (newStock < 0) {
      return { success: false, error: "Insufficient stock" };
    }

    medicine.currentStock = newStock;
    await medicine.save();

    revalidatePath("/pharmacy");
    return { success: true, newStock };
  } catch (error) {
    console.error("[updateMedicineStock]", error);
    return { success: false, error: "Failed to update stock" };
  }
}

export async function getLowStockMedicines() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const medicines = await Medicine.find({
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
      isActive: true,
      $expr: { $lte: ["$currentStock", "$reorderLevel"] },
    })
      .sort({ currentStock: 1 })
      .lean();

    return { success: true, data: JSON.parse(JSON.stringify(medicines)) };
  } catch (error) {
    console.error("[getLowStockMedicines]", error);
    return { success: false, error: "Failed to fetch" };
  }
}

// ── Dispense ───────────────────────────────────────────────────────────────

const DispenseSchema = z.object({
  patientId: z.string().min(1, "Patient required"),
  prescriptionId: z.string().optional(),
  items: z.array(
    z.object({
      medicineId: z.string().min(1),
      medicineName: z.string(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
      total: z.number().min(0),
    })
  ).min(1, "Add at least one item"),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
});

export async function createDispense(input: unknown) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const parsed = DispenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await connectDB();

  try {
    const totalAmount = parsed.data.items.reduce(
      (sum, item) => sum + item.total, 0
    );

    const paymentStatus =
      parsed.data.paidAmount >= totalAmount
        ? "paid"
        : parsed.data.paidAmount > 0
        ? "partial"
        : "pending";

    // Deduct stock for each medicine
    for (const item of parsed.data.items) {
      const medicine = await Medicine.findOne({
        _id: item.medicineId,
        tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
      });

      if (!medicine) {
        return { success: false, error: `Medicine not found: ${item.medicineName}` };
      }

      if (medicine.currentStock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentStock}`,
        };
      }

      medicine.currentStock -= item.quantity;
      await medicine.save();
    }

    const dispenseNumber = generateDispenseNumber(session.user.tenantId);

    const dispense = await Dispense.create({
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
      patientId: new mongoose.Types.ObjectId(parsed.data.patientId),
      prescriptionId:
        parsed.data.prescriptionId && parsed.data.prescriptionId !== ""
          ? new mongoose.Types.ObjectId(parsed.data.prescriptionId)
          : undefined,
      dispensedBy: new mongoose.Types.ObjectId(session.user.id),
      dispenseNumber,
      items: parsed.data.items.map((item) => ({
        ...item,
        medicineId: new mongoose.Types.ObjectId(item.medicineId),
      })),
      totalAmount,
      paidAmount: parsed.data.paidAmount,
      paymentStatus,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
    });

    await createAuditLog({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      userName: session.user.name ?? "Unknown",
      userRole: session.user.role,
      action: "create",
      resource: "dispense",
      resourceId: dispense._id.toString(),
      description: `Dispensed ${parsed.data.items.length} medicine(s) — ₹${totalAmount}`,
    });

    revalidatePath("/pharmacy");
    revalidatePath(`/patients/${parsed.data.patientId}`);
    return { success: true, dispenseNumber };
  } catch (error) {
    console.error("[createDispense]", error);
    return { success: false, error: "Failed to create dispense" };
  }
}

export async function getDispenses({
  page = 1,
  limit = 20,
  patientId,
}: {
  page?: number;
  limit?: number;
  patientId?: string;
}) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  try {
    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
    };
    if (patientId) {
      query.patientId = new mongoose.Types.ObjectId(patientId);
    }

    const [dispenses, total] = await Promise.all([
      Dispense.find(query)
        .populate("patientId", "name patientId phone")
        .populate("dispensedBy", "name")
        .populate("prescriptionId", "prescriptionNumber diagnosis")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Dispense.countDocuments(query),
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(dispenses)),
      total,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getDispenses]", error);
    return { success: false, error: "Failed to fetch dispenses" };
  }
}