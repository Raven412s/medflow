import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILabParameter {
  code: string;        // e.g. "HB", "WBC", "PLT"
  name: string;        // e.g. "Haemoglobin", "WBC Count"
  unit?: string;       // e.g. "g/dL", "cells/mcL"
  normalRange?: {
    male?: string;     // e.g. "13.5-17.5"
    female?: string;   // e.g. "12.0-15.5"
    general?: string;  // when gender doesn't matter
  };
  sortOrder: number;   // display order in report
}

export interface ILabTest extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;          // e.g. "Complete Blood Count"
  code: string;          // e.g. "CBC"
  category: string;      // e.g. "Haematology"
  parameters: ILabParameter[];
  price: number;
  turnaroundHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabParameterSchema = new Schema<ILabParameter>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    normalRange: {
      male: { type: String },
      female: { type: String },
      general: { type: String },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const LabTestSchema = new Schema<ILabTest>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, required: true, trim: true },
    parameters: {
      type: [LabParameterSchema],
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
    turnaroundHours: { type: Number, default: 24 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LabTestSchema.index({ tenantId: 1, code: 1 }, { unique: true });
LabTestSchema.index({ tenantId: 1, category: 1 });

const LabTest: Model<ILabTest> =
  mongoose.models.LabTest
    ? (mongoose.deleteModel("LabTest"), mongoose.model<ILabTest>("LabTest", LabTestSchema))
    : mongoose.model<ILabTest>("LabTest", LabTestSchema);

export default LabTest;