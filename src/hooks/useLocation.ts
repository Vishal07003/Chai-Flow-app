import { useState, useEffect } from 'react';
import { requestLocationPermission } from '../utils/permissions';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationCoords | null>({
    latitude: 28.6139,
    longitude: 77.209,
  });
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    const initLocation = async () => {
      const granted = await requestLocationPermission();
      setHasPermission(granted);
    };
    initLocation();
  }, []);

  return { location, hasPermission, setLocation };
};

export default useLocation;
