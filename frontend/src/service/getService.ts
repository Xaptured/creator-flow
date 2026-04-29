import browserAxiosClient from '@/lib/http/browserAxiosClient';
import { MediaFile } from '@/lib/response/media';

export async function getMediaFile(mediaId: string): Promise<MediaFile> {
  const { data } = await browserAxiosClient.get<MediaFile>(`/api/media/${mediaId}`);
  return data;
}
