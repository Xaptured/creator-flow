export interface UploadUrlRequest {
  ownerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ConfirmUploadRequest {
  ownerId: string;
  mediaId: string;
}
