# Marketplace Developer Guide

> How to extend, modify, and maintain the marketplace and shop systems.

## Quick Reference - Key Files

| Purpose                | File                                             | Key Lines                |
| ---------------------- | ------------------------------------------------ | ------------------------ |
| Marketplace Store      | `src/lib/stores/marketplace.svelte.ts`           | Class: 30, Methods: 666+ |
| Shop Store             | `src/lib/stores/shop.svelte.ts`                  | Class: 20, Methods: 206+ |
| Marketplace Types      | `src/lib/types/marketplace.ts`                   | Interfaces: 17-244       |
| Shop Types             | `src/lib/types/shop.ts`                          | Interfaces: 99-300       |
| Marketplace Validation | `src/lib/validation/marketplace.ts`              | Schemas: 10-278          |
| Shop Validation        | `src/lib/validation/shop.ts`                     | Schemas: 90-493          |
| Listings API           | `src/routes/api/marketplace/listings/+server.ts` | GET/POST handlers        |
| Purchase API           | `src/routes/api/shop/purchase/+server.ts`        | POST: 43-145             |

---

## Adding a New Shop Item Category

### Step 1: Update Type Definitions

**File:** `src/lib/types/shop.ts:18`

```typescript
// Add to ShopItemCategory union type
export type ShopItemCategory =
	| 'consumable'
	| 'booster'
	| 'cosmetic'
	| 'utility'
	| 'your_new_category'; // Add here
```

### Step 2: Update Validation Schema

**File:** `src/lib/validation/shop.ts:10`

```typescript
export const shopItemCategorySchema = z.enum([
	'consumable',
	'booster',
	'cosmetic',
	'utility',
	'your_new_category' // Add here
]);
```

### Step 3: Add Category Filter UI

**File:** `src/lib/components/shop/ShopCategoryFilter.svelte`

```svelte
<script lang="ts">
	const categories = [
		{ value: 'consumable', label: 'Consommables' },
		{ value: 'booster', label: 'Boosters' },
		{ value: 'cosmetic', label: 'Cosmetiques' },
		{ value: 'utility', label: 'Utilitaires' },
		{ value: 'your_new_category', label: 'Votre Categorie' } // Add
	];
</script>
```

### Step 4: Create Items via Migration

**File:** `supabase/migrations/<timestamp>_add_new_category_items.sql`

```sql
INSERT INTO shop_item_templates (
  internal_name, display_name, description,
  category, item_type, rarity, base_price,
  is_active, properties
) VALUES (
  'new_item_name',
  'Nom Affiche',
  'Description en francais',
  'your_new_category',
  'specific_type',
  'common',
  100,
  true,
  '{"effect": "description"}'::jsonb
);
```

---

## Adding a New API Endpoint

### Example: Add `/api/marketplace/favorites`

### Step 1: Create Route File

**File:** `src/routes/api/marketplace/favorites/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// 1. Define validation schema
const addFavoriteSchema = z.object({
	listing_id: z.string().uuid('ID annonce invalide')
});

// 2. GET handler - fetch user's favorites
export const GET: RequestHandler = async ({ locals }) => {
	// Authentication check (required)
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	const { data, error: dbError } = await locals.supabase
		.from('marketplace_favorites')
		.select('*, listing:marketplace_listings(*)')
		.eq('user_id', locals.profile.id);

	if (dbError) {
		throw error(500, 'Erreur lors du chargement des favoris');
	}

	return json({ favorites: data });
};

// 3. POST handler - add favorite
export const POST: RequestHandler = async ({ request, locals }) => {
	// Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// Role check (if needed)
	if (locals.profile.role !== 'student') {
		throw error(403, 'Reserve aux eleves');
	}

	// Validate input with Zod
	const body = await request.json().catch(() => ({}));
	const validation = addFavoriteSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { listing_id } = validation.data;

	// Database operation
	const { error: dbError } = await locals.supabase.from('marketplace_favorites').insert({
		user_id: locals.profile.id,
		listing_id
	});

	if (dbError) {
		if (dbError.code === '23505') {
			throw error(409, 'Deja dans les favoris');
		}
		throw error(500, "Erreur lors de l'ajout");
	}

	return json({ success: true });
};
```

### Step 2: Add Database Table (if needed)

**File:** `supabase/migrations/<timestamp>_add_marketplace_favorites.sql`

