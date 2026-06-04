import { Alert, Platform } from 'react-native';

type ConfirmActionInput = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmActionInput): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      onPress: onConfirm,
      style: destructive ? 'destructive' : 'default',
    },
  ]);
}
