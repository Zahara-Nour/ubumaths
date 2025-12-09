# Marketplace Troubleshooting

> Common issues and solutions for the marketplace and shop systems.

## Quick Diagnostics

```typescript
// Browser console - check store state
import { marketplaceStore, shopStore } from '$lib/stores';

console.log('Listings:', marketplaceStore.listings);
console.log('Trades:', marketplaceStore.activeTrades);
console.log('Config:', marketplaceStore.config);
console.log('Shop Items:', shopStore.shopItems);
console.log('Balance:', shopStore.gidouillesBalance);
```

---

## Common Issues

### 1. "Non authentifie" (401 Error)

**Symptoms:** API calls return 401, user appears logged out

**Causes:**

- Session expired
- Cookie not sent with request
- Supabase client not initialized

**Solutions:**

```typescript
// Check if profile exists in locals
// File: src/routes/api/marketplace/listings/+server.ts
if (!locals.profile) {
	// This triggers 401
	throw error(401, 'Non authentifie');
}

// Verify session on client
const {
	data: { session }
} = await supabase.auth.getSession();
if (!session) {
	goto('/login');
}
```

**Fix:** Refresh the page or re-login. If persistent, check `hooks.server.ts` for auth setup.

---

### 2. "Reserve aux eleves" (403 Error)

**Symptoms:** Students get 403 when accessing marketplace

**Causes:**

- User role is not 'student'
- Profile not loaded correctly

**Solutions:**

```typescript
// Check role in profile
// File: src/routes/api/marketplace/listings/+server.ts:73
if (locals.profile.role !== 'student') {
	throw error(403, 'Reserve aux eleves');
}

// Debug: Check profile role
console.log('Profile:', locals.profile);
console.log('Role:', locals.profile?.role);
```

**Fix:** Verify user has correct role in `profiles` table.

---

### 3. Cards Not Appearing in Selector

**Symptoms:** VipCardSelector shows empty or missing cards

**Causes:**

- Cards are locked for another listing/trade
- Cards not loaded in store
- Filter excluding cards

**Solutions:**

```typescript
// Check locked status
// File: src/lib/stores/marketplace.svelte.ts
console.log('All cards:', marketplaceStore.myVipCards);
console.log(
	'Locked:',
	marketplaceStore.myVipCards.filter((c) => c.is_locked)
);
console.log(
	'Available:',
	marketplaceStore.myVipCards.filter((c) => !c.is_locked)
);

// Check locked_cards table
const { data } = await supabase
	.from('marketplace_locked_cards')
	.select('*')
	.eq('student_id', userId);
console.log('Locked in DB:', data);
```

**Fix:** Cancel listings/trades using those cards, or wait for them to complete.

---

### 4. "Gidouilles insuffisantes" (402 Error)

**Symptoms:** Purchase fails with insufficient balance

**Causes:**

- Balance too low
- Stale balance in UI (not synced)
- Race condition (concurrent purchases)

**Solutions:**

```typescript
// Check actual balance
// File: src/routes/api/shop/purchase/+server.ts
const { data: profile } = await supabase
	.from('profiles')
	.select('gidouilles')
	.eq('id', userId)
	.single();
console.log('Actual balance:', profile.gidouilles);
console.log('UI balance:', shopStore.gidouillesBalance);

// Force refresh
await shopStore.loadGidouillesBalance();
```

**Fix:** Refresh page to sync balance, or earn more gidouilles.

---

### 5. Listing Not Appearing After Creation

**Symptoms:** Create listing succeeds but doesn't show in browse

**Causes:**

- Different school filter
- Status not 'active'
- Realtime subscription not connected

**Solutions:**

```typescript
// Check listing status
const { data } = await supabase
	.from('marketplace_listings')
	.select('*')
	.eq('creator_id', userId)
	.order('created_at', { ascending: false })
	.limit(1);
console.log('Latest listing:', data[0]);

// Check realtime connection
console.log('Channels:', marketplaceStore.channels);

// Force refresh
await marketplaceStore.fetchListings(true);
```

**Fix:** Check school_id matches, verify status is 'active', refresh page.

---

### 6. Trade Stuck in "Negotiating"

**Symptoms:** Trade cannot be accepted, stays in negotiating

**Causes:**

