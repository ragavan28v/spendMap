export const incomeSources = [
  {
    id: 'income-salary',
    name: 'Salary',
    icon: 'briefcase-outline',
    color: '#10B981',
    defaultRecurringType: 'monthly',
  },
  {
    id: 'income-freelance',
    name: 'Freelance',
    icon: 'laptop-outline',
    color: '#3B82F6',
    defaultRecurringType: 'none',
  },
  {
    id: 'income-refund',
    name: 'Refund',
    icon: 'return-down-back-outline',
    color: '#06B6D4',
    defaultRecurringType: 'none',
  },
  {
    id: 'income-cashback',
    name: 'Cashback',
    icon: 'card-outline',
    color: '#F59E0B',
    defaultRecurringType: 'none',
  },
  {
    id: 'income-gift',
    name: 'Gift',
    icon: 'gift-outline',
    color: '#EC4899',
    defaultRecurringType: 'none',
  },
  {
    id: 'income-interest',
    name: 'Interest',
    icon: 'trending-up-outline',
    color: '#8B5CF6',
    defaultRecurringType: 'monthly',
  },
  {
    id: 'income-other',
    name: 'Other',
    icon: 'add-circle-outline',
    color: '#64748B',
    defaultRecurringType: 'none',
  },
] as const;

export type IncomeSource = (typeof incomeSources)[number];
export type IncomeSourceId = IncomeSource['id'];
