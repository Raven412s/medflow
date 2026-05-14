import { getPatients } from "@/modules/patients/actions/patientActions";
import { PatientsClient } from "@/components/patients/PatientsClient";

export default async function PatientsPage() {
  const result = await getPatients({ page: 1, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {result.total ?? 0} total patients registered
          </p>
        </div>
      </div>
      <PatientsClient
        initialPatients={result.data ?? []}
        totalPatients={result.total ?? 0}
      />
    </div>
  );
}