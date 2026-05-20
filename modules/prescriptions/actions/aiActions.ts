"use server";

import { openrouter, AI_MODEL } from "@/lib/ai";
import { auth } from "@/auth";
import { z } from "zod";
import { connectDB } from "@/lib/db";

const SuggestSchema = z.object({
  diagnosis: z.string().min(1, "Diagnosis required"),
  patientAge: z.number().optional(),
  patientGender: z.string().optional(),
  knownAllergies: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export interface MedicineSuggestion {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface AISuggestionResult {
  medicines: MedicineSuggestion[];
  generalInstructions: string;
  disclaimer: string;
}

export async function getPrescriptionSuggestions(input: unknown): Promise<{
  success: boolean;
  data?: AISuggestionResult;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  // Only doctors and clinic admins can use AI suggestions
  if (!["doctor", "clinic_admin", "super_admin"].includes(session.user.role)) {
    return { success: false, error: "Only doctors can use AI suggestions" };
  }

  const parsed = SuggestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const {
    diagnosis,
    patientAge,
    patientGender,
    knownAllergies,
    additionalNotes,
  } = parsed.data;

  const prompt = `You are a clinical decision support assistant for Indian doctors. 
Your role is to suggest common medicines for a given diagnosis. 
The doctor will ALWAYS review and confirm before prescribing.

Patient Details:
- Diagnosis: ${diagnosis}
${patientAge ? `- Age: ${patientAge} years` : ""}
${patientGender ? `- Gender: ${patientGender}` : ""}
${
  knownAllergies
    ? `- Known Allergies: ${knownAllergies}`
    : "- No known allergies"
}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ""}

Suggest medicines commonly used in Indian clinical practice for this diagnosis.
Use Indian generic medicine names where possible.
Use standard Indian frequency notation: 1-0-1 (BD), 1-1-1 (TDS), 1-0-0 (OD morning), 0-0-1 (OD night).

Respond ONLY with a valid JSON object in this exact format, no markdown, no explanation:
{
  "medicines": [
    {
      "name": "MEDICINE NAME IN CAPS",
      "dose": "500mg",
      "frequency": "1-0-1",
      "duration": "5 days",
      "instructions": "after food"
    }
  ],
  "generalInstructions": "Rest, drink plenty of fluids",
  "disclaimer": "AI suggestion only. Doctor must review before prescribing."
}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content:
            "You are a clinical decision support tool. Always respond with valid JSON only. Never add markdown formatting or extra text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    // Strip markdown fences if model adds them
    const cleaned = raw
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AISuggestionResult;

    // Validate structure
    if (!parsed.medicines || !Array.isArray(parsed.medicines)) {
      throw new Error("Invalid response structure");
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("[getPrescriptionSuggestions]", error);
    return {
      success: false,
      error: "AI suggestions unavailable. Please fill manually.",
    };
  }
}

export async function generatePatientSummary(patientId: string): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Unauthorized" };

  await connectDB();

  // Import models
  const { default: Patient } = await import(
    "@/modules/patients/models/Patient"
  );
  const { default: Prescription } = await import(
    "@/modules/prescriptions/models/Prescription"
  );
  const { default: LabOrder } = await import("@/modules/lab/models/LabOrder");
  const mongoose = await import("mongoose");

  try {
    const [patient, prescriptions, labOrders] = await Promise.all([
      Patient.findOne({
        _id: patientId,
        tenantId: session.user.tenantId,
      }).lean(),
      Prescription.find({
        patientId: new mongoose.Types.ObjectId(patientId),
        tenantId: session.user.tenantId,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      LabOrder.find({
        patientId: new mongoose.Types.ObjectId(patientId),
        tenantId: session.user.tenantId,
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    if (!patient) return { success: false, error: "Patient not found" };

    const patientData = patient as {
      name: string;
      dateOfBirth?: Date;
      gender?: string;
      bloodGroup?: string;
      allergies?: string[];
      medicalHistory?: string;
    };

    const age = patientData.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(patientData.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : "Unknown";

    const rxList = (
      prescriptions as {
        diagnosis: string;
        medicines: { name: string; dose: string }[];
        createdAt: Date;
      }[]
    )
      .map(
        (rx) =>
          `- ${new Date(rx.createdAt).toLocaleDateString("en-IN")}: ${
            rx.diagnosis
          } — ${rx.medicines.map((m) => `${m.name} ${m.dose}`).join(", ")}`
      )
      .join("\n");

    const labList = (
      labOrders as {
        orderNumber: string;
        results: {
          testName: string;
          parameterResults: {
            parameterName: string;
            value: string;
            unit: string;
            isAbnormal: boolean;
          }[];
        }[];
      }[]
    )
      .map((order) =>
        order.results
          .map((r) =>
            r.parameterResults
              .map(
                (p) =>
                  `${p.parameterName}: ${p.value} ${p.unit}${
                    p.isAbnormal ? " (ABNORMAL)" : ""
                  }`
              )
              .join(", ")
          )
          .join("; ")
      )
      .join("\n");

    const prompt = `Generate a brief clinical summary for the following patient for referral purposes.
Write in professional medical English. Keep it under 150 words.

Patient: ${patientData.name}, ${age} years, ${
      patientData.gender ?? "Unknown gender"
    }
Blood Group: ${patientData.bloodGroup ?? "Unknown"}
Allergies: ${patientData.allergies?.join(", ") || "None known"}
Medical History: ${patientData.medicalHistory || "None recorded"}

Recent Prescriptions:
${rxList || "None"}

Recent Lab Results:
${labList || "None"}

Write ONLY the summary paragraph. No headings, no bullet points, no markdown.`;

    const response = await openrouter.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are a medical documentation assistant. Write concise clinical summaries.",
        },
        { role: "user", content: prompt },
      ],
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? "";

    return { success: true, summary };
  } catch (error) {
    console.error("[generatePatientSummary]", error);
    return { success: false, error: "Failed to generate summary" };
  }
}
