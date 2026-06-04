import { StyleSheet, View } from 'react-native';

import { TripStatus } from '../../types/trip';
import { AppText } from '../ui/AppText';

const steps = [
  { label: 'Group', order: 0 },
  { label: 'Dates', order: 1 },
  { label: 'Place', order: 2 },
  { label: 'Plan', order: 3 },
  { label: 'Expenses', order: 4 },
] as const;

type TripProgressStepperProps = {
  status: TripStatus;
};

export function TripProgressStepper({ status }: TripProgressStepperProps) {
  const currentOrder = getTripProgressOrder(status);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Trip progress: ${steps[currentOrder]?.label ?? 'Group'}`}
    >
      {steps.map((step) => {
        const state = step.order < currentOrder ? 'done' : step.order === currentOrder ? 'active' : 'upcoming';
        return (
          <View key={step.label} style={styles.step}>
            <View style={[styles.dot, styles[state]]} />
            <AppText style={[styles.label, state === 'active' && styles.activeLabel]}>{step.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

function getTripProgressOrder(status: TripStatus): number {
  if (status === 'group_created' || status === 'voting_dates') {
    return status === 'group_created' ? 0 : 1;
  }

  if (status === 'date_decided' || status === 'voting_place') {
    return status === 'date_decided' ? 1 : 2;
  }

  if (status === 'place_decided' || status === 'planning' || status === 'on_trip') {
    return 3;
  }

  if (status === 'settling_expenses' || status === 'closed') {
    return 4;
  }

  return 0;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAECF0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  step: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    minWidth: 54,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  done: {
    backgroundColor: '#0F6B57',
  },
  active: {
    backgroundColor: '#155EEF',
  },
  upcoming: {
    backgroundColor: '#D0D5DD',
  },
  label: {
    color: '#667085',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  activeLabel: {
    color: '#101828',
    fontWeight: '700',
  },
});
