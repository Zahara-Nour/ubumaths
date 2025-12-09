# Marketplace Security

> Security considerations, RLS policies, validation, and authorization patterns.

## Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Client-side Validation (UX only, not trusted)         │  │
│  │     - Form validation                                      │  │
│  │     - Balance checks                                       │  │
│  │     - Limit checks                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (SvelteKit)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2. Authentication Check                                   │  │
│  │     - Session cookie validation                            │  │
│  │     - User profile existence                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  3. Authorization Check                                    │  │
│  │     - Role verification (student, teacher, admin)          │  │
│  │     - Resource ownership                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  4. Input Validation (Zod)                                 │  │
│  │     - Type checking                                        │  │
│  │     - Bounds checking                                      │  │
│  │     - Format validation                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  5. Row Level Security (RLS)                               │  │
│  │     - Policy-based access control                          │  │
│  │     - User context from JWT                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  6. Database Constraints                                   │  │
│  │     - Foreign keys                                         │  │
│  │     - Check constraints                                    │  │
│  │     - Unique constraints                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  7. Atomic Transactions (RPC Functions)                    │  │
│  │     - SERIALIZABLE isolation                               │  │
│  │     - Row-level locking                                    │  │
│  │     - Rollback on failure                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Input Validation (Zod)

### Validation Schemas

**File:** `src/lib/validation/marketplace.ts`

```typescript
import { z } from 'zod';

// UUID validation helper
const uuidSchema = z.string().uuid('ID invalide');

// Card ID validation (not necessarily UUID)
const cardIdSchema = z.string().min(1).max(100);

// Create Listing Schema
export const createListingSchema = z
	.object({
		listing_type: z.enum(['sell', 'buy'], {
			errorMap: () => ({ message: 'Type doit etre "sell" ou "buy"' })
		}),
		title: z.string().min(3, 'Titre minimum 3 caracteres').max(100, 'Titre maximum 100 caracteres'),
		description: z.string().max(500, 'Description maximum 500 caracteres').optional(),
		offered_card_ids: z.array(cardIdSchema).max(10, 'Maximum 10 cartes').optional(),
		offered_gidouilles: z
			.number()
			.int('Doit etre un entier')
			.min(0, 'Minimum 0')
			.max(10000, 'Maximum 10000')
			.optional(),
		offered_item_ids: z.array(uuidSchema).max(10, 'Maximum 10 articles').optional(),
		wanted_card_template_ids: z.array(cardIdSchema).max(10, 'Maximum 10 cartes').optional(),
		wanted_gidouilles: z
			.number()
			.int('Doit etre un entier')
			.min(0, 'Minimum 0')
			.max(10000, 'Maximum 10000')
			.optional(),
		wanted_item_template_ids: z.array(uuidSchema).max(10, 'Maximum 10 articles').optional()
	})
	.refine(
		(data) => {
			const hasOffered =
				(data.offered_card_ids?.length ?? 0) > 0 ||
				(data.offered_gidouilles ?? 0) > 0 ||
				(data.offered_item_ids?.length ?? 0) > 0;
			const hasWanted =
				(data.wanted_card_template_ids?.length ?? 0) > 0 ||
				(data.wanted_gidouilles ?? 0) > 0 ||
				(data.wanted_item_template_ids?.length ?? 0) > 0;
			return hasOffered || hasWanted;
		},
		{ message: 'Doit offrir ou demander au moins un actif' }
	);

// Trade Offer Schema
export const tradeOfferSchema = z.object({
	initiator_cards: z.array(cardIdSchema).max(10).optional(),
	initiator_gidouilles: z.number().int().min(0).max(10000).optional(),
	initiator_items: z.array(uuidSchema).max(10).optional(),
	partner_cards: z.array(cardIdSchema).max(10).optional(),
	partner_gidouilles: z.number().int().min(0).max(10000).optional(),
	partner_items: z.array(uuidSchema).max(10).optional(),
	message: z.string().max(500).optional()
});

// Proposal Schema
export const proposalSchema = z.object({
	offered_card_ids: z.array(cardIdSchema).max(10).optional(),
	offered_gidouilles: z.number().int().min(0).max(10000).optional(),
	offered_item_ids: z.array(uuidSchema).max(10).optional(),
	message: z.string().max(500).optional()
});
```

**File:** `src/lib/validation/shop.ts`

```typescript
// Purchase Request Schema
export const purchaseRequestSchema = z.object({
	template_id: z.string().uuid('ID article invalide'),
	quantity: z
		.number()
		.int('Quantite doit etre un entier')
		.min(1, 'Minimum 1')
		.max(100, 'Maximum 100 par achat')
});
```

