import { StaffHeading } from '@/components/common/ui/StaffHeading';
import { PROBLEMS, type ProblemId } from '@/config/problems';

export default function ProblemHeader({ id }: { id: ProblemId }) {
  const problem = PROBLEMS.find((p) => p.id === id);
  if (!problem) return null;
  return (
    <header className="mb-4">
      <StaffHeading level={1} variant="heading">{problem.question}</StaffHeading>
      <p className="mt-1 text-body text-gray-500">{problem.hint}</p>
    </header>
  );
}
