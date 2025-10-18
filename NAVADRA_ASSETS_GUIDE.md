# Navadra Assets Guide

This guide explains how to manage and use game assets (monsters, spells, characters, maps) in the Navadra educational game system.

## Overview

All Navadra game assets are stored **locally in the project** under `static/game/`. This provides:

- **Fast loading** - No external API calls or storage dependencies
- **Version control** - Assets tracked in git alongside code
- **Reliability** - No network failures or storage quotas
- **Simplicity** - Direct file paths, no upload/download complexity

## Directory Structure

```
static/game/
├── monsters/           # Monster sprites and icons
│   ├── monstre_1.png
│   ├── monstre_2.png
│   └── ...
├── spells/             # Spell icons by element
│   ├── feu_1.png      # Fire spells (1-7)
│   ├── eau_8.png      # Water spells (8-14)
│   ├── vent_15.png    # Wind spells (15-21)
│   ├── terre_22.png   # Earth spells (22-28)
│   └── ...
├── characters/         # Player character sprites
│   ├── player1.webp
│   ├── player2.webp
│   └── ...
├── sounds/             # Sound effects and music
│   └── ...
└── ui/                 # UI elements and icons
    └── ...
```

## Asset Management

### Adding New Assets

1. **Place image files** in the appropriate subdirectory under `static/images/navadra/`
2. **Use WebP format** for optimal compression and quality (or PNG/JPG if needed)
3. **Follow naming convention**: lowercase, hyphenated (e.g., `fire-sword.webp`)
4. **Update asset registry** in `src/lib/utils/game/assets.ts`

### Asset Helper Functions

The file `src/lib/utils/game/assets.ts` provides helper functions for accessing game assets:

#### `getGameAssetUrl(category, filename)`

Base function that constructs the URL path for a game asset:

```typescript
/**
 * Generate URL for local game asset
 * @param category - Asset category ('monsters', 'spells', 'characters', 'sounds', 'ui')
 * @param filename - Asset filename with extension
 * @returns Local URL to asset
 */
export function getGameAssetUrl(
	category: 'monsters' | 'spells' | 'characters' | 'sounds' | 'ui',
	filename: string
): string {
	return `/game/${category}/${filename}`;
}
```

**Example:**

```typescript
getGameAssetUrl('monsters', 'monstre_1.png');
// Returns: '/game/monsters/monstre_1.png'
```

#### `getSpellIconUrl(spellNum)`

Gets the URL for a spell icon based on spell number:

```typescript
/**
 * Get spell icon URL
 * @param spellNum - Spell number (1-28)
 * @returns Full URL to spell icon
 */
export function getSpellIconUrl(spellNum: number): string {
	// Automatically maps to correct element:
	// Fire (1-7) → feu_X.png
	// Water (8-14) → eau_X.png
	// Wind (15-21) → vent_X.png
	// Earth (22-28) → terre_X.png
	return getGameAssetUrl('spells', `{element}_${spellNum}.png`);
}
```

**Example:**

```typescript
getSpellIconUrl(1); // Returns: '/game/spells/feu_1.png'
getSpellIconUrl(10); // Returns: '/game/spells/eau_10.png'
```

#### `getMonsterImageUrl(imgUrl)` & `getMonsterHeadUrl(imgHeadUrl)`

Get URLs for monster images and head icons:

```typescript
/**
 * Get monster image URL
 * @param imgUrl - Monster image path from database (e.g., 'monstre_1.png')
 * @returns Full URL to monster image
 */
export function getMonsterImageUrl(imgUrl: string): string {
	return getGameAssetUrl('monsters', imgUrl);
}

/**
 * Get monster head icon URL
 * @param imgHeadUrl - Monster head icon path (e.g., 'monstre_1_head.png')
 * @returns Full URL to monster head icon
 */
export function getMonsterHeadUrl(imgHeadUrl: string): string {
	return getGameAssetUrl('monsters', imgHeadUrl);
}
```

**Example:**

```typescript
getMonsterImageUrl('monstre_1.png'); // Returns: '/game/monsters/monstre_1.png'
getMonsterHeadUrl('monstre_1_head.png'); // Returns: '/game/monsters/monstre_1_head.png'
```

## Using Assets in Components

### Basic Image Display

```svelte
<script>
	import { getSpellIconUrl, getMonsterImageUrl } from '$lib/utils/game/assets';
</script>

<!-- Spell icon -->
<img src={getSpellIconUrl(1)} alt="Fire Spell 1" class="h-20 w-20" />

<!-- Monster sprite -->
<img src={getMonsterImageUrl('monstre_1.png')} alt="Monster 1" class="h-32 w-32" />
```

### Dynamic Spell Display (Grimoire Example)

