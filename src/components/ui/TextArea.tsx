import { TextInputProps } from 'react-native';

import { TextField } from './TextField';

type TextAreaProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextArea({ numberOfLines = 4, textAlignVertical = 'top', ...props }: TextAreaProps) {
  return (
    <TextField
      {...props}
      multiline
      numberOfLines={numberOfLines}
      textAlignVertical={textAlignVertical}
      style={[{ minHeight: 112 }, props.style]}
    />
  );
}
