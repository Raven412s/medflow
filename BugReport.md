# MedFlow Bug Report

**Generated:** May 19, 2026  
**Scope:** All modules except Pharmacy and Analytics  
**Priority Order:** Critical → High → Medium → Low

---

## CRITICAL SEVERITY BUGS

### 🔴 Bug #1: TenantId Type Mismatch in Database Queries
**File(s):** Multiple action files
- `modules/radiology/actions/radiologyActions.ts` (lines 54, 71, 143, 175, 280)
- `modules/lab/actions/labActions.ts` (lines 145, 175)
- `modules/billing/actions/billingActions.ts` (All invoice queries)
- `modules/prescriptions/actions/prescriptionActions.ts` (lines 177, 236)

**Issue:** `session.user.tenantId` is a `string` (set in `auth.ts` line 85), but MongoDB models store `tenantId` as an `ObjectId`. Queries without ObjectId conversion silently fail or return no results.

**Impact:** Queries fail silently, data not retrieved/updated properly, multi-tenant isolation compromised.

**Example:**
```typescript
// WRONG - tenantId is string, database expects ObjectId
const order = await RadiologyOrder.findOne({
  _id: id,
  tenantId: session.user.tenantId,  // string !== ObjectId
});

// CORRECT - convert to ObjectId
const order = await RadiologyOrder.findOne({
  _id: id,
  tenantId: new mongoose.Types.ObjectId(session.user.tenantId),
});
```

**Affected Functions:**
- `radiologyActions`: createRadiologyOrder, getRadiologyOrderById, updateRadiologyStatus, saveRadiologyReport
- `labActions`: getLabOrderById, updateLabOrderStatus
- `prescriptionActions`: getPrescriptionById
- `billingActions`: All invoice queries

---

### 🔴 Bug #2: Non-Atomic Token Generation Creates Race Conditions
**File:** `modules/appointments/actions/appointmentActions.ts` (lines 37-50)

**Issue:** Using `countDocuments()` followed by `create()` is not atomic. Two concurrent requests can get the same token number.

```typescript
const tokenCount = await Appointment.countDocuments({...}); // Line A
const appointment = await Appointment.create({
  ...parsed.data,
  token: tokenCount + 1,  // Race condition: another request incremented between A and here
});
```

**Impact:** Duplicate token numbers, appointment scheduling conflicts, patient confusion.

**Solution:** Use atomic `findOneAndUpdate()` with increments or database transactions.

---

### 🔴 Bug #3: Missing Tenant Existence Check on Register
**File:** `modules/tenants/actions/registerTenant.ts` (lines 31-49)

**Issue:** No validation that a clinic/tenant isn't already registered with the same email, phone, or slug before creation. Duplicate unique constraint will cause MongoDB E11000 error with poor user feedback.

```typescript
// No check for:
const existingTenant = await Tenant.findOne({
  $or: [
    { email: email.toLowerCase() },
    { slug: uniqueSlug },
  ]
});
```

**Impact:** Confusing error messages, potential data loss on retry, poor UX.

---

### 🔴 Bug #4: Insufficient Permission Checks in Staff Module
**File:** `modules/staff/actions/staffActions.ts` (line 118)

**Issue:** `clinic_admin` can change any staff member's role to `clinic_admin`, including promoting themselves or creating unauthorized admins. Only `super_admin` should manage admin roles.

```typescript
// Current: clinic_admin can set role to "clinic_admin"
const staff = await User.findOneAndUpdate(
  { _id: id, tenantId: session.user.tenantId },
  updateData,  // includes role if changed
);

// Missing: Role escalation check
if (parsed.data.role === "clinic_admin" && session.user.role !== "super_admin") {
  return { success: false, error: "Cannot assign admin roles" };
}
```

**Impact:** Unauthorized privilege escalation, security breach, RBAC violation.

---

### 🔴 Bug #5: Settings Schema Mismatch with Default Values
**File:** `components/settings/SettingsClient.tsx` (lines 19-38)

**Issue:** Zod schema removes `.default()` from optional fields but component still provides defaults in `defaultValues`. The backend schema in `settingsActions.ts` still has defaults. This causes validation inconsistency.

```typescript
// SettingsClient.tsx - Schema without defaults
const Schema = z.object({
  ...
  settings: z.object({
    gstNumber: z.string().optional(),
    timezone: z.string(),          // ❌ NO DEFAULT
    currency: z.string(),          // ❌ NO DEFAULT
    dateFormat: z.string(),        // ❌ NO DEFAULT
  }),
});

// But defaultValues provides them anyway
settings: {
  timezone: initialData?.settings?.timezone ?? "Asia/Kolkata",
  currency: initialData?.settings?.currency ?? "INR",
  dateFormat: initialData?.settings?.dateFormat ?? "DD/MM/YYYY",
},
```

**Impact:** Possible validation errors, inconsistent behavior between client and server.

---

## HIGH SEVERITY BUGS

### 🟠 Bug #6: Logo Upload MIME Type Validation Missing
**File:** `modules/tenants/actions/settingsActions.ts` (line 89)