- `last_offer_by` equals accepting user (can't accept own offer)
- One party has insufficient assets
- Cards were unlocked/deleted

**Solutions:**

```typescript
// Check trade state
const { data: trade } = await supabase
	.from('marketplace_trades')
	.select('*, current_offer')
	.eq('id', tradeId)
	.single();

console.log('Trade:', trade);
console.log('Last offer by:', trade.last_offer_by);
console.log('Current user:', userId);
console.log('Can accept:', trade.last_offer_by !== userId);
```

**Fix:** The other party must make an offer, or cancel and restart trade.

---

### 7. Validation Error "Doit offrir ou demander..."

**Symptoms:** Can't create listing, validation fails

**Cause:** Listing has no offered or wanted assets

**Solution:**

```typescript
// File: src/lib/validation/marketplace.ts:50-55
// The refine check requires at least one asset
.refine(
  (data) => {
    const hasOffered = (data.offered_card_ids?.length ?? 0) > 0 ||
                       (data.offered_gidouilles ?? 0) > 0;
    const hasWanted = (data.wanted_card_template_ids?.length ?? 0) > 0 ||
                      (data.wanted_gidouilles ?? 0) > 0;
    return hasOffered || hasWanted;
  },
  { message: 'Doit offrir ou demander au moins un actif' }
)
```

**Fix:** Add at least one card or gidouilles amount to offered OR wanted.

---

### 8. RLS Policy Blocking Access

**Symptoms:** Empty results, "permission denied" errors

**Causes:**

- Missing RLS policy for operation
- Policy filter doesn't match user context

**Debug:**

```sql
-- Check policies on table
SELECT * FROM pg_policies WHERE tablename = 'marketplace_listings';

-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT * FROM marketplace_listings;
```

**Common RLS Issues:**

| Table     | Issue                      | Check                                  |
| --------- | -------------------------- | -------------------------------------- |
| listings  | Can't see others' listings | `school_id` matches user's school      |
| trades    | Can't see trade            | User is `initiator_id` or `partner_id` |
| inventory | Teacher can't see student  | Student in teacher's class             |

---

### 9. Realtime Updates Not Working

**Symptoms:** UI doesn't update when others make changes

**Causes:**

- Channel not subscribed
- Filter too restrictive
- Connection dropped

**Solutions:**

```typescript
// Check subscription status
// File: src/lib/stores/marketplace.svelte.ts
console.log('Supabase client:', this.supabase);
console.log('Active channels:', this.channels);

// Manual reconnect
marketplaceStore.cleanup();
await marketplaceStore.init(supabase, userId, classId);

// Check in Supabase dashboard
// Realtime > Inspector > Check active subscriptions
```

**Fix:** Re-initialize store, check Supabase realtime quotas.

---

### 10. Purchase Limit Errors

**Symptoms:** "Limite journaliere atteinte", "Limite de possession atteinte"

**Causes:**

- `daily_purchase_limit` exceeded
- `max_owned_per_student` exceeded
- `weekly_purchase_limit` exceeded

**Debug:**

```typescript
// Check current ownership
const { data } = await supabase
	.from('student_item_inventory')
	.select('quantity')
	.eq('student_id', userId)
	.eq('template_id', templateId)
	.single();
console.log('Current owned:', data?.quantity);

// Check today's purchases
const { data: purchases } = await supabase
	.from('shop_purchase_history')
	.select('quantity')
	.eq('student_id', userId)
	.eq('template_id', templateId)
	.gte('purchased_at', new Date().toISOString().split('T')[0]);
console.log('Today purchases:', purchases);
```

**Fix:** Wait for cooldown/daily reset, or item has max ownership.

---

## Error Code Reference

| Code | Message                  | Cause            | Solution                |
| ---- | ------------------------ | ---------------- | ----------------------- |
| 400  | Validation error         | Invalid input    | Check request data      |
| 401  | Non authentifie          | No session       | Login/refresh           |
| 402  | Gidouilles insuffisantes | Low balance      | Earn more               |
| 403  | Reserve aux eleves       | Wrong role       | Check profile           |
| 404  | Non trouve               | Resource missing | Check ID exists         |
| 409  | Deja utilise             | Duplicate/locked | Unlock or use different |
| 500  | Erreur serveur           | Server bug       | Check logs, report      |

---

## Logging & Monitoring

### Enable Debug Logging

```typescript
// In store methods
console.log('[Marketplace] Creating listing:', data);
console.log('[Shop] Purchase request:', { templateId, quantity });
```

### Server-Side Logging

```typescript
// In +server.ts
console.log('[API] /marketplace/listings POST:', {
	userId: locals.profile?.id,
	body: validation.data
});
```

### Database Query Logging

```sql
-- Enable in Supabase dashboard
-- Settings > Database > Query Performance
-- Or check postgres logs
```

---

## Performance Issues

### Slow Listing Load

**Cause:** Too many listings, no pagination

**Fix:** Use `limit` and `page` params:

```typescript
await marketplaceStore.fetchListings(false, false); // with pagination
```

### Store Memory Leak

**Cause:** Realtime channels not cleaned up

**Fix:** Always call cleanup:

```svelte
<script>
	$effect(() => {
		marketplaceStore.init(supabase, userId);
		return () => marketplaceStore.cleanup();
	});
</script>
```

---

## Getting Help

1. Check browser console for errors
2. Check network tab for API responses
3. Verify database state in Supabase dashboard
4. Check RLS policies match expected behavior
5. Review recent migrations for schema changes
