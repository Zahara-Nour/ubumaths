# Public Exercise Viewer with Share Tokens

Public viewing page for exercises with share token support, variation selection, and PDF export.

**Status**: ✅ Production
**Version**: 1.0.0
**Last Updated**: 2025-12-21

---

## Overview

The Public Exercise Viewer allows teachers to share exercises with students and the public through:

- **Public Access**: Exercises marked as `is_public: true` are accessible to anyone
- **Share Tokens**: Private exercises can be shared via 16-character tokens
- **Variation Selection**: Choose between autonomous, intermediate, and guided variations
- **Parameterization**: Generate unique instances with seed-based randomization
- **PDF Export**: Client-side PDF generation via Typst with French academic numbering
- **Shareable Links**: URLs preserve variation and seed state

---

## Features

### 1. Access Control

| Access Type  | Requirement       | URL Format                         |
| ------------ | ----------------- | ---------------------------------- |
| **Public**   | `is_public: true` | `/exercice/[slug]`                 |
| **Token**    | Valid share token | `/exercice/[slug]?token=ABC123...` |
| **Fallback** | UUID as slug      | `/exercice/[uuid]`                 |

### 2. Share Token System

**Token Format**: 16-character alphanumeric (excluding ambiguous characters: `0OIl`)

**Token Properties**:

- `token`: Unique 16-char string
- `exercise_id`: Associated exercise
- `created_by`: Teacher who created token
- `expires_at`: Optional expiration date (NULL = never expires)
- `is_active`: Can be revoked by setting to false
- `access_count`: Tracks number of accesses
- `last_accessed_at`: Last access timestamp

**Database Schema**:

```sql
CREATE TABLE exercise_share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);
```

**RLS Policies**:

- Teachers can manage tokens for their exercises
- Public read access for valid tokens (active + not expired)
- Exercise access via token uses SECURITY DEFINER function to avoid RLS recursion

### 3. Variation Selection

**Default Priority**:

1. `autonomous` (if available)
2. `intermediate` (if available)
3. `guided` (if available)
4. First variation (index 0)

**URL Override**: `?variation=guided` selects specific variation

**UI Labels**:

- `autonomous` → "Version Autonome"
- `intermediate` → "Version Intermédiaire"
- `guided` → "Version Guidée"

### 4. Parameterization & Seed

**Seed Behavior**:

- URL param `?seed=12345` generates deterministic instance
- No seed = random seed generated client-side
- "Régénérer" button creates new seed and updates URL
- Only shown for exercises with variables

**Benefits**:

- Shareable reproducible instances
- Each student can have unique version
- Teachers can verify specific instances

### 5. PDF Export

**Generation**: Client-side via Typst WASM compilation

**Content**:

- Exercise title and metadata (source, difficulty, tags, grade levels)
- Variation label (if applicable)
- Exercise statement (with resolved variables)
- Optional solution (if "Afficher la correction" enabled)

**Formatting**:

- French academic numbering: `1) a) i)` instead of `1. a. i.`
- Proper LaTeX → Typst conversion with nested braces support
- Markdown escape sequences unescaped (`\*` → `*`)
- A4 page, New Computer Modern font, 11pt, French language

**Filename**: `[slug].pdf` or `[uuid].pdf`

### 6. Shareable Links

**Format**: `/exercice/[slug]?variation=autonomous&seed=123456&token=ABC...`

**Preserved State**:

- Current variation selection
- Current seed value
- Token (if present)

**Copy Link Button**:

- Copies full URL to clipboard
- Shows success feedback with checkmark icon
- Toast notification: "Lien copié !"

---

## API Endpoints

### Create Share Token

```http
POST /api/exercises/[id]/share
Content-Type: application/json

{
  "expires_in_days": 30  // optional
}

Response 201:
{
  "data": {
    "id": "uuid",
    "exercise_id": "uuid",
    "token": "ABC123...",
    "created_by": "uuid",
    "created_at": "2025-12-21T...",
    "expires_at": "2026-01-20T...",
    "is_active": true,
    "access_count": 0,
    "last_accessed_at": null
  }
}
```

### List Exercise Tokens

```http
GET /api/exercises/[id]/share

Response 200:
{
  "data": [
    { /* token object */ },
    ...
  ]
}
```

### Revoke Token

```http
DELETE /api/exercises/[id]/share/[tokenId]

Response 200:
{
  "success": true
}
```

---

## Server Functions

**File**: `src/lib/server/exercise-share-tokens.ts`

### `generateShareTokenString()`

Generates a unique 16-character token without ambiguous characters.

### `createShareToken(supabase, exerciseId, userId, expiresInDays?)`

Creates a new share token with optional expiration.

### `getExerciseByShareToken(supabase, token)`

Validates token and retrieves associated exercise.

### `recordTokenAccess(supabase, token)`

Increments access count (fire-and-forget, non-blocking).

### `revokeShareToken(supabase, tokenId)`

Deactivates a token.

### `getExerciseShareTokens(supabase, exerciseId)`

Lists all tokens for an exercise.

### `validateShareToken(supabase, token, exerciseId)`

Validates token for specific exercise.

### `buildShareUrl(baseUrl, exerciseId, token, options?)`

Constructs shareable URL with token and optional params.

---

## Teacher Dashboard Integration

**File**: `src/routes/(protected)/dashboard/teacher/exercises/[id]/+page.svelte`

**Share Dialog Features**:

- "Partager" button in exercise actions
- Create new token with expiration options:
  - Aucune (never expires)
  - 7 jours
  - 30 jours
  - 90 jours
  - 1 an
