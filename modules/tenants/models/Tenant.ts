import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  logo?: string;
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    gstNumber?: string;
  };
  subscription: {
    plan: "free" | "starter" | "growth" | "enterprise";
    status: "active" | "inactive" | "suspended" | "trial";
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, "Clinic name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },
    logo: {
      type: String,
    },
    settings: {
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      gstNumber: { type: String },
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "starter", "growth", "enterprise"],
        default: "trial",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended", "trial"],
        default: "trial",
      },
      trialEndsAt: { type: Date },
      currentPeriodEnd: { type: Date },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// TenantSchema.index({ slug: 1 });
// TenantSchema.index({ email: 1 });

const Tenant: Model<ITenant> =
  mongoose.models.Tenant ?? mongoose.model<ITenant>("Tenant", TenantSchema);

export default Tenant;