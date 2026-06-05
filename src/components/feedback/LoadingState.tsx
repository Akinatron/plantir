import { LoadingState as UiLoadingState } from '../ui/LoadingState';

type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return <UiLoadingState label={label} />;
}
