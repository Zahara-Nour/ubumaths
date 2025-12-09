# Troubleshooting Guide

> Common issues and solutions for the rewards system.

## Common Issues

### Gidouilles Not Updating

**Symptom:** Teacher awards gidouilles but student's balance doesn't change.

**Possible Causes:**

1. **RLS Policy blocking update**

   ```sql
   -- Check if teacher has access to the class
   SELECT * FROM classes WHERE teacher_id = '<teacher_uuid>' AND id = '<class_id>';
   ```

2. **Student not in class**

   ```sql
   -- Verify class membership
   SELECT * FROM class_members
   WHERE student_id = '<student_uuid>' AND class_id = '<class_id>';
   ```

3. **Negative balance prevention**
   ```sql
   -- Check current balance
   SELECT gidouilles FROM profiles WHERE id = '<student_uuid>';
   -- The CHECK constraint prevents gidouilles < 0
   ```

**Solution:** Use the RPC function which handles validation:

```typescript
const { error } = await supabase.rpc('update_student_gidouilles', {
	p_student_id: studentId,
	p_class_id: classId,
	p_delta: delta
});
```

---

### VIP Card Draw Returns No Cards

**Symptom:** Student pays gidouilles but no cards appear.

**Possible Causes:**

1. **No enabled cards for selected rarity**

   ```sql
   -- Check enabled cards by rarity
   SELECT rarity, COUNT(*) FROM vip_card_templates
   WHERE is_enabled = TRUE GROUP BY rarity;
   ```

2. **Invalid probability config**
   ```sql
   -- Verify probabilities sum to 100
   SELECT config_name,
          common_probability + rare_probability +
          epic_probability + legendary_probability AS total
   FROM vip_card_config WHERE is_active = TRUE;
   ```

**Solution:** Ensure at least one card is enabled for each rarity tier.

---

### Card Activation Request Not Visible to Teacher

**Symptom:** Student requests card activation but teacher doesn't see it.

**Possible Causes:**

1. **Wrong class context**
   - Teacher viewing different class
   - Student in multiple classes

2. **RLS policy issue**
   ```sql
   -- Check class relationship
   SELECT c.id, c.name, c.teacher_id
   FROM classes c
   JOIN class_members cm ON cm.class_id = c.id
   WHERE cm.student_id = '<student_uuid>';
   ```

**Solution:** Verify teacher is viewing the correct class and student is an active member.

---

### Shop Purchase Fails Silently

**Symptom:** Purchase button clicked but no feedback, item not added.

**Possible Causes:**

1. **Insufficient gidouilles**

   ```sql
   SELECT gidouilles FROM profiles WHERE id = '<student_uuid>';
   SELECT final_price FROM shop_item_templates WHERE id = '<template_id>';
   ```

2. **Purchase limit reached**

   ```sql
   -- Check daily purchases
   SELECT COUNT(*) FROM shop_purchase_history
   WHERE student_id = '<student_uuid>'
     AND template_id = '<template_id>'
     AND purchased_at >= CURRENT_DATE;
   ```

3. **Item not active**
   ```sql
   SELECT is_active, available_from, available_until
   FROM shop_item_templates WHERE id = '<template_id>';
   ```

**Solution:** Check API response for specific error message:

```typescript
const response = await fetch('/api/shop/purchase', { ... });
const data = await response.json();
if (!response.ok) {
  console.error('Purchase failed:', data.message);
}
```

---

### Marketplace Listing Not Visible

**Symptom:** Student creates listing but others can't see it.

**Possible Causes:**

1. **Different schools**

   ```sql
   -- Listings are school-scoped
   SELECT l.id, l.school_id, p.school_id as viewer_school
   FROM marketplace_listings l, profiles p
   WHERE l.id = '<listing_id>' AND p.id = '<viewer_uuid>';
   ```

2. **Marketplace disabled for class**

   ```sql
   SELECT enabled_for_class FROM class_marketplace_config
   WHERE class_id = '<class_id>';
   ```

3. **Listing expired or cancelled**
   ```sql
   SELECT status, expires_at FROM marketplace_listings
   WHERE id = '<listing_id>';
   ```

