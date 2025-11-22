# Phase 7: Image Upload System with Metadata Extraction

## Overview

Created complete image upload system with:

- API endpoint for authenticated image uploads
- Automatic dimension extraction (pure TypeScript, no external deps)
- File signature validation (magic bytes)
- Supabase Storage integration
- Comprehensive validation with Zod schemas

## Files Created

### 1. API Endpoint

`src/routes/api/exercises/images/+server.ts`

**POST /api/exercises/images**

- Authentication required (teachers/admins only)
- Validates: file type, size (5MB max), signature, dimensions (10000px max)
- Uploads to Supabase Storage bucket `exercise-images`
- Returns full metadata including dimensions

### 2. Dimension Extractor Service

`src/lib/exercises/services/image-dimension-extractor.ts`

Pure TypeScript implementation supporting:

- **PNG**: Reads IHDR chunk
- **JPEG**: Parses SOF markers
- **GIF**: Logical screen descriptor
- **WebP**: VP8/VP8L/VP8X formats
- **SVG**: Parses viewBox and width/height attributes

```typescript
export function extractImageDimensions(buffer: ArrayBuffer): ImageDimensions | null;
export function extractImageDimensionsFromBase64(base64: string): ImageDimensions | null;
```

### 3. Validation Schemas

`src/lib/server/validation/image-upload.ts`

```typescript
export const imageFileMetadataSchema = z.object({
	filename: z.string().min(1).max(255),
	size: z.number().int().positive().max(MAX_FILE_SIZE),
	mimeType: z.enum(ALLOWED_MIME_TYPES)
});

export const imageUploadResponseSchema = z.object({
	success: z.literal(true),
	data: z.object({
		url: z.string().url(),
		width: z.number().int().positive(),
		height: z.number().int().positive(),
		aspectRatio: z.number().positive(),
		filename: z.string(),
		size: z.number().int().positive(),
		mimeType: z.string()
	})
});
```

### 4. Tests

- `src/lib/exercises/services/image-dimension-extractor.test.ts` (32 tests)
- `src/lib/server/validation/image-upload.test.ts` (46 tests)

## Response Format

```typescript
// Success
{
  success: true,
  data: {
    url: "https://xxx.supabase.co/storage/v1/object/public/exercise-images/...",
    width: 800,
    height: 600,
    aspectRatio: 1.333,
    filename: "diagram.png",
    size: 45678,
    mimeType: "image/png"
  }
}

// Error
{
  success: false,
  error: "File size exceeds 5MB limit"
}
```

## Security Features

| Feature        | Implementation                      |
| -------------- | ----------------------------------- |
| Authentication | Required (teacher/admin role)       |
| File Type      | Whitelist: jpg, png, gif, webp, svg |
| File Signature | Magic bytes validation              |
| File Size      | Max 5MB                             |
| Dimensions     | Max 10,000px per side               |
| Path Injection | Sanitized filename                  |

## Magic Bytes Validation

| Format | Signature                   |
| ------ | --------------------------- |
| PNG    | `89 50 4E 47`               |
| JPEG   | `FF D8 FF`                  |
| GIF    | `47 49 46 38`               |
| WebP   | `52 49 46 46...57 45 42 50` |
| SVG    | `<svg` or `<?xml`           |

## Usage Example

```typescript
// Client-side upload
async function uploadExerciseImage(file: File) {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('/api/exercises/images', {
		method: 'POST',
		body: formData
	});

	const result = await response.json();

	if (result.success) {
		// Use result.data.url for the image
		// Use result.data.width/height for metadata
		return result.data;
	} else {
		throw new Error(result.error);
	}
}
```

## Supabase Storage Configuration

**Bucket**: `exercise-images`

**Path Structure**: `{userId}/{timestamp}_{sanitizedFilename}`

Example: `abc123/1700000000000_diagram.png`

**Required RLS Policies**:

```sql
-- Teachers can upload to their own folder
CREATE POLICY "Teachers can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercise-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'exercise-images');
```

## Recovery Instructions

If session crashes during Phase 7:

1. **Check if files exist**:

   ```bash
   ls -la src/routes/api/exercises/images/+server.ts
   ls -la src/lib/exercises/services/image-dimension-extractor.ts
   ls -la src/lib/server/validation/image-upload.ts
   ```

2. **Run tests**:
   ```bash
   pnpm test:unit -- src/lib/exercises/services/image-dimension-extractor.test.ts
   pnpm test:unit -- src/lib/server/validation/image-upload.test.ts
   ```

## Dependencies

- Phase 1: `ImageNode` type with `originalWidth`, `originalHeight`
- Supabase Storage bucket must exist

## Next Phase

Phase 8: Teacher UI for image management:

- Image upload component
- Image selector/browser
- Size class picker
- Alignment controls
- Caption input
