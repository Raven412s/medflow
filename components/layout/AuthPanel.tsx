import { Activity } from "lucide-react";

interface AuthPanelProps {
  heading: string;
  subheading: string;
}

export function AuthPanel({ heading, subheading }: AuthPanelProps) {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-zinc-950 text-white px-12 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Medflow</span>
      </div>

      {/* Center content */}
      <div className="space-y-4 max-w-sm">
        <h2 className="text-3xl font-semibold leading-snug">{heading}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{subheading}</p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { value: "500+", label: "Clinics" },
            { value: "1.2L+", label: "Patients" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="text-xl font-semibold">{stat.value}</div>
              <div className="text-xs text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <div className="border-l-2 border-zinc-700 pl-4 space-y-1">
        <p className="text-sm text-zinc-300 italic">
          &quot;We replaced 3 different tools with Medflow. The prescription module
          alone saves us 2 hours a day.&quot;
        </p>
        <p className="text-xs text-zinc-500">— Dr. Priya Sharma, Pune</p>
      </div>
    </div>
  );
}