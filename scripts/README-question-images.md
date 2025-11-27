# Question Image Migration

This directory contains scripts for migrating question images from PNG to WebP format and uploading to Supabase Storage.

## Overview

- **214 unique images** referenced in old questions system
- **All PNG format** (need conversion to WebP)
- **Target**: Supabase Storage bucket `question-images`
- **Estimated size reduction**: ~70% (WebP compression)

## Prerequisites

### 1. Install Dependencies

```bash
# Install sharp for image conversion (only needed for --execute mode)
pnpm add -D sharp
```

### 2. Obtain Source Images

The image files referenced in `extern/new-tinymath/apps/ubumaths/src/lib/questions/questions.ts` are NOT in this repository. You need to obtain them from one of these sources:

**Option A: Download from Production**

If images are already in Supabase Storage in production:

```bash
# TODO: Add script to download from production storage
```

**Option B: Generate from Source**

If images were generated (e.g., for graphs, number lines):

```bash
# TODO: Add generation script or link to source
```

**Option C: Copy from Backup**

If you have a backup of the old system with images:

```bash
# Copy images to the expected location
mkdir -p static/images/questions
cp -r /path/to/backup/images/* static/images/questions/
```

### 3. Environment Variables

Create or update `.env` with:

```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Create Supabase Storage Bucket

In Supabase Dashboard:

1. Go to Storage
2. Create new bucket: `question-images`
3. Set to **Public** (images need to be accessible)
4. No file size limit (images are small diagrams)

## Usage

### Step 1: Extract Image References

Analyze the old questions.ts file to see what images are needed:

```bash
pnpm tsx scripts/extract-question-image-refs.ts
```

**Output**:

- `scripts/question-images-list.json` - Complete list of all referenced images
- Console report with statistics

### Step 2: Prepare Source Images

Ensure all 214 images from the list are available in one of the configured source directories:

- `static/questions/`
- `static/images/questions/`
- `extern/new-tinymath/apps/ubumaths/public/images/`
- `extern/new-tinymath/apps/ubumaths/static/images/`

The directory structure should match the paths in `question-images-list.json`:

```
static/images/questions/
├── entiers/
│   └── reperage/
│       ├── droite_graduee-10_en_10-0-600.png
│       └── ...
├── fonctions-affines/
│   ├── exemples/
│   │   ├── fonction_affine-0-600.png
│   │   └── ...
│   └── ...
└── ...
```

### Step 3: Dry Run (Preview)

Test the migration without actually uploading:

```bash
pnpm tsx scripts/migrate-question-images.ts --dry-run
```

This will:

- ✅ Find all question images (excluding avatars, logos, etc.)
- ✅ Calculate estimated WebP sizes
- ✅ Show what would be uploaded
- ❌ NOT actually convert or upload anything

### Step 4: Execute Migration

Perform the actual migration:

```bash
pnpm tsx scripts/migrate-question-images.ts --execute
```

This will:

1. **Convert** all PNG images to WebP (quality 85)
2. **Upload** to Supabase Storage bucket `question-images`
3. **Generate** URL mapping file (`scripts/image-url-mapping.json`)
4. **Report** statistics and any errors

**Output**:

- Images uploaded to Supabase Storage
- `scripts/image-url-mapping.json` - Maps old paths to new public URLs
- Console report with upload results and size savings

### Step 5: Use URL Mapping

The generated `image-url-mapping.json` can be used by the question migration transformer to update image references:

```json
{
	"entiers/reperage/droite_graduee-10_en_10-0-600.png": "https://....supabase.co/storage/v1/object/public/question-images/entiers/reperage/droite_graduee-10_en_10-0-600.webp",
	...
}
```

## Scripts

### `extract-question-image-refs.ts`

**Purpose**: Scan old questions.ts and extract all image references

**Usage**:

```bash
pnpm tsx scripts/extract-question-image-refs.ts
```

**Output**:

- `scripts/question-images-list.json`

### `migrate-question-images.ts`

**Purpose**: Convert images to WebP and upload to Supabase Storage

**Usage**:

```bash
# Preview
pnpm tsx scripts/migrate-question-images.ts --dry-run

# Execute
pnpm tsx scripts/migrate-question-images.ts --execute
```

**Flags**:

- `--dry-run` - Preview without changes (no sharp required)
- `--execute` - Actual migration (requires sharp package)

**Features**:

- ✅ Automatic exclusion of non-question images (avatars, logos, etc.)
- ✅ Batch processing (10 images at a time)
- ✅ WebP conversion with quality 85
- ✅ Progress reporting
- ✅ Error handling and retry
- ✅ URL mapping generation

## Configuration

Edit `scripts/migrate-question-images.ts` to customize:

```typescript
const CONFIG = {
	sourceDirs: [...],           // Where to find source images
	bucket: 'question-images',   // Supabase Storage bucket
	quality: 85,                 // WebP quality (0-100)
	effort: 6,                   // WebP compression effort (0-6)
	batchSize: 10,               // Upload batch size
	excludePatterns: [...]       // Patterns to exclude
};
```

## Image Reference Format

**Old Format** (in questions.ts):

```typescript
{
	images: ['entiers/reperage/droite_graduee-10_en_10-0-600.png'],
	// ...
}
```

**New Format** (in migrated questions):

```markdown
![Number line]({{imageBase}}/entiers/reperage/droite_graduee-10_en_10-0-600.webp){size=medium}
```

Where `{{imageBase}}` resolves to the Supabase Storage public URL base.

## Troubleshooting

### "No images found to migrate"

**Cause**: Source images not in expected locations

**Solution**:

1. Run `extract-question-image-refs.ts` to see what images are needed
2. Obtain images (see Prerequisites)
3. Place in correct directory structure

### "sharp package not found"

**Cause**: Sharp not installed

**Solution**:

```bash
pnpm add -D sharp
```

### "Bucket 'question-images' does not exist"

**Cause**: Storage bucket not created

**Solution**:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `question-images`
3. Set to Public

### "Upload failed: storage/object-already-exists"

**Cause**: Image already uploaded (safe to ignore if re-running)

**Solution**: Script uses `upsert: true` to overwrite existing images

## Statistics

Based on analysis of `questions.ts`:

- **Total references**: 277
- **Unique images**: 214
- **Format**: 100% PNG
- **Top directories**:
  - `fonctions-affines/` - 162 images (75%)
  - `polynome-second-degre/` - 60 images (28%)
  - `entiers/reperage/` - 20 images (9%)
  - `relatifs/` - 2 images (1%)

## Next Steps

After migrating images:

1. ✅ Images uploaded to Supabase Storage
2. ⏭️ Update question transformer to use new image URLs
3. ⏭️ Test questions render correctly with new images
4. ⏭️ Delete old PNG images from source (after verification)

## References

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [WebP Format](https://developers.google.com/speed/webp)
- Analysis: `docs/wip/question-migration-analysis.md` (Section 22)
