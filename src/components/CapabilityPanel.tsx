import { CAPABILITIES } from '../content/capabilities';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import type { CapabilityId, Scenario } from '../content/schema';

export interface CapabilityPanelProps {
  scenario: Scenario;
  enabled: ReadonlySet<CapabilityId>;
  inventory: readonly CapabilityId[];
  onChange: (id: CapabilityId, checked: boolean) => void;
}

export function CapabilityPanel({ scenario, enabled, inventory, onChange }: CapabilityPanelProps) {
  const pick = usePick();
  const inventorySet = new Set(inventory);

  const required = new Set(scenario.def.requiredCapabilities);
  const effectIds = Object.keys(scenario.def.capabilityEffects) as CapabilityId[];

  const ids = Array.from(
    new Set<CapabilityId>([
      ...inventory,
      ...scenario.def.requiredCapabilities,
      ...effectIds.filter((id) => inventorySet.has(id)),
    ]),
  );

  const sortOrder = (a: CapabilityId, b: CapabilityId) => {
    const inInventory = (id: CapabilityId) => (inventorySet.has(id) ? 0 : 1);
    const isRequired = (id: CapabilityId) => (required.has(id) ? 0 : 1);
    const aScore = inInventory(a) * 2 + isRequired(a);
    const bScore = inInventory(b) * 2 + isRequired(b);
    return aScore - bScore || a.localeCompare(b);
  };

  const sortedIds = [...ids].sort(sortOrder);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {pick(ui.injectCapability)}
      </h3>
      <div className="space-y-2">
        {sortedIds.map((id) => {
          const meta = CAPABILITIES[id];
          const isNew = required.has(id) && !inventorySet.has(id);
          return (
            <label
              key={id}
              data-testid={`capability-toggle-${id}`}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-sky-600"
                checked={enabled.has(id)}
                onChange={(e) => onChange(id, e.target.checked)}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {pick(meta.name)}
                  </span>
                  {isNew && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {pick(ui.newBadge)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{pick(meta.desc)}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
