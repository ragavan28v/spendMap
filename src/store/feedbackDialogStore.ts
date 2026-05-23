import { create } from 'zustand';

export type FeedbackVariant = 'success' | 'error' | 'info' | 'warning';

export interface FeedbackDialogOptions {
  title: string;
  message: string;
  variant?: FeedbackVariant;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

interface FeedbackDialogState extends FeedbackDialogOptions {
  visible: boolean;
  showDialog: (options: FeedbackDialogOptions) => void;
  hideDialog: () => void;
}

const defaultState = {
  visible: false,
  title: '',
  message: '',
  variant: 'info' as FeedbackVariant,
  primaryLabel: 'OK',
  secondaryLabel: undefined,
  onPrimary: undefined,
  onSecondary: undefined,
};

export const useFeedbackDialogStore = create<FeedbackDialogState>((set, get) => ({
  ...defaultState,
  showDialog: (options) => {
    set({
      visible: true,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      primaryLabel: options.primaryLabel ?? 'OK',
      secondaryLabel: options.secondaryLabel,
      onPrimary: options.onPrimary,
      onSecondary: options.onSecondary,
    });
  },
  hideDialog: () => {
    set((state) => ({
      ...state,
      ...defaultState,
    }));
  },
}));

export function showFeedbackDialog(options: FeedbackDialogOptions) {
  useFeedbackDialogStore.getState().showDialog(options);
}

export function hideFeedbackDialog() {
  useFeedbackDialogStore.getState().hideDialog();
}
