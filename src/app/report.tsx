import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Palette } from '@/constants/design';
import { useAppTheme } from '@/hooks/use-app-theme';
import { buildManualReportPreview, exportManualReport, type ReportScope } from '@/services/report/manual-report';
import { useNotificationStore } from '@/store/notificationStore';
import { showFeedbackDialog } from '@/store/feedbackDialogStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useUserStore } from '@/store/userStore';
import { useWalletStore } from '@/store/walletStore';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const transactions = useTransactionStore((state) => state.transactions);
  const wallets = useWalletStore((state) => state.wallets);
  const categories = useCategoryStore((state) => state.categories);
  const profile = useUserStore((state) => state.profile);
  const settings = useUserStore((state) => state.settings);

  const [reportScope, setReportScope] = useState<ReportScope>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const reportPreview = useMemo(() => {
    return buildManualReportPreview({
      transactions,
      wallets,
      categories,
      profile,
      currency: settings.currency,
      scope: reportScope,
      startDate: customStartDate,
      endDate: customEndDate,
    });
  }, [transactions, wallets, categories, profile, settings.currency, reportScope, customStartDate, customEndDate]);

  async function handleExport(format: 'pdf' | 'excel') {
    try {
      setIsExporting(true);
      const result = await exportManualReport({
        transactions,
        wallets,
        categories,
        profile,
        currency: settings.currency,
        scope: reportScope,
        startDate: customStartDate,
        endDate: customEndDate,
        format,
      });

      if (result.savedLocally) {
        showFeedbackDialog({
          title: 'Report saved',
          message: `Your ${format.toUpperCase()} report was saved in the folder you selected.`,
          variant: 'success',
        });
        useNotificationStore.getState().addNotification({
          id: `report-${Date.now()}`,
          kind: 'report',
          title: `${format.toUpperCase()} report saved`,
          body: `Your ${format.toUpperCase()} report was exported successfully.`,
          timestamp: Date.now(),
          read: false,
          route: '/history',
        });
        return;
      }

      showFeedbackDialog({
        title: 'Save access needed',
        message: `We created the ${format.toUpperCase()} report, but Android storage access was not granted. Please allow folder access to save it to your device.`,
        variant: 'warning',
      });
    } catch (error) {
      console.error('Manual report export failed', error);
      showFeedbackDialog({
        title: 'Report failed',
        message: error instanceof Error ? error.message : 'Unable to generate the report.',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 110, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Generate report</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            Export a PDF or Excel summary for today, week, month, year, all-time, or a custom date range.
          </Text>
        </View>
        <Button label="Back" icon="arrow-back-outline" onPress={() => router.back()} secondary />
      </View>

      <Card style={{ padding: 16, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900' }}>Choose range</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            Pick a preset or enter a custom date range. On Android, the app will ask where to save the file if sharing is unavailable.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(['today', 'week', 'month', 'year', 'all', 'custom'] as ReportScope[]).map((option) => (
            <SelectionChip
              key={option}
              label={option}
              icon="document-text-outline"
              color={Palette.purple}
              selected={reportScope === option}
              onPress={() => setReportScope(option)}
            />
          ))}
        </View>

        {reportScope === 'custom' ? (
          <View style={{ gap: 12 }}>
            <Input label="Start date" value={customStartDate} onChangeText={setCustomStartDate} placeholder="YYYY-MM-DD" />
            <Input label="End date" value={customEndDate} onChangeText={setCustomEndDate} placeholder="YYYY-MM-DD" />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            label={isExporting ? 'Generating...' : 'PDF'}
            icon="download-outline"
            onPress={() => handleExport('pdf')}
            secondary
            style={{ flex: 1 }}
          />
          <Button
            label={isExporting ? 'Generating...' : 'Excel'}
            icon="grid-outline"
            onPress={() => handleExport('excel')}
            secondary
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <InfoChip label="Scope" value={reportPreview.title} theme={theme} />
          <InfoChip label="Range" value={reportPreview.subtitle} theme={theme} />
          <InfoChip label="Transactions" value={String(reportPreview.filteredTransactions.length)} theme={theme} />
        </View>
      </Card>
    </ScrollView>
  );
}

function InfoChip({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={{ flexGrow: 1, minWidth: 140, padding: 12, borderRadius: 16, backgroundColor: theme.chipBackground, borderWidth: 1, borderColor: theme.border }}>
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', marginTop: 4 }}>{value}</Text>
    </View>
  );
}
