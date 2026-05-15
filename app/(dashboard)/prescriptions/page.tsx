import { getPrescriptions } from "@/modules/prescriptions/actions/prescriptionActions";
import { PrescriptionsClient } from "@/components/prescriptions/PrescriptionsClient";

export default async function PrescriptionsPage() {
  const result = await getPrescriptions({ page: 1, limit: 20 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {result.total ?? 0} total prescriptions
          </p>
        </div>
      </div>
      <PrescriptionsClient initialPrescriptions={result.data ?? []} />
    </div>
  );
}