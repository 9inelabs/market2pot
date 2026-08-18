import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';

const MAX_DIMENSION = 1024;
const COMPRESS_QUALITY = 0.7;

async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const image = await context.resize({ width: MAX_DIMENSION }).renderAsync();
  const result = await image.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

// Uploads to the `product-photos` bucket at {userId}/{timestamp}.jpg — one
// object per photo (not overwritten like the avatar's fixed path), since a
// farmer can have many product photos at once. Reads the compressed file
// via expo-file-system's File class, not fetch().arrayBuffer() — that
// pattern silently produced a corrupt ~14-byte file for avatar uploads (see
// docs/reports/05-farmer-signup.md's post-review fixes) and was never a
// reliable way to read a local file:// URI's bytes in React Native.
export async function uploadProductPhoto(userId: string, localUri: string): Promise<string> {
  const compressedUri = await compressImage(localUri);
  const arrayBuffer = await new File(compressedUri).arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('product-photos').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return data.publicUrl;
}
