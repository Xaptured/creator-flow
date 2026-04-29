import { makeApiError } from '@/lib/response/error';

export function uploadToS3(
  presignedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(makeApiError('S3_UPLOAD_FAILED', xhr.status, `S3 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () =>
      reject(makeApiError('S3_NETWORK_ERROR', 0, 'S3 upload network error'))
    );

    xhr.addEventListener('abort', () =>
      reject(makeApiError('S3_ABORTED', 0, 'S3 upload was aborted'))
    );

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
