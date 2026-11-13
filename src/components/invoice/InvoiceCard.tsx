import React from 'react';
import Card from '../common/Card';

export interface InvoiceCardProps {
  name: string;
  amount: string;
  due: string;
  invoiceNo?: string;
  initials?: string;
  isOverdue?: boolean;
  status?: string;
  onPress?: () => void;
}

export default function InvoiceCard({
  name,
  amount,
  due,
  invoiceNo,
  initials,
  isOverdue = false,
  status,
  onPress,
}: InvoiceCardProps) {
  const displayInitials =
    initials ||
    name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const isPaid = status === 'PAID' || status === 'paid';
  const overdue = !isPaid && (isOverdue || due.toLowerCase().includes('overdue'));

  const subtitleText = invoiceNo ? `${invoiceNo} • ${due}` : due;

  return (
    <Card
      title={name}
      subtitle={subtitleText}
      initials={displayInitials}
      amount={amount}
      amountColor={isPaid ? '#059669' : '#8C331A'}
      badge={isPaid ? 'PAID' : overdue ? 'OVERDUE' : 'PENDING'}
      badgeBgColor={isPaid ? '#ECFDF5' : overdue ? '#FEE2E2' : '#FFFBEB'}
      badgeTextColor={isPaid ? '#059669' : overdue ? '#DC2626' : '#D97706'}
      onPress={onPress}
    />
  );
}
