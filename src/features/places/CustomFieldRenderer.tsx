import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Chip } from '../../components/ui/Chip';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import { DestinationCustomField, DestinationCustomFieldValue } from '../../types/destination';

type CustomFieldRendererProps = {
  fields: DestinationCustomField[];
  values: DestinationCustomFieldValue[];
  currencyCode?: string | null;
  cardOnly?: boolean;
  compact?: boolean;
};

export function CustomFieldRenderer({
  fields,
  values,
  currencyCode,
  cardOnly = false,
  compact = false,
}: CustomFieldRendererProps) {
  const visibleFields = (cardOnly ? fields.filter((field) => field.showOnCard) : fields).filter(
    (field) => getFieldDisplayValue(field, values, currencyCode) !== null,
  );

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {visibleFields.map((field) => {
        const value = getFieldDisplayValue(field, values, currencyCode);

        if (!value) {
          return null;
        }

        if (value.kind === 'url') {
          return (
            <Pressable
              key={field.id}
              accessibilityRole="link"
              accessibilityLabel={`${field.name} link`}
              onPress={() => void Linking.openURL(value.text)}
              style={styles.item}
            >
              <AppText variant="caption">{formatFieldName(field)}</AppText>
              <AppText variant="bodyStrong" numberOfLines={1} style={styles.link}>
                {shortenUrl(value.text)}
              </AppText>
            </Pressable>
          );
        }

        return (
          <View key={field.id} style={styles.item}>
            <AppText variant="caption">{formatFieldName(field)}</AppText>
            <Chip label={value.text} tone={value.kind === 'boolean' ? 'sea' : 'neutral'} />
          </View>
        );
      })}
    </View>
  );
}

function formatFieldName(field: DestinationCustomField): string {
  return field.emoji ? `${field.emoji} ${field.name}` : field.name;
}

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function getFieldDisplayValue(
  field: DestinationCustomField,
  values: DestinationCustomFieldValue[],
  currencyCode?: string | null,
): { kind: 'text' | 'number' | 'money' | 'boolean' | 'url'; text: string } | null {
  const value = values.find((item) => item.fieldId === field.id);

  if (!value) {
    return null;
  }

  if (field.fieldType === 'text' && value.valueText) {
    return { kind: 'text', text: value.valueText };
  }

  if (field.fieldType === 'number' && value.valueNumber !== null) {
    return { kind: 'number', text: String(value.valueNumber) };
  }

  if (field.fieldType === 'money' && value.valueMoneyCents !== null) {
    return {
      kind: 'money',
      text: currencyCode ? formatCents(value.valueMoneyCents, currencyCode) : `${value.valueMoneyCents / 100}`,
    };
  }

  if (field.fieldType === 'boolean' && value.valueBoolean !== null) {
    return { kind: 'boolean', text: value.valueBoolean ? 'Yes' : 'No' };
  }

  if (field.fieldType === 'url' && value.valueUrl) {
    return { kind: 'url', text: value.valueUrl };
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  compactContainer: {
    gap: spacing[2],
  },
  item: {
    gap: spacing[1],
    minWidth: 108,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
