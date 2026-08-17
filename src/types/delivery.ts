export interface DeliveryBoyItem {
  id: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  licenseNumber?: string;
  vehicleType?: 'Scooter' | 'E-Bike' | 'Auto Cargo' | 'Mini Van';
  vehicleModel?: string;
  numberPlate?: string;
  numberPlatePhotoUri?: string;
  licensePhotoUri?: string;
  status: 'BUSY' | 'READY' | 'OFFLINE';
  location: string;
  distance?: string;
  avatarUrl?: string;
  progress?: number;
}

export interface ScheduleItem {
  id: string;
  timeSlot: string;
  title: string;
  customerName: string;
  address: string;
  deliveryBoy: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  itemsCount: number;
}