**Issue:** Upload regex accepts both `image` and invalid types. No whitelist of allowed image types.

```typescript
const cleaned = base64.replace(
  /^data:(image)\/\w+;base64,/,  // ❌ Too permissive
  ""
);
```

**Impact:** Potential arbitrary file upload, security vulnerability.

**Fix:** Validate against whitelist: `['image/jpeg', 'image/png', 'image/webp']`

---

### 🟠 Bug #7: updateClinicProfile Doesn't Return Updated Data
**File:** `modules/tenants/actions/settingsActions.ts` (lines 62-75)

**Issue:** Function completes successfully but doesn't fetch/return updated tenant data. Client has no confirmation of changes.

```typescript
await Tenant.findByIdAndUpdate(session.user.tenantId, {
  // ... updates
});
// ❌ No { new: true } to get updated doc
// ❌ No return of updated data

return { success: true, message: "Settings updated successfully" };
```

**Impact:** No confirmation to user that updates persisted, stale UI, hidden errors.

---

### 🟠 Bug #8: Missing Error Handling in Audit Log Creation
**File:** All action files using `createAuditLog()`

**Issue:** `createAuditLog()` is `await`ed but returns `Promise<void>`. If audit log creation fails, it silently fails without affecting main transaction. Audit logs could be missing without anyone knowing.

```typescript
// audit-logs/actions/createAuditLog.ts
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({...});
  } catch (error) {
    console.error("[createAuditLog]", error);
    // ❌ Silently fails - caller doesn't know
  }
}
```

**Impact:** Missing audit trails, compliance violation, security blind spot.

---

### 🟠 Bug #9: Concurrent Upload Race Conditions
**File:** `modules/radiology/actions/radiologyActions.ts` (lines 233-244)

**Issue:** When saving radiology report with multiple images, uploads happen sequentially but there's no rollback if one fails. Incomplete report could be saved.

```typescript
for (let i = 0; i < parsed.data.imageBase64List.length; i++) {
  const url = await uploadFile(...);  // If this fails mid-loop
  imageUrls.push(url);                // imageUrls is incomplete
}
// No validation that all uploads succeeded before saving
```

**Impact:** Incomplete medical reports, data integrity issue, compliance violation.

---

### 🟠 Bug #10: Missing Appointment Doctor Existence Validation
**File:** `modules/appointments/actions/appointmentActions.ts` (line 29)

**Issue:** Creates appointment with doctor ID without verifying doctor exists or is active in the same tenant.

```typescript
const appointment = await Appointment.create({
  ...parsed.data,
  doctorId: new mongoose.Types.ObjectId(parsed.data.doctorId),  // ❌ No validation
});
```

**Impact:** Appointments assigned to non-existent doctors, data integrity issue.

---

## MEDIUM SEVERITY BUGS

### 🟡 Bug #11: Prescription Images MIME Type Validation Too Permissive
**File:** `modules/prescriptions/actions/prescriptionActions.ts` (line 74)

**Issue:** Same as Bug #6 - accepts too many MIME types.

```typescript
const cleaned = parsed.data.scannedImageBase64.replace(
  /^data:image\/\w+;base64,/,
  ""
);
```

**Impact:** Arbitrary file uploads for prescriptions.

---

### 🟡 Bug #12: Duplicate Radiology Type Definition
**File:** `modules/radiology/actions/radiologyActions.ts` (line 307-309)

**Issue:** Type `RadiologyOrderStatus` is defined at bottom of file, but imported from model (line 1 area). Redundant/conflicting definitions.

```typescript
// Line 307 - Duplicate definition
type RadiologyOrderStatus =
  | "ordered"
  | "imaging_done"
  | "reported"
  // Missing "completed" and "cancelled"
```

**Impact:** TypeScript confusion, incomplete type definition missing "completed" and "cancelled".

---

### 🟡 Bug #13: GetPatientAppointments Missing TenantId ObjectId Conversion
**File:** `modules/prescriptions/actions/prescriptionActions.ts` (line 270)

**Issue:** Same pattern as Bug #1.

```typescript
const appointments = await Appointment.find({
  tenantId: session.user.tenantId,  // ❌ String, not ObjectId
  patientId: new mongoose.Types.ObjectId(patientId),
});
```

**Impact:** Query failure, appointments not retrieved.

---

### 🟡 Bug #14: QuickRegisterPatient Phone Not Unique Within Tenant
**File:** `modules/prescriptions/actions/prescriptionActions.ts` (lines 305-310)

**Issue:** Finds existing patient by phone, but phone uniqueness isn't enforced at database level. Could match wrong patient.

```typescript
const existing = await Patient.findOne({
  tenantId: session.user.tenantId,
  phone: input.phone,  // ❌ Not unique, multiple patients could have same phone
});
```

**Impact:** Wrong patient returned, medical records confusion.

---

### 🟡 Bug #15: Lab Test Code Not Validated for Uniqueness
**File:** `modules/lab/actions/labActions.ts` (lines 50-60)

