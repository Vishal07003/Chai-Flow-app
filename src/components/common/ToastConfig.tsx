import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const toastConfig: ToastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <View style={[styles.card, styles.successCard]}>
      <View style={[styles.iconContainer, styles.successIconBg]}>
        <Ionicons name="checkmark-circle" size={22} color="#059669" />
      </View>
      <View style={styles.textContainer}>
        {props.text1 ? <Text style={styles.titleText}>{props.text1}</Text> : null}
        {props.text2 ? <Text style={styles.messageText}>{props.text2}</Text> : null}
      </View>
    </View>
  ),

  error: (props: ToastConfigParams<any>) => (
    <View style={[styles.card, styles.errorCard]}>
      <View style={[styles.iconContainer, styles.errorIconBg]}>
        <Ionicons name="alert-circle" size={22} color="#DC2626" />
      </View>
      <View style={styles.textContainer}>
        {props.text1 ? <Text style={[styles.titleText, { color: '#991B1B' }]}>{props.text1}</Text> : null}
        {props.text2 ? <Text style={styles.messageText}>{props.text2}</Text> : null}
      </View>
    </View>
  ),

  info: (props: ToastConfigParams<any>) => (
    <View style={[styles.card, styles.infoCard]}>
      <View style={[styles.iconContainer, styles.infoIconBg]}>
        <Ionicons name="information-circle" size={22} color="#8C331A" />
      </View>
      <View style={styles.textContainer}>
        {props.text1 ? <Text style={[styles.titleText, { color: '#8C331A' }]}>{props.text1}</Text> : null}
        {props.text2 ? <Text style={styles.messageText}>{props.text2}</Text> : null}
      </View>
    </View>
  ),

  warning: (props: ToastConfigParams<any>) => (
    <View style={[styles.card, styles.warningCard]}>
      <View style={[styles.iconContainer, styles.warningIconBg]}>
        <Ionicons name="warning" size={22} color="#D97706" />
      </View>
      <View style={styles.textContainer}>
        {props.text1 ? <Text style={[styles.titleText, { color: '#B45309' }]}>{props.text1}</Text> : null}
        {props.text2 ? <Text style={styles.messageText}>{props.text2}</Text> : null}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  card: {
    width: '92%',
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99999,
  },
  successCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF',
  },
  errorCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    borderColor: '#F3D2C7',
    backgroundColor: '#FFFFFF',
  },
  warningCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successIconBg: {
    backgroundColor: '#ECFDF5',
  },
  errorIconBg: {
    backgroundColor: '#FEF2F2',
  },
  infoIconBg: {
    backgroundColor: '#FDF6F3',
  },
  warningIconBg: {
    backgroundColor: '#FFFBEB',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
