import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { TextField } from '../../components/ui/TextField';
import { ToggleRow } from '../../components/ui/ToggleRow';
import { AppText } from '../../components/ui/AppText';
import { spacing } from '../../design/spacing';
import { DestinationCustomField, DestinationCustomFieldType } from '../../types/destination';

export type CustomFieldDraftValue = {
  valueText?: string | null;
  valueNumber?: string | null;
  valueMoneyCents?: string | null;
  valueBoolean?: boolean | null;
  valueUrl?: string | null;
};

type CustomFieldEditorProps = {
  fields: DestinationCustomField[];
  values: Record<string, CustomFieldDraftValue>;
  canCreateFields?: boolean;
  creatingField?: boolean;
  onValueChange: (fieldId: string, value: CustomFieldDraftValue) => void;
  onCreateField?: (field: {
    name: string;
    emoji: string | null;
    fieldType: DestinationCustomFieldType;
    showOnCard: boolean;
  }) => void;
};

const fieldTypes: DestinationCustomFieldType[] = ['text', 'number', 'money', 'boolean', 'url'];

export function CustomFieldEditor({
  fields,
  values,
  canCreateFields = false,
  creatingField = false,
  onValueChange,
  onCreateField,
}: CustomFieldEditorProps) {
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldEmoji, setNewFieldEmoji] = useState('');
  const [newFieldType, setNewFieldType] = useState<DestinationCustomFieldType>('text');
  const [showOnCard, setShowOnCard] = useState(true);
  const sortedFields = useMemo(
    () => [...fields].sort((left, right) => left.sortOrder - right.sortOrder),
    [fields],
  );

  const createField = () => {
    const name = newFieldName.trim();

    if (!name || !onCreateField) {
      return;
    }

    onCreateField({
      name,
      emoji: newFieldEmoji.trim() || null,
      fieldType: newFieldType,
      showOnCard,
    });
    setNewFieldName('');
    setNewFieldEmoji('');
    setNewFieldType('text');
    setShowOnCard(true);
  };

  if (sortedFields.length === 0 && !canCreateFields) {
    return null;
  }

  return (
    <View style={styles.container}>
      {sortedFields.length > 0 ? (
        <View style={styles.fields}>
          <AppText variant="subtitle">Extra comparison fields</AppText>
          {sortedFields.map((field) => (
            <CustomValueInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(value) => onValueChange(field.id, value)}
            />
          ))}
        </View>
      ) : null}

      {canCreateFields ? (
        <Card variant="soft">
          <AppText variant="bodyStrong">Add a comparison field</AppText>
          <TextField
            label="Field name"
            value={newFieldName}
            onChangeText={setNewFieldName}
            placeholder="Example: Pool, parking, checkout"
          />
          <TextField
            label="Emoji"
            value={newFieldEmoji}
            onChangeText={setNewFieldEmoji}
            placeholder="Optional"
            maxLength={4}
          />
          <View style={styles.typeChips}>
            {fieldTypes.map((fieldType) => (
              <Chip
                key={fieldType}
                label={fieldType}
                selected={newFieldType === fieldType}
                tone={newFieldType === fieldType ? 'sea' : 'neutral'}
                onPress={() => setNewFieldType(fieldType)}
              />
            ))}
          </View>
          <ToggleRow
            label="Show on cards"
            description="Visible fields make proposals easier to compare."
            value={showOnCard}
            onValueChange={setShowOnCard}
          />
          <Button
            label="Add field"
            variant="secondary"
            loading={creatingField}
            disabled={!newFieldName.trim()}
            onPress={createField}
          />
        </Card>
      ) : null}
    </View>
  );
}

function CustomValueInput({
  field,
  value,
  onChange,
}: {
  field: DestinationCustomField;
  value?: CustomFieldDraftValue;
  onChange: (value: CustomFieldDraftValue) => void;
}) {
  const label = field.emoji ? `${field.emoji} ${field.name}` : field.name;

  if (field.fieldType === 'boolean') {
    return (
      <ToggleRow
        label={label}
        value={value?.valueBoolean ?? false}
        onValueChange={(nextValue) => onChange({ valueBoolean: nextValue })}
      />
    );
  }

  const draftValue =
    field.fieldType === 'number'
      ? value?.valueNumber
      : field.fieldType === 'money'
        ? value?.valueMoneyCents
        : field.fieldType === 'url'
          ? value?.valueUrl
          : value?.valueText;

  return (
    <TextField
      label={label}
      value={draftValue ?? ''}
      onChangeText={(nextValue) => {
        if (field.fieldType === 'number') {
          onChange({ valueNumber: nextValue });
          return;
        }

        if (field.fieldType === 'money') {
          onChange({ valueMoneyCents: nextValue });
          return;
        }

        if (field.fieldType === 'url') {
          onChange({ valueUrl: nextValue });
          return;
        }

        onChange({ valueText: nextValue });
      }}
      keyboardType={field.fieldType === 'number' || field.fieldType === 'money' ? 'decimal-pad' : 'default'}
      placeholder={field.required ? 'Required' : 'Optional'}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  fields: {
    gap: spacing[3],
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
});
