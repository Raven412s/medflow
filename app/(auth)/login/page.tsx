import { LoginForm } from "@/components/forms/LoginForm";
import { AuthPanel } from "@/components/layout/AuthPanel";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your clinic dashboard
            </p>
          </div>
          <LoginForm />
          <p className="text-sm text-muted-foreground text-center">
            New clinic?{" "}
            <a
              href="/register"
              className="text-primary underline-offset-4 hover:underline"
            >
              Register here
            </a>
          </p>
        </div>
      </div>
      <AuthPanel
        heading="Run your clinic, not paperwork."
        subheading="Medflow brings appointments, prescriptions, billing, and lab reports into one fast workflow."
      />
    </div>
  );
}