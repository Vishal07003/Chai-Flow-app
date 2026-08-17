import React from 'react';
import Card from './Card';
import { Customer } from '../../types/customer';

export interface CustomerCardProps {
  customer: Customer;
  onPress?: (customer: Customer) => void;
}

export default function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const { name, address, amount, badge, avatarUrl, initials } = customer;

  return (
    <Card
      title={name}
      subtitle={address}
      avatarUrl={avatarUrl}
      initials={initials || name.slice(0, 2).toUpperCase()}
      amount={amount}
      amountColor={amount === 0 ? '#10B981' : '#8C331A'}
      badge={badge}
      onPress={onPress ? () => onPress(customer) : undefined}
    />
  );
}
