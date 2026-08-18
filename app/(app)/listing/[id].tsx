import { useLocalSearchParams } from 'expo-router';

import { ListingFormScreen } from '@/screens/ListingFormScreen';

export default function EditListingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ListingFormScreen productId={id} />;
}
