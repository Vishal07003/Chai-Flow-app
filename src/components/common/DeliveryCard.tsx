import React from 'react';
import Card from './Card';
import { DeliveryBoyItem } from '../../types/delivery';

export interface DeliveryCardProps {
  partner: DeliveryBoyItem;
  onPress?: (partner: DeliveryBoyItem) => void;
}

export default function DeliveryCard({ partner, onPress }: DeliveryCardProps) {
  const { name, phone, status, avatarUrl, vehicleType, vehicleModel } = partner;

  const isBusy = status === 'BUSY';
  const isReady = status === 'READY';
  const vehicleInfo = vehicleType || vehicleModel ? `• ${vehicleType || vehicleModel}` : '';

  return (
    <Card
      title={name}
      subtitle={`${phone || ''} ${vehicleInfo}`.trim()}
      avatarUrl={avatarUrl}
      initials={name.slice(0, 2).toUpperCase()}
      badge={status}
      badgeBgColor={isBusy ? '#FEF3C7' : isReady ? '#D1FAE5' : '#F1F5F9'}
      badgeTextColor={isBusy ? '#D97706' : isReady ? '#059669' : '#64748B'}
      onPress={onPress ? () => onPress(partner) : undefined}
    />
  );
}
