import { useParams } from 'react-router-dom';

export default function ScenarioPage() {
  const { id } = useParams();
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">{id}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        场景实验页（建设中） / under construction
      </p>
    </div>
  );
}
