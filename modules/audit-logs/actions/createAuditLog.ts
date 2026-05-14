"use server";

import { connectDB } from "@/lib/db";
import AuditLog, { AuditAction } from "@/modules/audit-logs/models/AuditLog";
import mongoose from "mongoose";

interface AuditLogParams {
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      ...params,
      tenantId: new mongoose.Types.ObjectId(params.tenantId),
      userId: new mongoose.Types.ObjectId(params.userId),
    });
  } catch (error) {
    // Audit log failures should never crash the main operation
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}