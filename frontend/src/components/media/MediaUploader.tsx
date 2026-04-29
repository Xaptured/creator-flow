'use client';

import { useRef, useState } from 'react';
import { ApiError } from '@/lib/response/error';
import { MediaFile } from '@/lib/response/media';
import { toApiError } from '@/service/errorService';
import { confirmUpload, requestUploadUrl } from '@/service/postService';
import { uploadToS3 } from '@/service/putService';

type UploadState =
  | { phase: 'idle' }
  | { phase: 'requesting' }
  | { phase: 'uploading'; percent: number }
  | { phase: 'confirming' }
  | { phase: 'done'; media: MediaFile }
  | { phase: 'error'; error: ApiError };

export default function MediaUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ phase: 'idle' });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setState({ phase: 'requesting' });
      const { mediaId, presignedUrl } = await requestUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setState({ phase: 'uploading', percent: 0 });
      await uploadToS3(presignedUrl, file, (percent) =>
        setState({ phase: 'uploading', percent })
      );

      setState({ phase: 'confirming' });
      const media = await confirmUpload({ mediaId });

      setState({ phase: 'done', media });
    } catch (err) {
      setState({ phase: 'error', error: toApiError(err) });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function reset() {
    setState({ phase: 'idle' });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 p-6 max-w-md">
      <h2 className="text-lg font-semibold mb-4">Upload Media</h2>

      {state.phase === 'idle' && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          <span className="text-sm text-gray-500">Click to select a file</span>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      {state.phase === 'requesting' && (
        <p className="text-sm text-gray-500">Preparing upload…</p>
      )}

      {state.phase === 'uploading' && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Uploading… {state.percent}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-150"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === 'confirming' && (
        <p className="text-sm text-gray-500">Finalising…</p>
      )}

      {state.phase === 'done' && (
        <div>
          <p className="text-sm text-green-600 font-medium mb-1">✓ Upload complete</p>
          <p className="text-xs text-gray-500">{state.media.originalName}</p>
          <p className="text-xs text-gray-400">
            {state.media.mimeType} · {(state.media.sizeBytes / 1024 / 1024).toFixed(2)} MB
          </p>
          <button onClick={reset} className="mt-3 text-sm text-blue-600 hover:underline">
            Upload another
          </button>
        </div>
      )}

      {state.phase === 'error' && (
        <div>
          <p className="text-sm text-red-600 mb-1">✗ {state.error.message}</p>
          <p className="text-xs text-gray-400">Code: {state.error.code}</p>
          <button onClick={reset} className="mt-2 text-sm text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
