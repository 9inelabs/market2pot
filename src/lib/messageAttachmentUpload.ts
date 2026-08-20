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

// Uploads a chat image attachment to the `message-attachments` bucket, same
// {userId}/{timestamp}.jpg pattern as productPhotoUpload.ts — the File.
// arrayBuffer() read (not fetch().arrayBuffer()) is load-bearing here too,
// see that module's comment for why.
export async function uploadMessageAttachment(userId: string, localUri: string): Promise<string> {
  const compressedUri = await compressImage(localUri);
  const arrayBuffer = await new File(compressedUri).arrayBuffer();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from('message-attachments').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('message-attachments').getPublicUrl(path);
  return data.publicUrl;
}
