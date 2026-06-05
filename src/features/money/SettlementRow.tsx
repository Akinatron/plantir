import { StyleSheet, View } from 'react-native';
import { ArrowRight, CheckCircle2 } from 'lucide-react-native';

import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors } from '../../design/theme';
import { spacing } from '../../design/spacing';
import { formatCents } from '../../lib/algorithms/money';
import { SettlementSuggestion } from '../../types/expense';

type SettlementRowProps = {
  suggestion: SettlementSuggestion;
  fromName: string;
  toName: string;
  canMarkPaid: boolean;
  disabled?: boolean;
  onMarkPaid: () => void;
};

export function SettlementRow({
  suggestion,
  fromName,
  toName,
  canMarkPaid,
  disabled = false,
  onMarkPaid,
}: SettlementRowProps) {
  return (
    <Card variant="elevated">
      <View style={styles.flow}>
        <View style={styles.person}>
          <AppText variant="caption">Pays</AppText>
          <AppText variant="bodyStrong">{fromName}</AppText>
        </View>
        <ArrowRight color={colors.primary} size={22} />
        <View style={styles.person}>
          <AppText variant="caption">Receives</AppText>
          <AppText variant="bodyStrong">{toName}</AppText>
        </View>
      </View>
      <View style={styles.bottom}>
        <AppText variant="subtitle">{formatCents(suggestion.amountCents, suggestion.currencyCode)}</AppText>
        <Button
          label={canMarkPaid ? 'Mark paid' : 'View only'}
          variant={canMarkPaid ? 'secondary' : 'ghost'}
          fullWidth={false}
          disabled={!canMarkPaid || disabled}
          onPress={onMarkPaid}
          leftIcon={canMarkPaid ? <CheckCircle2 color={colors.primary} size={18} /> : undefined}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
  },
  person: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: spacing[1],
    minHeight: 64,
    padding: spacing[3],
  },
  bottom: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
});