```svelte
<script>
	import { getSpellIconUrl } from '$lib/utils/game/assets';

	// From database query
	let spells = [
		{ spell_num: 1, element: 'fire', power: 25, level: 1 },
		{ spell_num: 8, element: 'water', power: 22, level: 1 },
		{ spell_num: 15, element: 'wind', power: 24, level: 1 }
	];
</script>

{#each spells as spell}
	<div class="spell-card">
		<img src={getSpellIconUrl(spell.spell_num)} alt="Spell {spell.spell_num}" class="h-20 w-20" />
		<p>Power: {spell.power}</p>
		<p>Level: {spell.level}</p>
	</div>
{/each}
```

### Preloading Assets

For better performance, preload critical assets:

```svelte
<script>
	import { getSpellIconUrl, getMonsterImageUrl } from '$lib/utils/game/assets';
</script>

<svelte:head>
	<!-- Preload first few spells for grimoire -->
	<link rel="preload" as="image" href={getSpellIconUrl(1)} />
	<link rel="preload" as="image" href={getSpellIconUrl(2)} />

	<!-- Preload monster for combat -->
	<link rel="preload" as="image" href={getMonsterImageUrl('monstre_1.png')} />
</svelte:head>
```

## Asset Types and Specifications

### Spells

**Purpose:** Combat spell icons for the grimoire and battle system
**Location:** `static/game/spells/`
**Recommended specs:**

- Format: PNG with transparency
- Dimensions: 128x128px to 256x256px
- Transparent background
- Icon-style design with elemental theming

**Naming Convention:**
Spells use the pattern `{element}_{number}.png` where element is in French:

- **Fire (feu):** `feu_1.png` through `feu_7.png` (spell numbers 1-7)
- **Water (eau):** `eau_8.png` through `eau_14.png` (spell numbers 8-14)
- **Wind (vent):** `vent_15.png` through `vent_21.png` (spell numbers 15-21)
- **Earth (terre):** `terre_22.png` through `terre_28.png` (spell numbers 22-28)

**Helper Function:**
The `getSpellIconUrl()` function automatically maps spell numbers to the correct element-based filenames:

```typescript
import { getSpellIconUrl } from '$lib/utils/game/assets';

// Spell #1 (Fire) → '/game/spells/feu_1.png'
const spell1 = getSpellIconUrl(1);

// Spell #10 (Water) → '/game/spells/eau_10.png'
const spell10 = getSpellIconUrl(10);

// Spell #15 (Wind) → '/game/spells/vent_15.png'
const spell15 = getSpellIconUrl(15);

// Spell #22 (Earth) → '/game/spells/terre_22.png'
const spell22 = getSpellIconUrl(22);
```

**Example Usage in Components:**

```svelte
<script>
	import { getSpellIconUrl } from '$lib/utils/game/assets';

	let spell = { spell_num: 8, element: 'water', power: 25 };
</script>

<img src={getSpellIconUrl(spell.spell_num)} alt="Spell {spell.spell_num}" class="h-20 w-20" />
```

**Additional Files:**
Some spells have additional variants:

- `{element}_{number}_graphisme.png` - High-detail graphical version
- `{element}_{number}_nb.png` - Black and white version
- `base_0.png` - Fallback for unknown spell numbers

### Monsters

**Purpose:** Enemy sprites and head icons
**Location:** `static/game/monsters/`
**Recommended specs:**

- Format: PNG with transparency
- Full sprite: 256x256px to 512x512px
- Head icon: 128x128px
- Transparent background

**Naming Convention:**

- Full sprites: `monstre_1.png`, `monstre_2.png`, etc.
- Head icons: `monstre_1_head.png`, `monstre_2_head.png`, etc.

**Helper Functions:**

```typescript
import { getMonsterImageUrl, getMonsterHeadUrl } from '$lib/utils/game/assets';

// Monster full sprite
const monsterImage = getMonsterImageUrl('monstre_1.png');

// Monster head icon
const monsterHead = getMonsterHeadUrl('monstre_1_head.png');
```

### Characters

**Purpose:** Player avatars, NPCs, enemies
**Recommended specs:**

- Format: WebP (fallback: PNG with transparency)
- Dimensions: 256x256px to 512x512px
- Transparent background
- Centered sprite

**Naming:**

- `player1.webp`, `player2.webp` - Playable characters
- `npc-teacher.webp` - Non-player characters
- `enemy-dragon.webp` - Enemies/monsters

### Items

**Purpose:** Collectibles, rewards, power-ups
**Recommended specs:**

- Format: WebP (fallback: PNG)
- Dimensions: 64x64px to 128x128px
- Transparent background
- Icon-style design

**Naming:**

