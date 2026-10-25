/** A preview is resolved and authorized in the same request that returns its bytes. */
export interface XpertViewFilePreviewRequest {
  fileKey: string;
  targetId?: string;
  variant?: 'thumbnail' | 'original';
}

export interface XpertViewFilePreviewResult {
  blob: Blob;
  fileName: string;
}

export async function readViewFilePreviewResponse(
  response: Response
): Promise<XpertViewFilePreviewResult> {
  const disposition = response.headers.get('content-disposition') ?? '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const fileName = encoded
    ? decodeURIComponent(encoded)
    : /filename="([^"\r\n]+)"/i.exec(disposition)?.[1];
  if (!fileName || /[/\\\u0000-\u001f\u007f]/.test(fileName)) {
    throw new Error('Invalid image preview filename.');
  }
  const blob = await response.blob();
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(blob.type.split(';')[0].trim())
  ) {
    throw new Error('Invalid image preview content type.');
  }
  return { blob, fileName };
}
