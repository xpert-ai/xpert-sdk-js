// Wire types mirror @xpert-ai/chatkit-types; keep their contract tests aligned.
/** Stable provider references; credentials, temporary URLs and bytes never enter messages. */
export interface ResourceCardFileReference {
  viewKey: string;
  fileKey: string;
  targetId: string;
}

export interface ResourceCardFile {
  id: string;
  title: string;
  description?: string;
  file: ResourceCardFileReference;
}

export interface ResourceCardImage {
  id: string;
  title: string;
  alt?: string;
  file: ResourceCardFileReference;
}

export interface ResourceCardField {
  label: string;
  value: string;
}

/** Ordered presentation blocks, independent of the business resource's type. */
export type ResourceCardContent = { title?: string } & (
  | { kind: 'image-gallery'; images: ResourceCardImage[] }
  | { kind: 'file-list'; files: ResourceCardFile[] }
  | { kind: 'fields'; fields: ResourceCardField[] }
);
