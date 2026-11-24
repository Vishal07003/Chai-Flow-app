// Chai Flow Executive Ledger Design System - Shadows with Chai Warmth
import { Platform } from 'react-native';

export const shadows = {
  sm: {
    ...Platform.select({
      ios: {
        shadowColor: '#8C331A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  md: {
    ...Platform.select({
      ios: {
        shadowColor: '#8C331A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  lg: {
    ...Platform.select({
      ios: {
        shadowColor: '#8C331A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  none: {
    ...Platform.select({
      ios: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
};

export default shadows;
