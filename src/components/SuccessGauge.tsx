export interface SuccessGaugeProps {
  value: number;
  label: string;
  accentClassName?: string;
}

export function SuccessGauge({ value, label, accentClassName = 'text-sky-500' }: SuccessGaugeProps) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(v * 100);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const arc = Math.PI * radius;
  const offset = arc * (1 - v);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 80" className="w-full max-w-xs h-auto">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(180 60 60)"
          className="text-zinc-200 dark:text-zinc-700"
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={0}
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(180 60 60)"
          className={accentClassName}
          strokeDasharray={`${arc} ${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text
          x="60"
          y="54"
          textAnchor="middle"
          className="fill-current text-2xl font-bold"
        >
          {percent}%
        </text>
        <text
          x="60"
          y="74"
          textAnchor="middle"
          className="fill-current text-xs"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
