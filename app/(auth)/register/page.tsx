import { RegisterForm } from "@/components/forms/RegisterForm";
import { AuthPanel } from "@/components/layout/AuthPanel";

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Register your clinic
            </h1>
            <p className="text-sm text-muted-foreground">
              Get started free — 14 day trial, no credit card required
            </p>
          </div>
          <RegisterForm />
          <p className="text-sm text-muted-foreground text-center">
            Already registered?{" "}
            <a
              href="/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
      <AuthPanel
        heading="Join 500+ clinics already on Medflow."
        subheading="From solo practitioners to multi-doctor setups — Medflow adapts to how your clinic works."
      />
    </div>
  );
}