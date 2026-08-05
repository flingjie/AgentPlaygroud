import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface GraphValidatorProps {
  issues: string[];
}

export default function GraphValidator({ issues }: GraphValidatorProps) {
  if (issues.length === 0) {
    return (
      <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-mono">
        <CheckCircle2 size={14} />
        Graph valid
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 max-w-xs">
      <div className="px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 space-y-1">
        <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
          <AlertTriangle size={14} />
          {issues.length} issue{issues.length > 1 ? 's' : ''}
        </div>
        <ul className="text-xs text-red-300 space-y-0.5 list-disc list-inside">
          {issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
