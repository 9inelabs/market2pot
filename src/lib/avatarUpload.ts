import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';

const MAX_DIMENSION = 1024;
const COMPRESS_QUALITY = 0.7;

// Compress before upload (max 1024px, 0.7 quality) — build spec section
// 7.6: farmers/consumers are often on slow, metered connections.
async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const image = await context.resize({ width: MAX_DIMENSION }).renderAsync();
  const result = await image.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

// Uploads to the `avatars` bucket at {userId}/avatar.jpg, scoped by RLS to
// the owner (see supabase/migrations/*_avatars_storage_bucket.sql).
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const compressedUri = await compressImage(localUri);
  // `fetch(fileUri).arrayBuffer()` on a local file:// URI is unreliable in
  // React Native — it silently produced a ~14-byte "image" here rather than
  // erroring. expo-file-system's File class reads local file bytes directly.
  const arrayBuffer = await new File(compressedUri).arrayBuffer();
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}
