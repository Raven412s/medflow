import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMedicine extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  genericName?: string;
  category: string;        // e.g. "Antibiotic", "Analgesic"
  manufacturer?: string;
  batchNumber?: string;
  barcode?: string;
  form: "tablet" | "capsule" | "syrup" | "injection" | "cream" | "drops" | "other";
  strength?: string;       // e.g. "500mg", "250ml"
  unit: string;            // e.g. "strip", "bottle", "vial"
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;    // alert when stock falls below this
  expiryDate?: Date;
  location?: string;       // shelf/rack reference
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    manufacturer: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
    barcode: { type: String, trim: true },
    form: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "other"],
      required: true,
    },
    strength: { type: String, trim: true },
    unit: { type: String, required: true, default: "strip" },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    currentStock: { type: Number, required: true, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10 },
    expiryDate: { type: Date },
    location: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MedicineSchema.index({ tenantId: 1, name: 1 });
MedicineSchema.index({ tenantId: 1, category: 1 });
MedicineSchema.index({ tenantId: 1, currentStock: 1 });

const Medicine: Model<IMedicine> =
  mongoose.models.Medicine ??
  mongoose.model<IMedicine>("Medicine", MedicineSchema);

export default Medicine;