import { Palette } from '@/constants/design';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  background: string;
  backgroundSoft: string;
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  inputBackground: string;
  chipBackground: string;
  chipBorder: string;
  chipSelectedBackground: string;
  trackBackground: string;
  buttonSecondaryBackground: string;
  cardShadow: string;
  tabBarBackground: string;
  headerBackground: string;
  notificationBackground: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  purple: string;
  cyan: string;
}

const sharedAccent = {
  accent: Palette.blue,
  accentSoft: `${Palette.blue}20`,
  success: Palette.emerald,
  warning: Palette.orange,
  error: Palette.red,
  purple: Palette.purple,
  cyan: Palette.cyan,
};

export const AppThemes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: 'dark',
    background: '#0F172A',
    backgroundSoft: '#172033',
    surface: '#111827',
    surfaceElevated: '#1E293B',
    surfaceGlass: 'rgba(30, 41, 59, 0.78)',
    border: 'rgba(148, 163, 184, 0.18)',
    text: '#F8FAFC',
    muted: '#94A3B8',
    subtle: '#64748B',
    inputBackground: 'rgba(15, 23, 42, 0.62)',
    chipBackground: 'rgba(15, 23, 42, 0.52)',
    chipBorder: 'rgba(148, 163, 184, 0.18)',
    chipSelectedBackground: 'rgba(59, 130, 246, 0.15)',
    trackBackground: 'rgba(148, 163, 184, 0.16)',
    buttonSecondaryBackground: 'rgba(15, 23, 42, 0.52)',
    cardShadow: '0 18px 40px rgba(0, 0, 0, 0.18)',
    tabBarBackground: '#0F172A',
    headerBackground: '#0F172A',
    notificationBackground: 'rgba(255, 255, 255, 0.08)',
    ...sharedAccent,
  },
  light: {
    mode: 'light',
    background: '#F8FAFC',
    backgroundSoft: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FAFC',
    surfaceGlass: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(148, 163, 184, 0.22)',
    text: '#0F172A',
    muted: '#475569',
    subtle: '#64748B',
    inputBackground: '#FFFFFF',
    chipBackground: 'rgba(241, 245, 249, 0.95)',
    chipBorder: 'rgba(148, 163, 184, 0.22)',
    chipSelectedBackground: 'rgba(59, 130, 246, 0.12)',
    trackBackground: 'rgba(148, 163, 184, 0.22)',
    buttonSecondaryBackground: 'rgba(241, 245, 249, 0.95)',
    cardShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
    tabBarBackground: '#F8FAFC',
    headerBackground: '#F8FAFC',
    notificationBackground: 'rgba(59, 130, 246, 0.10)',
    ...sharedAccent,
  },
};

export function getNextThemeMode(themeMode: ThemeMode) {
  return themeMode === 'dark' ? 'light' : 'dark';
}
