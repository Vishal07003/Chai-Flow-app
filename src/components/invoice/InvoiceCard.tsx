import React from 'react';
import Card from '../common/Card';

export interface InvoiceCardProps {
  name: string;
  amount: string;
  due: string;
  initials?: string;
  isOverdue?: boolean;
  onPress?: () => void;
}

export default function InvoiceCard({
  name,
  amount,
  due,
  initials,
  isOverdue = false,
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

  const overdue = isOverdue || due.toLowerCase().includes('overdue');

  return (
    <Card
      title={name}
      subtitle={due}
      initials={displayInitials}
      amount={amount}
      amountColor="#602816"
      badge={overdue ? 'OVERDUE' : undefined}
      badgeBgColor="#FEE2E2"
      badgeTextColor="#A62B2B"
      onPress={onPress}
    />
  );
}
