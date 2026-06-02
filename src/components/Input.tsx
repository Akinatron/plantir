/**
 * Input — controlado, con label, helper y error.
 */

import { View, Text, TextInput } from 'react-native';
import type { ComponentProps } from 'react';

interface InputProps extends Omit<ComponentProps<typeof TextInput>, 'style'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export function Input({
  label,
  helperText,
  errorText,
  required,
  leftIcon,
  rightIcon,
  testID,
  accessibilityLabel,
  ...textInputProps
}: InputProps) {
  const hasError = !!errorText;
  const borderClass = hasError
    ? 'border-danger'
    : textInputProps.editable === false
    ? 'border-neutral-200 bg-neutral-50'
    : 'border-neutral-200 focus:border-primary-500';
  return (
    <View>
      {label ? (
        <Text className="mb-1 text-body-sm font-medium text-neutral-800">
          {label}
          {required ? <Text className="text-danger"> *</Text> : null}
        </Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-md border px-3 ${borderClass}`}
        style={{ minHeight: 44 }}
      >
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <TextInput
          testID={testID}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor="#A99E91"
          className="flex-1 text-body text-neutral-900"
          {...textInputProps}
        />
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>
      {errorText ? (
        <Text className="mt-1 text-caption text-danger">{errorText}</Text>
      ) : helperText ? (
        <Text className="mt-1 text-caption text-neutral-600">{helperText}</Text>
      ) : null}
    </View>
  );
}