### Validation Pattern in API Endpoints

```typescript
// +server.ts
import { error, json } from '@sveltejs/kit';
import { createListingSchema } from '$lib/validation/marketplace';

export async function POST({ request, locals }) {
	// 1. Authentication check
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// 2. Role check
	if (locals.profile.role !== 'student') {
		throw error(403, 'Reserve aux eleves');
	}

	// 3. Parse and validate input
	const body = await request.json().catch(() => ({}));
	const validation = createListingSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// 4. Business logic validation
	// ...

	// 5. Database operation (RLS provides additional protection)
	// ...
}
```

---

## Row Level Security (RLS)

### Marketplace Listings Policies

```sql
-- Students can view active listings from their school + all their own listings
CREATE POLICY "listings_select_policy" ON marketplace_listings
FOR SELECT USING (
  -- Active listings from same school
  (status = 'active' AND school_id = (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  ))
  OR
  -- Own listings regardless of status
  creator_id = auth.uid()
);

-- Students can create listings (with limits enforced)
CREATE POLICY "listings_insert_policy" ON marketplace_listings
FOR INSERT WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Must be the creator
  creator_id = auth.uid()
  AND
  -- Must be a student
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
  AND
  -- Must not exceed listing limit
  (SELECT COUNT(*) FROM marketplace_listings
   WHERE creator_id = auth.uid() AND status = 'active'
  ) < (
    SELECT COALESCE(
      (SELECT max_listings_per_student FROM marketplace_config
       WHERE school_id = (SELECT school_id FROM profiles WHERE id = auth.uid())),
      5
    )
  )
);

-- Only creator can update/delete
CREATE POLICY "listings_update_policy" ON marketplace_listings
FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "listings_delete_policy" ON marketplace_listings
FOR DELETE USING (creator_id = auth.uid());
```

### Marketplace Trades Policies

```sql
-- Only participants can view trades
CREATE POLICY "trades_select_policy" ON marketplace_trades
FOR SELECT USING (
  initiator_id = auth.uid() OR partner_id = auth.uid()
);

-- Students can initiate trades
CREATE POLICY "trades_insert_policy" ON marketplace_trades
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND initiator_id = auth.uid()
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
);

-- Only participants can update
CREATE POLICY "trades_update_policy" ON marketplace_trades
FOR UPDATE USING (
  initiator_id = auth.uid() OR partner_id = auth.uid()
);
```

### Shop Tables Policies

```sql
-- All authenticated users can view active items
CREATE POLICY "shop_items_select_active" ON shop_item_templates
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND is_active = true
  AND (available_from IS NULL OR available_from <= NOW())
  AND (available_until IS NULL OR available_until >= NOW())
);

-- Admins can manage all items
CREATE POLICY "shop_items_admin" ON shop_item_templates
FOR ALL USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Students can only view own inventory
CREATE POLICY "inventory_select_own" ON student_item_inventory
FOR SELECT USING (student_id = auth.uid());

-- Teachers can view student inventory in their classes
CREATE POLICY "inventory_select_teacher" ON student_item_inventory
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = student_item_inventory.student_id
    AND c.teacher_id = auth.uid()
  )
);

-- Inventory INSERT only via RPC (purchase_shop_item)
-- No direct INSERT policy - must go through server function
```

### Teacher Admin Policies

```sql
-- Teachers can view trades for students in their classes
CREATE POLICY "trades_teacher_view" ON marketplace_trades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE (cm.student_id = marketplace_trades.initiator_id
           OR cm.student_id = marketplace_trades.partner_id)
    AND c.teacher_id = auth.uid()
  )
);

-- Teachers can view listings from students in their classes
CREATE POLICY "listings_teacher_view" ON marketplace_listings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = marketplace_listings.creator_id
    AND c.teacher_id = auth.uid()
  )
);
```

---

## Transaction Security

### Atomic Purchase Function

