import { PlaceholderState } from '../src/components/feedback/PlaceholderState';
import { Screen } from '../src/components/ui/Screen';

export default function SignupScreen() {
  return (
    <Screen>
      <PlaceholderState
        title="Signup placeholder"
        description="Signup will be implemented in the auth phase."
      />
    </Screen>
  );
}