**Solution:** Verify school membership and marketplace configuration.

---

### Reward Events Not Appearing in Journal

**Symptom:** Actions complete but don't show in student journal.

**Possible Causes:**

1. **Trigger not firing**

   ```sql
   -- Check trigger exists
   SELECT trigger_name, event_manipulation
   FROM information_schema.triggers
   WHERE trigger_name LIKE '%reward%';
   ```

2. **Event generation error**
   ```sql
   -- Check for recent events
   SELECT * FROM reward_events
   WHERE student_id = '<student_uuid>'
   ORDER BY created_at DESC LIMIT 5;
   ```

**Solution:** Verify triggers are enabled and check Postgres logs for errors.

---

## Debugging Tips

### Enable Debug Logging

```typescript
// In API endpoint
console.log('[Rewards]', {
	action: 'update_gidouilles',
	studentId,
	delta,
	timestamp: new Date().toISOString()
});
```

### Check Supabase Logs

```bash
# Via Supabase CLI
supabase logs --type postgres
supabase logs --type api
```

### Verify RLS Policies

```sql
-- Temporarily bypass RLS (admin only)
SET LOCAL role TO 'service_role';

-- Execute query
SELECT * FROM profiles WHERE id = '<uuid>';

-- Reset
RESET role;
```

### Test RPC Functions Directly

```sql
-- Test gidouilles update
SELECT update_student_gidouilles(
  '<student_uuid>'::uuid,
  '<class_uuid>'::uuid,
  10
);

-- Test card draw
SELECT draw_multiple_vip_cards(
  '<student_uuid>'::uuid,
  1,
  'gidouilles',
  3,
  NULL
);
```

---

## Performance Issues

### Slow Journal Loading

**Symptom:** Student journal takes >2s to load.

**Possible Causes:**

1. **Missing index**

   ```sql
   -- Check index exists
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'reward_events'
     AND indexdef LIKE '%student_id%';
   ```

2. **Too many events**
   - Implement pagination
   - Use cursor-based loading

**Solution:**

```sql
-- Add composite index if missing
CREATE INDEX IF NOT EXISTS idx_reward_events_student_time
ON reward_events(student_id, created_at DESC);
```

### Slow Teacher Dashboard

**Symptom:** Teacher rewards page loads slowly with many students.

**Solution:**

1. Use pagination (20-50 students per page)
2. Implement virtual scrolling
3. Cache student data in store
4. Use debounced updates

---

## Error Codes Reference

| Code   | Message                   | Cause                       | Solution                                   |
| ------ | ------------------------- | --------------------------- | ------------------------------------------ |
| `E001` | `insufficient_gidouilles` | Balance too low             | Check cost and balance                     |
| `E002` | `card_not_found`          | Invalid card ID             | Verify card exists in student's collection |
| `E003` | `card_already_used`       | Card consumed               | Card can only be used once                 |
| `E004` | `card_not_approved`       | Pending approval            | Wait for teacher approval                  |
| `E005` | `not_authorized`          | RLS policy block            | Check user permissions                     |
| `E006` | `item_not_available`      | Shop item inactive          | Check item availability dates              |
| `E007` | `purchase_limit_reached`  | Exceeded daily/weekly limit | Wait for limit reset                       |
| `E008` | `cooldown_active`         | Purchase too soon           | Wait for cooldown period                   |
| `E009` | `max_owned_reached`       | Inventory full              | Use existing items first                   |
| `E010` | `trade_locked`            | Item in pending trade       | Complete or cancel existing trade          |
| `E011` | `invalid_trade_partner`   | Not in same school          | Can only trade within school               |
| `E012` | `listing_expired`         | Listing past expiry         | Create new listing                         |
| `E013` | `validation_failed`       | Invalid input data          | Check request format                       |
| `E014` | `student_not_in_class`    | Class membership issue      | Verify enrollment                          |

---

## Getting Help

1. **Check logs** - Supabase dashboard → Logs
2. **Verify data** - Use SQL queries above
3. **Test in isolation** - Use RPC functions directly
4. **Check recent changes** - Review git history for rewards-related files
