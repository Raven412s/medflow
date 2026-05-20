import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDispenseItem {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;     // snapshot
  quantity: number;
  unitPrice: number;        // snapshot at time of dispense
  total: number;
}

export interface IDispense extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  dispensedBy: mongoose.Types.ObjectId;
  dispenseNumber: string;
  items: IDispenseItem[];
  totalAmount: number;
  paidAmount: number;
  paymentStatus: "pending" | "paid" | "partial";
  paymentMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DispenseItemSchema = new Schema<IDispenseItem>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DispenseSchema = new Schema<IDispense>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    prescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Prescription",
    },
    dispensedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dispenseNumber: { type: String, required: true },
    items: { type: [DispenseItemSchema], default: [] },
    totalAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partial"],
      default: "pending",
    },
    paymentMethod: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

DispenseSchema.index({ tenantId: 1, patientId: 1 });
DispenseSchema.index({ tenantId: 1, dispenseNumber: 1 }, { unique: true });
DispenseSchema.index({ tenantId: 1, createdAt: -1 });

const Dispense: Model<IDispense> =
  mongoose.models.Dispense ??
  mongoose.model<IDispense>("Dispense", DispenseSchema);

export default Dispense;