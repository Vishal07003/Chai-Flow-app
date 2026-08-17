import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Loader from './Loader';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

export type ScreenState = 'loading' | 'empty' | 'error' | 'success';

interface ScreenStateViewProps {
  state: ScreenState;
  loadingMessage?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: string;
  errorTitle?: string;
  errorMessage?: string;
  errorIcon?: string;
  onRetry?: () => void;
  containerStyle?: ViewStyle;
  children: React.ReactNode;
}

export default function ScreenStateView({
  state,
  loadingMessage = 'Loading data...',
  emptyTitle = 'No Records Found',
  emptySubtitle = 'There is currently no data to display.',
  emptyIcon = 'file-tray-outline',
  errorTitle = 'Unable to Load Data',
  errorMessage = 'Could not fetch details from the server.',
  errorIcon = 'cloud-offline-outline',
  onRetry,
  containerStyle,
  children,
}: ScreenStateViewProps) {
  if (state === 'loading') {
    return (
      <View style={[styles.center, containerStyle]}>
        <Loader message={loadingMessage} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.center, containerStyle]}>
        <ErrorState
          icon={errorIcon}
          title={errorTitle}
          message={errorMessage}
          onRetry={onRetry}
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={[styles.center, containerStyle]}>
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      </View>
    );
  }

  // 'success' state -> Render actual UI
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