```sql
CREATE OR REPLACE FUNCTION purchase_shop_item(
  p_student_id UUID,
  p_template_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_item shop_item_templates;
  v_final_price INTEGER;
  v_current_balance INTEGER;
  v_inventory_id UUID;
  v_purchase_id UUID;
  v_gidouilles_history_id UUID;
BEGIN
  -- Verify caller is the student (defense in depth)
  IF p_student_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorise');
  END IF;

  -- Lock student row to prevent race conditions
  SELECT gidouilles INTO v_current_balance
  FROM profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utilisateur non trouve');
  END IF;

  -- Get and lock item template
  SELECT * INTO v_item
  FROM shop_item_templates
  WHERE id = p_template_id
  FOR SHARE;

  IF NOT FOUND OR NOT v_item.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Article non disponible');
  END IF;

  -- Calculate price with discount
  v_final_price := (v_item.base_price * (100 - COALESCE(v_item.discount_percentage, 0)) / 100) * p_quantity;

  -- Check balance
  IF v_current_balance < v_final_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gidouilles insuffisantes');
  END IF;

  -- Check ownership limit
  IF v_item.max_owned_per_student IS NOT NULL THEN
    DECLARE
      v_current_owned INTEGER;
    BEGIN
      SELECT COALESCE(SUM(quantity), 0) INTO v_current_owned
      FROM student_item_inventory
      WHERE student_id = p_student_id AND template_id = p_template_id;

      IF v_current_owned + p_quantity > v_item.max_owned_per_student THEN
        RETURN jsonb_build_object('success', false, 'error', 'Limite de possession atteinte');
      END IF;
    END;
  END IF;

  -- Check daily purchase limit
  IF v_item.daily_purchase_limit IS NOT NULL THEN
    DECLARE
      v_today_purchases INTEGER;
    BEGIN
      SELECT COALESCE(SUM(quantity), 0) INTO v_today_purchases
      FROM shop_purchase_history
      WHERE student_id = p_student_id
        AND template_id = p_template_id
        AND purchased_at >= CURRENT_DATE;

      IF v_today_purchases + p_quantity > v_item.daily_purchase_limit THEN
        RETURN jsonb_build_object('success', false, 'error', 'Limite journaliere atteinte');
      END IF;
    END;
  END IF;

  -- All checks passed - execute purchase

  -- 1. Deduct gidouilles
  UPDATE profiles
  SET gidouilles = gidouilles - v_final_price
  WHERE id = p_student_id;

  -- 2. Log gidouilles transaction
  INSERT INTO gidouilles_history (student_id, amount, reason, source)
  VALUES (p_student_id, -v_final_price, 'Achat boutique: ' || v_item.display_name, 'shop')
  RETURNING id INTO v_gidouilles_history_id;

  -- 3. Create or update inventory
  INSERT INTO student_item_inventory (
    student_id, template_id, quantity, acquired_from, acquired_at
  )
  VALUES (
    p_student_id, p_template_id, p_quantity, 'shop', NOW()
  )
  ON CONFLICT (student_id, template_id)
  DO UPDATE SET
    quantity = student_item_inventory.quantity + p_quantity,
    updated_at = NOW()
  RETURNING id INTO v_inventory_id;

  -- 4. Log purchase
  INSERT INTO shop_purchase_history (
    student_id, template_id, inventory_id, quantity,
    unit_price, total_price, discount_applied, gidouilles_history_id
  )
  VALUES (
    p_student_id, p_template_id, v_inventory_id, p_quantity,
    v_item.base_price, v_final_price,
    v_item.base_price * p_quantity - v_final_price,
    v_gidouilles_history_id
  )
  RETURNING id INTO v_purchase_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', v_inventory_id,
    'purchase_id', v_purchase_id,
    'gidouilles_spent', v_final_price,
    'new_balance', v_current_balance - v_final_price
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error rolls back the transaction
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

### Trade Execution Function

```sql
CREATE OR REPLACE FUNCTION execute_trade(
  p_trade_id UUID,
  p_accepting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade marketplace_trades;
  v_offer JSONB;
  v_initiator_balance INTEGER;
  v_partner_balance INTEGER;
BEGIN
  -- Lock and get trade
  SELECT * INTO v_trade
  FROM marketplace_trades
  WHERE id = p_trade_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Echange non trouve');
  END IF;

  -- Verify status
  IF v_trade.status != 'negotiating' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Echange non actif');
  END IF;

  -- Verify accepting user is participant and not last offerer
  IF p_accepting_user_id NOT IN (v_trade.initiator_id, v_trade.partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorise');
  END IF;

  IF v_trade.last_offer_by = p_accepting_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Impossible d''accepter sa propre offre');
  END IF;

  v_offer := v_trade.current_offer;

  -- Lock and verify balances
  SELECT gidouilles INTO v_initiator_balance
  FROM profiles WHERE id = v_trade.initiator_id FOR UPDATE;

  SELECT gidouilles INTO v_partner_balance
  FROM profiles WHERE id = v_trade.partner_id FOR UPDATE;

  -- Verify gidouilles
  IF (v_offer->>'initiator_gidouilles')::INTEGER > v_initiator_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Initiateur: gidouilles insuffisantes');
  END IF;

  IF (v_offer->>'partner_gidouilles')::INTEGER > v_partner_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partenaire: gidouilles insuffisantes');
  END IF;

  -- Verify card ownership (implementation depends on VIP card storage)
  -- ... card verification logic ...

  -- Execute transfers

  -- 1. Transfer gidouilles
  UPDATE profiles SET gidouilles = gidouilles
    - (v_offer->>'initiator_gidouilles')::INTEGER
    + (v_offer->>'partner_gidouilles')::INTEGER
  WHERE id = v_trade.initiator_id;

  UPDATE profiles SET gidouilles = gidouilles
    - (v_offer->>'partner_gidouilles')::INTEGER
    + (v_offer->>'initiator_gidouilles')::INTEGER
  WHERE id = v_trade.partner_id;

  -- 2. Transfer VIP cards
  -- ... card transfer logic ...

  -- 3. Transfer items
  -- ... item transfer logic ...

  -- 4. Unlock all locked cards
  DELETE FROM marketplace_locked_cards
  WHERE locked_entity_id = p_trade_id;

  -- 5. Update trade status
  UPDATE marketplace_trades
  SET status = 'completed',
      final_trade = v_offer,
      updated_at = NOW()
  WHERE id = p_trade_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

---

## Prevention of Common Attacks

### Double-Spending Prevention

Cards are locked when used in active listings or trades:

```typescript
// Server-side check before creating listing
async function checkCardAvailability(cardIds: string[], userId: string) {
	const { data: lockedCards } = await supabase
		.from('marketplace_locked_cards')
		.select('card_instance_id')
		.eq('student_id', userId)
		.in('card_instance_id', cardIds);

	if (lockedCards && lockedCards.length > 0) {
		throw error(409, 'Certaines cartes sont deja utilisees dans un autre echange');
	}
}
```

### Race Condition Prevention

All critical operations use `FOR UPDATE` locks:

```sql
-- Lock row before reading balance
SELECT gidouilles INTO v_balance
FROM profiles WHERE id = p_user_id
FOR UPDATE;

-- Now safe to read and modify
```

### SQL Injection Prevention

All queries use parameterized queries through Supabase client:

```typescript
// Safe - uses parameterized query
const { data } = await supabase
	.from('marketplace_listings')
	.select('*')
	.eq('creator_id', userId) // Automatically parameterized
	.eq('status', 'active');

// Never do this
// const { data } = await supabase.rpc('raw_query', {
//   sql: `SELECT * FROM listings WHERE id = '${userInput}'`  // DANGEROUS!
// });
```

### XSS Prevention

All user-generated content is sanitized:

- Svelte automatically escapes text in templates
- HTML content is never rendered with `{@html}`
- Rich text uses sanitization libraries

### CSRF Prevention

SvelteKit's form actions include CSRF protection by default.

---

## Authorization Patterns

### Role-Based Access

```typescript
// +server.ts
export async function GET({ locals }) {
	// Require authentication
	if (!locals.profile) {
		throw error(401, 'Non authentifie');
	}

	// Role check
	switch (locals.profile.role) {
		case 'student':
			return handleStudentRequest();
		case 'teacher':
			return handleTeacherRequest();
		case 'admin':
			return handleAdminRequest();
		default:
			throw error(403, 'Role non reconnu');
	}
}
```

### Ownership Check

```typescript
// Verify user owns the resource
const { data: listing } = await supabase
	.from('marketplace_listings')
	.select('creator_id')
	.eq('id', listingId)
	.single();

if (!listing || listing.creator_id !== locals.profile.id) {
	throw error(403, 'Non autorise');
}
```

### Relationship-Based Access (Teachers)

```typescript
// Verify teacher has access to student's data
const { data: relationship } = await supabase
	.from('class_members')
	.select('class_id, classes!inner(teacher_id)')
	.eq('student_id', studentId)
	.eq('classes.teacher_id', locals.profile.id)
	.single();

if (!relationship) {
	throw error(403, 'Acces refuse - eleve non dans vos classes');
}
```

---

## Security Checklist

### API Endpoint Checklist

- [ ] Authentication check (`locals.profile`)
- [ ] Role verification (`profile.role`)
- [ ] Input validation with Zod
- [ ] UUID validation on all ID parameters
- [ ] Numeric bounds checking
- [ ] Array length limits
- [ ] Ownership/relationship verification
- [ ] Error messages in French (user-facing)
- [ ] No sensitive data in error responses

### Database Checklist

- [ ] RLS enabled on all tables
- [ ] Policies for SELECT, INSERT, UPDATE, DELETE
- [ ] SECURITY DEFINER functions use `SET search_path = public`
- [ ] Row locking for atomic operations
- [ ] Foreign key constraints
- [ ] Check constraints for business rules
