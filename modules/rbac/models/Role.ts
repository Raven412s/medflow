
import mongoose, { Schema, Document, Model } from "mongoose";
import { Permission } from "@/lib/constants";
import { UserRole } from "@/config/site";

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: UserRole;
  displayName: string;
  permissions: Permission[];
  isSystem: boolean; // system roles can't be deleted
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
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
    displayName: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// A tenant can only have one role of each name
RoleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Role: Model<IRole> =
  mongoose.models.Role ?? mongoose.model<IRole>("Role", RoleSchema);

export default Role;