```sql
-- Create favorites table
CREATE TABLE marketplace_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see/manage their own favorites
CREATE POLICY "favorites_own" ON marketplace_favorites
  FOR ALL USING (user_id = auth.uid());

-- Index for performance
CREATE INDEX idx_favorites_user ON marketplace_favorites(user_id);
```

### Step 3: Add Store Method

**File:** `src/lib/stores/marketplace.svelte.ts`

```typescript
// Add to MarketplaceStore class
favorites = $state<MarketplaceListing[]>([]);

async addToFavorites(listingId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/marketplace/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId })
    });

    if (!response.ok) {
      const err = await response.json();
      toaster.error(err.message || 'Erreur');
      return false;
    }

    // Optimistic update
    const listing = this.listings.find(l => l.id === listingId);
    if (listing) {
      this.favorites = [...this.favorites, listing];
    }

    toaster.success('Ajoute aux favoris');
    return true;
  } catch {
    toaster.error('Erreur reseau');
    return false;
  }
}
```

---

## Adding Store State & Methods

### Pattern: New State Property

**File:** `src/lib/stores/marketplace.svelte.ts`

```typescript
class MarketplaceStore {
	// 1. Add state property with $state rune
	newFeatureData = $state<NewFeatureType[]>([]);
	isNewFeatureLoading = $state(false);

	// 2. Add derived computation if needed
	get filteredNewFeature() {
		return this.newFeatureData.filter((item) => item.active);
	}

	// 3. Add async method following existing patterns
	async loadNewFeature(): Promise<void> {
		if (this.isNewFeatureLoading) return;
		this.isNewFeatureLoading = true;

		try {
			const response = await fetch('/api/marketplace/new-feature');
			if (!response.ok) throw new Error('Failed to load');

			const data = await response.json();
			this.newFeatureData = data.items;
		} catch (err) {
			console.error('loadNewFeature error:', err);
			toaster.error('Erreur de chargement');
		} finally {
			this.isNewFeatureLoading = false;
		}
	}

	// 4. Add mutation method with optimistic UI
	async updateNewFeature(id: string, updates: Partial<NewFeatureType>): Promise<boolean> {
		// Save current state for rollback
		const previous = [...this.newFeatureData];

		// Optimistic update
		this.newFeatureData = this.newFeatureData.map((item) =>
			item.id === id ? { ...item, ...updates } : item
		);

		try {
			const response = await fetch(`/api/marketplace/new-feature/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) throw new Error('Update failed');
			return true;
		} catch {
			// Rollback on error
			this.newFeatureData = previous;
			toaster.error('Erreur de mise a jour');
			return false;
		}
	}
}
```

---

## Adding Realtime Subscriptions

### Pattern: Subscribe to Table Changes

**File:** `src/lib/stores/marketplace.svelte.ts:130` (in init method)

```typescript
private setupRealtimeSubscriptions(): void {
  // Subscribe to new feature changes
  const newFeatureChannel = this.supabase!
    .channel('new-feature-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'new_feature_table',
        filter: `user_id=eq.${this.userId}`  // Optional filter
      },
      (payload) => this.handleNewFeatureChange(payload)
    )
    .subscribe();

  this.channels.push(newFeatureChannel);
}

private handleNewFeatureChange(payload: RealtimePayload): void {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  switch (eventType) {
    case 'INSERT':
      // Avoid duplicates from optimistic updates
      if (!this.newFeatureData.find(item => item.id === newRecord.id)) {
        this.newFeatureData = [newRecord, ...this.newFeatureData];
      }
      break;

    case 'UPDATE':
      this.newFeatureData = this.newFeatureData.map(item =>
        item.id === newRecord.id ? newRecord : item
      );
      break;

    case 'DELETE':
      this.newFeatureData = this.newFeatureData.filter(
        item => item.id !== oldRecord.id
      );
      break;
  }
}
```

---

## Adding Zod Validation

### Pattern: Complex Schema with Refinements

**File:** `src/lib/validation/marketplace.ts`

```typescript
import { z } from 'zod';

