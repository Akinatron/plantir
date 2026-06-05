import { EmptyState } from '../ui/EmptyState';

type PlaceholderStateProps = {
  title: string;
  description: string;
};

export function PlaceholderState({ title, description }: PlaceholderStateProps) {
  return <EmptyState title={title} description={description} />;
}
