import { render, screen } from '@testing-library/react-native';

import { PlaceholderState } from '../PlaceholderState';

describe('PlaceholderState', () => {
  it('renders the title and description', () => {
    render(<PlaceholderState title="Trips" description="Trip list placeholder" />);

    expect(screen.getByText('Trips')).toBeTruthy();
    expect(screen.getByText('Trip list placeholder')).toBeTruthy();
  });
});
