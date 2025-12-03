/**
 * Centralized theme file for the FitGPT frontend application
 * Contains all design tokens: colors, spacing, typography, radius, and shadows
 *
 * Design Philosophy: "Warm Athletic Performance"
 * - Energetic burnt orange primary (distinctive, not typical blue)
 * - Warm, inviting neutrals (cream/espresso)
 * - High contrast for readability
 * - Performance-focused aesthetic
 */

export const colors = {
  // Primary - Burnt Orange (energetic, distinctive)
  primary: '#E85D2F',
  primaryAlt: '#D94E1F',
  primaryLight: '#FF7A4D',

  // Background - Warm neutrals
  background: '#FFFBF7',
  backgroundGray: '#F5F1ED',
  backgroundLight: '#FAF8F5',
  backgroundMuted: '#E8E4DF',

  // Text - Espresso tones
  text: '#2C1810',
  textSecondary: '#5D4E47',
  textTertiary: '#8C7E77',
  textDark: '#1A0F0A',
  textMuted: '#9B8D86',
  textLight: '#6B5D56',

  // Border - Subtle warm tones
  border: '#D4CCC6',
  borderLight: '#E2DCD7',
  borderMuted: '#BEB6B0',
  borderGray: '#C9C1BB',

  // States
  error: '#D32F2F',
  errorAlt: '#C62828',
  errorDark: '#B71C1C',
  errorBackground: '#FFEBEE',
  errorBorder: '#FFCDD2',
  success: '#E8F5E9',
  successAccent: '#2E7D32',

  // Overlays
  overlay: 'rgba(44, 24, 16, 0.5)',

  // Misc
  white: '#FFFFFF',
  placeholder: '#9B8D86',

  // Accent colors for variety
  accentTeal: '#0D9488',
  accentForest: '#1B4332',

  // Highlight colors (for selected items, today indicators, etc.)
  highlightBackground: '#FFF1EC', // very light tint of primary for subtle highlights
} as const;

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 80,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 28,
} as const;

export const typography = {
  // Font families - IBM Plex Sans for distinctive, technical aesthetic
  // Loaded via expo-google-fonts in App.tsx
  //
  // Usage in React Native StyleSheet:
  // For maximum compatibility, continue using fontWeight with the weights below.
  // The custom fonts will be automatically applied via the loaded font family.
  //
  // Advanced usage (if needed):
  // Use fontFamily directly for specific weights:
  //   { fontFamily: typography.families.semibold, fontSize: typography.sizes.md }
  //
  families: {
    extralight: 'IBMPlexSans-ExtraLight',
    light: 'IBMPlexSans-Light',
    regular: 'IBMPlexSans-Regular',
    medium: 'IBMPlexSans-Medium',
    semibold: 'IBMPlexSans-SemiBold',
    bold: 'IBMPlexSans-Bold',
  },
  sizes: {
    // Extreme size jumps (3x+ contrast) for visual hierarchy
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 22, // 1.4x jump
    xl: 32, // 2x jump
    xxl: 48, // 1.5x jump
    xxxl: 64, // 1.3x jump
    display: 96, // 1.5x jump - for hero text
  },
  weights: {
    // Extreme weight contrasts (200 vs 800, not 400 vs 600)
    // Note: In React Native with custom fonts, use fontFamily instead of fontWeight
    extralight: '200' as const,
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