- `coin.webp`, `gem.webp` - Currencies
- `potion-health.webp`, `potion-mana.webp` - Consumables
- `key-gold.webp`, `key-silver.webp` - Quest items

### Maps

**Purpose:** Game world backgrounds, level screens
**Recommended specs:**

- Format: WebP (fallback: JPG)
- Dimensions: 1920x1080px or higher
- Optimized for web (< 500KB)
- Landscape orientation

**Naming:**

- `map1.webp`, `map2.webp` - World maps
- `level-forest.webp`, `level-cave.webp` - Level backgrounds
- `tutorial-intro.webp` - Tutorial screens

## Image Optimization

### Converting to WebP

Use tools like `cwebp` to convert images:

```bash
# Install cwebp (macOS)
brew install webp

# Convert PNG to WebP
cwebp -q 80 input.png -o output.webp

# Batch convert all PNGs in directory
for file in *.png; do
  cwebp -q 80 "$file" -o "${file%.png}.webp"
done
```

### Online Tools

- [Squoosh](https://squoosh.app/) - Google's image compression tool
- [TinyPNG](https://tinypng.com/) - PNG/JPG compression
- [CloudConvert](https://cloudconvert.com/webp-converter) - WebP converter

### Quality Guidelines

- **Characters/Items:** 80-90% quality (preserve details)
- **Maps/Backgrounds:** 70-80% quality (larger files, can compress more)
- **Target file size:**
  - Icons/Items: < 50KB
  - Characters: < 200KB
  - Maps: < 500KB

## TypeScript Types

### Asset Categories

```typescript
type AssetCategory = 'characters' | 'items' | 'maps';
type AssetType = 'character' | 'item' | 'map' | 'unknown';
```

### Character Keys

```typescript
type CharacterKey = keyof typeof CHARACTERS;
// 'player1' | 'player2' | ...
```

### Item Keys

```typescript
type ItemKey = keyof typeof ITEMS;
// 'coin' | 'gem' | ...
```

### Map Keys

```typescript
type MapKey = keyof typeof MAPS;
// 'map1' | 'map2' | ...
```

## Database Integration

### Student Inventory

Students' collected items are stored in the `student_items` table:

```sql
CREATE TABLE student_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,  -- References ITEMS registry (e.g., 'coin')
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMPTZ DEFAULT now()
);
```

**Example query:**

```typescript
// Get student's items
const { data: items } = await supabase
	.from('student_items')
	.select('item_key, quantity')
	.eq('student_id', studentId);

// Display items with images
items.forEach((item) => {
	const imageUrl = ITEMS[item.item_key];
	console.log(`${item.quantity}x ${item.item_key}: ${imageUrl}`);
});
```

### Character Selection

Students' selected character is stored in the `profiles` table:

```sql
ALTER TABLE profiles
ADD COLUMN selected_character TEXT DEFAULT 'player1';
```

**Example usage:**

```typescript
// Get student's character
const { data: profile } = await supabase
	.from('profiles')
	.select('selected_character')
	.eq('id', studentId)
	.single();

const characterUrl = CHARACTERS[profile.selected_character];
```

## Best Practices

### 1. Asset Naming

✅ **Good:**

- `player1.webp`, `player2.webp`
- `potion-health.webp`, `potion-mana.webp`
- `level-forest.webp`

❌ **Bad:**

- `Player 1.webp` (spaces)
- `COIN.WEBP` (uppercase)
- `item_123.webp` (non-descriptive)

### 2. Registry Organization

✅ **Good:**

```typescript
export const ITEMS = {
	// Currencies
	coin: getAssetUrl('items', 'coin'),
	gem: getAssetUrl('items', 'gem'),

	// Potions
	potionHealth: getAssetUrl('items', 'potion-health'),
	potionMana: getAssetUrl('items', 'potion-mana')
} as const;
```

❌ **Bad:**

```typescript
export const ITEMS = {
	coin: '/images/navadra/items/coin.webp', // Hardcoded path
	gem: getAssetUrl('items', 'gem'),
	x: getAssetUrl('items', 'mystery') // Non-descriptive key
};
```

### 3. Type Safety

✅ **Good:**

```typescript
function displayItem(itemKey: ItemKey) {
	const url = ITEMS[itemKey]; // Type-safe
	return `<img src="${url}" />`;
}
```

❌ **Bad:**

```typescript
function displayItem(itemKey: string) {
	const url = ITEMS[itemKey]; // May be undefined
	return `<img src="${url}" />`;
}
```

### 4. Fallback Images

Always provide alt text and consider error handling:

```svelte
<script>
	import { CHARACTERS } from '$lib/utils/game/assets';

	let imageError = $state(false);
</script>

<img src={CHARACTERS.player1} alt="Player character" onerror={() => (imageError = true)} />

{#if imageError}
	<div class="rounded bg-muted p-4">Image failed to load</div>
{/if}
```

## Migration from External Storage

If you previously used Supabase Storage or external URLs, here's how to migrate:

### 1. Download Assets

```bash
# Create local directory
mkdir -p static/images/navadra/{characters,items,maps}

# Download from Supabase (example)
# Replace with your actual bucket/paths
supabase storage download navadra/characters/* static/images/navadra/characters/
```

### 2. Update Registry

Replace external URLs with local paths:

```typescript
// Before (external storage)
export const CHARACTERS = {
	player1: 'https://storage.supabase.co/.../player1.webp'
};

// After (local storage)
export const CHARACTERS = {
	player1: getAssetUrl('characters', 'player1')
};
```

### 3. Update Database References

If you stored full URLs in the database, migrate to keys:

```sql
-- Before: Full URLs in database
-- student_items.item_url = 'https://storage.supabase.co/.../coin.webp'

-- After: Keys only
-- student_items.item_key = 'coin'
-- Look up URL in ITEMS registry at runtime
```

## Testing

### Visual Regression Testing

Use Playwright to test asset rendering:

```typescript
// e2e/assets.test.ts
import { test, expect } from '@playwright/test';

test('character images load correctly', async ({ page }) => {
	await page.goto('/game/character-select');

	const img = page.locator('img[alt="Player 1"]');
	await expect(img).toBeVisible();
	await expect(img).toHaveAttribute('src', /\/images\/navadra\/characters\/player1\.webp/);
});
```

### Asset Inventory Check

Create a script to verify all registry entries have corresponding files:

```typescript
// scripts/check-assets.ts
import { CHARACTERS, ITEMS, MAPS } from '$lib/utils/game/assets';
import { existsSync } from 'fs';

function checkAssets(registry: Record<string, string>, name: string) {
	const missing: string[] = [];

	Object.entries(registry).forEach(([key, path]) => {
		const filePath = `static${path}`;
		if (!existsSync(filePath)) {
			missing.push(`${name}.${key} -> ${filePath}`);
		}
	});

	return missing;
}

const missingCharacters = checkAssets(CHARACTERS, 'CHARACTERS');
const missingItems = checkAssets(ITEMS, 'ITEMS');
const missingMaps = checkAssets(MAPS, 'MAPS');

const allMissing = [...missingCharacters, ...missingItems, ...missingMaps];

if (allMissing.length > 0) {
	console.error('Missing assets:');
	allMissing.forEach((m) => console.error(`  - ${m}`));
	process.exit(1);
} else {
	console.log('✅ All assets present');
}
```

Run with:

```bash
pnpm tsx scripts/check-assets.ts
```

## Troubleshooting

### Assets Not Loading

**Symptom:** Images show broken/missing
**Solutions:**

1. Check file exists in `static/images/navadra/`
2. Verify filename matches registry (case-sensitive)
3. Check browser console for 404 errors
4. Ensure file extension is `.webp` (or update registry)

### Slow Loading

**Symptom:** Images load slowly
**Solutions:**

1. Compress images (see optimization section)
2. Use WebP format instead of PNG/JPG
3. Implement lazy loading for off-screen images
4. Preload critical assets in `<svelte:head>`

### Type Errors

**Symptom:** TypeScript errors with asset keys
**Solutions:**

1. Use typed keys: `CharacterKey`, `ItemKey`, `MapKey`
2. Ensure registry uses `as const` assertion
3. Import types from `$lib/utils/game/assets`

## Future Enhancements

Potential improvements to the asset system:

1. **Sprite Sheets** - Combine multiple sprites into single files
2. **Asset Versioning** - Cache busting for updated assets
3. **Lazy Loading** - Load assets on-demand with IntersectionObserver
4. **Image Resizing** - Generate multiple sizes for responsive images
5. **Asset Bundles** - Group related assets for batch loading
6. **CDN Integration** - Optionally serve from CDN for production

## Related Documentation

- [NAVADRA_IMPLEMENTATION_COMPLETE.md](./NAVADRA_IMPLEMENTATION_COMPLETE.md) - Full implementation details
- [NAVADRA_PHASE1_IMPLEMENTATION.md](./NAVADRA_PHASE1_IMPLEMENTATION.md) - Phase 1 features
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database schema including student_items table

## Summary

The Navadra asset system is designed for:

- **Simplicity** - Direct file paths, no external dependencies
- **Performance** - Local storage, optimized WebP images
- **Type Safety** - TypeScript registry with const assertions
- **Maintainability** - Centralized registry, clear naming conventions

All assets live in `static/images/navadra/` and are accessed via typed constants in `src/lib/utils/game/assets.ts`.
