import { PlaceholderState } from '../../src/components/feedback/PlaceholderState';
import { Screen } from '../../src/components/ui/Screen';

export default function ProfileTabScreen() {
  return (
    <Screen>
      <PlaceholderState
        title="Profile"
        description="Profile data will be connected after auth is implemented."
      />
    </Screen>
  );
}
