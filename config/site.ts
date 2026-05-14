export const siteConfig = {
  name: "Medflow",
  description: "Healthcare Workflow Operating System",
  version: "1.0.0",
  roles: [
    "super_admin",
    "clinic_admin",
    "doctor",
    "receptionist",
    "pharmacist",
    "lab_tech",
  ] as const,
} as const;

export type UserRole = (typeof siteConfig.roles)[number];