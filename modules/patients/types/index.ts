export interface PatientFormInput {
  name: string;
  phone: string;
  email?: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  allergies?: string;
  medicalHistory?: string;
}

export interface PatientRow {
  _id: string;
  patientId: string;
  name: string;
  phone: string;
  email?: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup?: string;
  isActive: boolean;
  createdAt: string;
}