// Base schema with field validation
export const newFeatureSchema = z
	.object({
		// UUID validation
		id: z.string().uuid('ID invalide'),

		// String with length constraints
		title: z.string().min(3, 'Titre minimum 3 caracteres').max(100, 'Titre maximum 100 caracteres'),

		// Optional string
		description: z.string().max(500).optional(),

		// Integer with bounds
		amount: z
			.number()
			.int('Doit etre un entier')
			.min(0, 'Minimum 0')
			.max(10000, 'Maximum 10000')
			.finite('Doit etre fini'),

		// Array with size limit
		items: z.array(z.string().uuid()).max(10, 'Maximum 10 elements'),

		// Enum validation
		status: z.enum(['draft', 'active', 'closed'], {
			errorMap: () => ({ message: 'Statut invalide' })
		}),

		// Coerced types (for query params)
		page: z.coerce.number().int().min(1).default(1)
	})
	// Add cross-field validation
	.refine((data) => data.items.length > 0 || data.amount > 0, {
		message: 'Doit avoir des items ou un montant'
	})
	// Add conditional validation
	.refine((data) => data.status !== 'active' || data.title.length >= 5, {
		message: 'Titre actif doit avoir 5+ caracteres',
		path: ['title']
	});

// Export inferred type
export type NewFeatureData = z.infer<typeof newFeatureSchema>;
```

---

## Adding RLS Policies

### Pattern: Multi-Role Access

**File:** `supabase/migrations/<timestamp>_add_rls_policies.sql`

```sql
-- Enable RLS
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;

-- Students: own data only
CREATE POLICY "new_feature_student_select" ON new_feature_table
  FOR SELECT USING (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

CREATE POLICY "new_feature_student_insert" ON new_feature_table
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  );

-- Teachers: view students in their classes
CREATE POLICY "new_feature_teacher_select" ON new_feature_table
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.student_id = new_feature_table.user_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Admins: full access
CREATE POLICY "new_feature_admin_all" ON new_feature_table
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

---

## Testing Patterns

### Unit Test for Validation Schema

**File:** `src/lib/validation/marketplace.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createListingSchema } from './marketplace';

describe('createListingSchema', () => {
	it('validates valid sell listing', () => {
		const result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'My Listing',
			offered_card_ids: ['uuid-1', 'uuid-2'],
			wanted_gidouilles: 500
		});
		expect(result.success).toBe(true);
	});

	it('rejects empty listing', () => {
		const result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'Empty'
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toContain('offrir ou demander');
	});

	it('rejects title too short', () => {
		const result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'AB',
			offered_gidouilles: 100
		});
		expect(result.success).toBe(false);
	});

	it('rejects gidouilles over limit', () => {
		const result = createListingSchema.safeParse({
			listing_type: 'sell',
			title: 'Valid Title',
			offered_gidouilles: 50000 // Max is 10000
		});
		expect(result.success).toBe(false);
	});
});
```

### Integration Test for API

**File:** `src/routes/api/marketplace/listings/+server.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('GET /api/marketplace/listings', () => {
	it('returns listings for authenticated user', async () => {
		// Mock setup...
	});

	it('returns 401 for unauthenticated request', async () => {
		// Test unauthorized access
	});
});
```

---

## Common Extension Tasks

### Add New Listing Filter

1. Update `ListingsFilter` type in `src/lib/types/marketplace.ts:181`
2. Add query param to `listingsQuerySchema` in `src/lib/validation/marketplace.ts:90`
3. Handle filter in API `src/routes/api/marketplace/listings/+server.ts`
4. Add UI control in `MarketplaceListings.svelte`

### Add New Trade Offer Field

1. Update `CreateTradeOfferData` in `src/lib/types/marketplace.ts:173`
2. Add to `createOfferSchema` in `src/lib/validation/marketplace.ts:170`
3. Update `submitTradeOffer` in store at line 914
4. Update API handler and UI

### Add Shop Item Property

1. Add to `shopItemPropertiesSchema` in `src/lib/validation/shop.ts:30`
2. Update `ShopItemTemplate` interface in `src/lib/types/shop.ts`
3. Handle in UI components
4. Create migration if database column needed

---

## Debugging Tips

### Store State Inspection

```typescript
// In browser console
import { marketplaceStore } from '$lib/stores/marketplace.svelte';
console.log(marketplaceStore.listings);
console.log(marketplaceStore.activeTrades);
```

### API Response Debugging

```typescript
// In +server.ts
console.log('Request body:', body);
console.log('Validation result:', validation);
console.log('DB response:', data, error);
```

### Realtime Subscription Debugging

```typescript
// In store
.on('postgres_changes', {...}, (payload) => {
  console.log('Realtime event:', payload.eventType, payload);
  this.handleChange(payload);
})
```
