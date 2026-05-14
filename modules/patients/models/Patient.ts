import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPatient extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  patientId: string; // human-readable ID e.g. PT-ABC123
  name: string;
  phone: string;
  email?: string;
  gender: "male" | "female" | "other";
  dateOfBirth: Date;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  allergies?: string[];
  medicalHistory?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    address: {
      line1: String,
      city: String,
      state: String,
      pincode: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    allergies: [String],
    medicalHistory: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound indexes
PatientSchema.index({ tenantId: 1, patientId: 1 }, { unique: true });
PatientSchema.index({ tenantId: 1, phone: 1 });
PatientSchema.index({ tenantId: 1, name: "text" }); // text search

const Patient: Model<IPatient> =
  mongoose.models.Patient ??
  mongoose.model<IPatient>("Patient", PatientSchema);

export default Patient;