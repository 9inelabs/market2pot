import * as Location from 'expo-location';

export type ResolvedAddress = {
  addressLine: string;
  state: string | null;
  lga: string | null;
  latitude: number;
  longitude: number;
};

// Nigeria's LGA (Local Government Area) tier doesn't map perfectly onto the
// iOS/Android geocoder's generic address fields — `subregion` is the
// closest available approximation.
export async function detectCurrentAddress(): Promise<ResolvedAddress | null> {
  const position = await Location.getCurrentPositionAsync({});
  const [result] = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });

  if (!result) {
    return null;
  }

  const streetPart = [result.streetNumber, result.street].filter(Boolean).join(' ');
  const addressLine = [streetPart, result.city].filter(Boolean).join(', ') || streetPart || result.city || '';

  return {
    addressLine,
    state: result.region,
    lga: result.subregion,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
