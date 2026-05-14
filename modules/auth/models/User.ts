import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole } from "@/config/site";
import { Permission } from "@/lib/constants";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions: Permission[]; // cached from role, for fast JWT inclusion
  avatar?: string;
  phone?: string;
  specialization?: string; // for doctors
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      required: true,
      enum: [
        "super_admin",
        "clinic_admin",
        "doctor",
        "receptionist",
        "pharmacist",
        "lab_tech",
      ],
    },
    permissions: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String, // only relevant for doctors
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index — email must be unique per tenant, not globally
// (same email can be a doctor in Clinic A and admin in Clinic B)
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;