**Issue:** Schema validation doesn't ensure unique codes per tenant. Error handling checks for E11000 but code is used as reference in orders.

```typescript
const test = await LabTest.create({
  ...parsed.data,
  tenantId: session.user.tenantId,
  // code field - unique check only in catch block
});
```

**Impact:** Potential duplicate lab test codes, confusion in orders.

---

### 🟡 Bug #16: Missing Pagination Validation
**File:** `modules/patients/actions/patientActions.ts` and others

**Issue:** Page and limit parameters accept any number. No validation for negative or zero values.

```typescript
export async function getPatients({
  page = 1,
  limit = 20,
  search = "",
}: {
  page?: number,  // ❌ Could be -1 or 0
  limit?: number, // ❌ Could be -1
}) {
  // ...
  .skip((page - 1) * limit)
  .limit(limit)  // ❌ Negative limit
}
```

**Impact:** Invalid queries, potential security issue.

---

### 🟡 Bug #17: DeleteStaff Function Missing
**File:** `modules/staff/actions/staffActions.ts`

**Issue:** Staff can only be toggled inactive, never deleted. But audit logs include "delete" action. Inconsistency in CRUD operations.

**Impact:** No way to remove staff data, data retention issues.

---

## LOW SEVERITY BUGS

### 🟢 Bug #18: Console Error Logs Reveal Internal Details
**File:** Throughout all action files

**Issue:** Error messages logged to console may leak sensitive information in production logs.

```typescript
console.error("[createAppointment]", error);
```

**Impact:** Information disclosure in logs, debugging visibility issue.

---

### 🟢 Bug #19: JSON.parse(JSON.stringify()) Anti-Pattern
**File:** Throughout all action files (used 50+ times)

**Issue:** Used to serialize Mongoose lean documents, but is unnecessary and slow. Lean already returns plain JS objects.

```typescript
return { 
  success: true, 
  data: JSON.parse(JSON.stringify(prescriptions))  // ❌ Unnecessary
};
```

**Impact:** Performance overhead, unnecessary serialization.

---

### 🟢 Bug #20: Missing Null Check on Populated Fields
**File:** `modules/appointments/actions/appointmentActions.ts` (line 126-138)

**Issue:** Mapping populated fields assumes they exist. If populate returns null, code will throw.

```typescript
const mapped = appointments.map((a: unknown) => {
  const appt = a as {
    patientId: { _id: ...; name: string };  // ❌ Could be null if populate fails
  };
  return {
    patientName: appt.patientId.name,  // ❌ Could throw if null
  };
});
```

**Impact:** Potential runtime error if references are deleted.

---

### 🟢 Bug #21: Missing Timezone Validation
**File:** `modules/tenants/actions/settingsActions.ts` and `components/settings/SettingsClient.tsx`

**Issue:** Timezone string accepted without validation against IANA timezone list.

```typescript
timezone: z.string().default("Asia/Kolkata"),  // ❌ No validation of valid timezone
```

**Impact:** Invalid timezone could cause calculation errors.

---

### 🟢 Bug #22: Missing Blood Group Validation in Patient Update
**File:** `modules/patients/actions/patientActions.ts` (line 164)

**Issue:** `updatePatient` uses `.partial()` schema which might not validate blood group enum.

```typescript
const parsed = PatientSchema.partial().safeParse(input);  // ❌ Enum validation lost
```

**Impact:** Invalid blood group could be saved.

---

### 🟢 Bug #23: Hardcoded Date Format String
**File:** `config/site.ts` and elsewhere

**Issue:** Date formats hardcoded as "DD/MM/YYYY" but not validated or used consistently.

**Impact:** Inconsistent date display if format changed.

---

### 🟢 Bug #24: Missing Rate Limiting on API Routes
**File:** `app/api/` routes

**Issue:** No rate limiting on auth, registration, or file upload endpoints.

**Impact:** Vulnerable to brute force attacks, DDoS.

---

### 🟢 Bug #25: Prescription Follow-up Date Not Validated
**File:** `modules/prescriptions/actions/prescriptionActions.ts` (line 68)

**Issue:** `followUpDate` can be in the past.

```typescript
followUpDate: parsed.data.followUpDate
  ? new Date(parsed.data.followUpDate)  // ❌ No validation for past dates
  : undefined,
```

**Impact:** Invalid follow-up dates, scheduling confusion.

---

## SUMMARY

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 5 | Type mismatches, race conditions, permission bypass |
| 🟠 High | 5 | Validation issues, missing error handling, race conditions |
| 🟡 Medium | 7 | Missing validations, incomplete implementations |
| 🟢 Low | 8 | Performance, logging, edge cases |

**Total Issues Found:** 25

---

## NEXT STEPS

1. Address all 🔴 Critical bugs immediately - they affect system integrity
2. Fix all 🟠 High severity bugs before production release
3. Schedule 🟡 Medium and 🟢 Low fixes in backlog

---

**Last Updated:** May 19, 2026
