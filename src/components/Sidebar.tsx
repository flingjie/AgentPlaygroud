import StageSelector from './StageSelector';
import ExperimentList from './ExperimentList';

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <StageSelector />
      <ExperimentList />
    </aside>
  );
}
