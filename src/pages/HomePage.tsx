import IncidentMap from '../components/IncidentMap';
import { INCIDENTS } from '../content/incidents';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <IncidentMap incidents={INCIDENTS} />
    </div>
  );
}
