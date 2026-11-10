import type { IconDefinition } from './schema.js';

/** Decode optional presentation metadata; malformed icons fall back without dropping the resource. */
export function parseIconDefinition(value: unknown): IconDefinition | undefined {
  if (
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    !['image', 'svg', 'font', 'emoji', 'lottie'].some((type) => type === value.type) ||
    !('value' in value) ||
    typeof value.value !== 'string' ||
    !value.value.length ||
    value.value.length > 65536 ||
    ('color' in value && value.color !== undefined && typeof value.color !== 'string') ||
    ('alt' in value && value.alt !== undefined && typeof value.alt !== 'string') ||
    ('size' in value &&
      value.size !== undefined &&
      (typeof value.size !== 'number' || !Number.isFinite(value.size) || value.size <= 0)) ||
    ('style' in value &&
      value.style !== undefined &&
      (!value.style ||
        typeof value.style !== 'object' ||
        Array.isArray(value.style) ||
        !Object.values(value.style).every((item) => typeof item === 'string')))
  )
    return undefined;
  const icon = value as IconDefinition;
  return {
    type: icon.type,
    value: icon.value,
    ...(icon.color !== undefined ? { color: icon.color } : {}),
    ...(icon.alt !== undefined ? { alt: icon.alt } : {}),
    ...(icon.size !== undefined ? { size: icon.size } : {}),
    ...(icon.style !== undefined ? { style: icon.style } : {}),
  };
}