- List existing tokens with:
  - Creation date
  - Expiration date (or "Jamais")
  - Access count
  - Copy link button (with visual feedback)
  - Revoke button
- Real-time updates after token creation/revocation

---

## Implementation Details

### PDF Generation Flow

1. User clicks "PDF" button
2. Initialize TypstService singleton
3. Generate Typst content via `generateExerciseTypst()`:
   - Resolve variables with seed
   - Convert markdown to Typst AST
   - Add French academic numbering setup
   - Include metadata header
   - Add statement and optional solution
4. Compile Typst → PDF via WASM
5. Create blob and trigger download
6. Show success/error toast

### LaTeX → Typst Conversion

**Challenge**: Nested braces in LaTeX fractions

**Example**:

```latex
\dfrac{(-1)^{n+1}}{u^2_n}
```

**Solution**: Balanced brace parser

```typescript
function parseBalancedBraces(text: string, startPos: number): { content: string; endPos: number } {
	let depth = 0;
	let content = '';
	let i = startPos;

	while (i < text.length) {
		const char = text[i];
		if (char === '{') {
			depth++;
			if (depth > 1) content += char;
		} else if (char === '}') {
			depth--;
			if (depth === 0) return { content, endPos: i };
			content += char;
		} else {
			content += char;
		}
		i++;
	}
	throw new Error('Unbalanced braces in LaTeX fraction');
}
```

**Result**: `frac((-1)^{n+1}, u^2_n)`

### RLS Policy Implementation

**Challenge**: Avoid infinite recursion when checking exercise access via token

**Solution**: SECURITY DEFINER function that bypasses RLS

```sql
CREATE OR REPLACE FUNCTION public.check_exercise_token_access(
    exercise_uuid UUID,
    token_string TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM exercise_share_tokens
        WHERE exercise_id = exercise_uuid
          AND token = token_string
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$;
```

**Policy**:

```sql
CREATE POLICY "Allow exercise access via valid share token"
    ON exercises
    FOR SELECT
    USING (
        auth.uid() IS NULL  -- Allow unauthenticated access
        AND check_exercise_token_access(id, current_setting('request.jwt.claims', true)::json->>'token')
    );
```

### Markdown Escape Handling

**Challenge**: Escaped characters (`\*`, `\_`) appear literally in PDF

**Solution**: Unescape before Typst conversion

```typescript
function unescapeMarkdown(text: string): string {
	return text.replace(/\\([*_`~\[\](){}#+\-.!|\\])/g, '$1').replace(/\\\\/g, '\\');
}
```

---

## Testing

**File**: `src/lib/server/__tests__/exercise-share-tokens.test.ts`

**Coverage**: 23 tests covering:

- Token generation (uniqueness, format, no ambiguous chars)
- Token creation (with/without expiration)
- Exercise retrieval via token
- Token validation (expired, revoked, invalid)
- Access tracking
- Token revocation
- Listing tokens
- URL building

**Test Status**: ✅ 23/23 passing

---

## Known Limitations

1. **Token Access Tracking**: Fire-and-forget (doesn't block on error)
2. **PDF Compilation**: Client-side only (requires browser support for WASM)
3. **Token Uniqueness**: Theoretical collision risk (1 in 52^16 ≈ 1.4 × 10^28)
4. **Expiration Granularity**: Day-level only (no hour/minute)

---

## Future Enhancements

- [ ] Token usage analytics (most accessed exercises)
- [ ] Bulk token creation for classes
- [ ] QR code generation for tokens
- [ ] Token template system (predefined expiration policies)
- [ ] Server-side PDF generation (fallback for unsupported browsers)
- [ ] Custom token aliases (instead of random 16 chars)
- [ ] Token access logs (who accessed when)

---

## Security Considerations

1. **Token Validation**: All inputs validated with Zod schemas
2. **UUID Validation**: UUIDs validated before database queries
3. **Ownership Check**: Only exercise owners can create/revoke tokens
4. **RLS Enforcement**: Row-level security on all tables
5. **SECURITY DEFINER**: Used carefully with explicit `search_path`
6. **Error Messages**: Generic messages to avoid information leakage
7. **Token Revocation**: Soft delete (is_active flag) for audit trail

---

## Related Documentation

- [Exercise Bank](README.md) - Main exercise system documentation
- [Parameterization Guide](parameterization-guide.md) - Variable system details
- [Instance Generator](instance-generator.md) - How instances are generated
- [Typst Generator](../../architecture/typst-pdf-generation.md) - PDF generation architecture

---

## Migration Files

1. `20251221141345_create_exercise_share_tokens.sql` - Initial token table
2. `20251221180000_add_exercise_access_via_token.sql` - Initial RLS policy
3. `20251221181000_fix_exercise_token_rls_recursion.sql` - Fix RLS recursion

---

## Quick Reference

### URL Parameters

| Parameter   | Type   | Description               | Example             |
| ----------- | ------ | ------------------------- | ------------------- |
| `token`     | string | Share token (16 chars)    | `?token=ABC123...`  |
| `variation` | string | Variation label           | `?variation=guided` |
| `seed`      | number | Seed for parameterization | `?seed=123456`      |

### Component States

```svelte
let showSolution = $state(false); // Show/hide solution let selectedVariationIndex = $state(0); //
Current variation let currentSeed = $state(12345); // Current seed let isPdfLoading = $state(false);
// PDF generation state let linkCopied = $state(false); // Copy link feedback
```

### Derived Values

```svelte
const hasVariations = $derived(isVariationsExercise(data.exercise)); const hasVariables =
$derived(/* check for variables */); const currentVariation = $derived(/* get current variation */);
```

---

[← Back to Exercise Bank](README.md)
