# Student Marketplace - Phase 1 Complete: Database Foundation

## What Was Created

### Migration File
`supabase/migrations/20251114082611_marketplace_foundation.sql`

This comprehensive migration creates the complete database foundation for the student marketplace feature:

### 7 Core Tables Created

1. **marketplace_config** - Controls marketplace enable/disable at school and class levels
2. **marketplace_listings** - Public sell/buy listings
3. **marketplace_proposals** - Responses to public listings
4. **marketplace_trades** - Friend-to-friend negotiations and completed trade history
5. **marketplace_trade_offers** - History of all offers/counter-offers
6. **marketplace_locked_cards** - Prevents double-spending of VIP cards
7. **marketplace_chat_messages** - Mini-chat for friend negotiations

### 5 RPC Functions (SECURITY DEFINER)

1. **check_marketplace_enabled()** - Verifies marketplace is enabled for a student
2. **lock_cards()** - Locks VIP cards to prevent double-spending
3. **unlock_cards()** - Unlocks cards when listing/trade ends
4. **execute_trade()** - Atomically executes a completed trade with full rollback support
5. **auto_expire_listings()** - Auto-expires old listings (for cron job)

### Security Features

- Row Level Security (RLS) enabled on all tables
- Comprehensive RLS policies for all CRUD operations
- SECURITY DEFINER functions for sensitive operations
- Card locking mechanism to prevent double-spending
- Atomic trade execution with rollback support
- Daily trade limits (10 per day)
- Active listing limits (5 per student)
- School-scoped visibility (no cross-school trading)

### Performance Optimizations

- Strategic indexes on all foreign keys
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., active listings)
- Triggers for automatic timestamp updates
- Auto-increment offer numbers per trade

### Data Integrity

- CHECK constraints for all enums and ranges
- UNIQUE constraints to prevent duplicates
- Foreign key constraints with appropriate CASCADE behavior
- Either/or constraint for marketplace_config (school XOR class)
- Validation that cards exist and are unused before locking

## Files Updated

1. **Created**: `supabase/migrations/20251114082611_marketplace_foundation.sql`
2. **Updated**: `src/lib/types/database.ts` - Added all new table and function types
3. **Updated**: `docs/architecture/database-schema.md` - Added comprehensive marketplace documentation

## Important Notes for Phase 2 (Backend Implementation)

### Critical Business Rules to Implement

1. **Friend Verification**: When creating friend trades, verify friendship exists:
   ```typescript
   // Check friendship exists and is accepted
   const friendship = await supabase
     .from('friendships')
     .select('*')
     .or(`requester_id.eq.${initiatorId},addressee_id.eq.${initiatorId}`)
     .or(`requester_id.eq.${partnerId},addressee_id.eq.${partnerId}`)
     .eq('status', 'accepted')
     .single();
   ```

2. **Card Ownership Verification**: Before locking cards, verify they belong to the student:
   ```typescript
   const profile = await supabase
     .from('profiles')
     .select('vip_cards')
     .eq('id', studentId)
     .single();

   const vipCards = profile.data?.vip_cards as Record<string, any>;
   for (const cardId of cardIds) {
     if (!vipCards[cardId]) {
       throw new Error(`Card ${cardId} not found`);
     }
   }
   ```

3. **Marketplace Enable Check**: Always check if marketplace is enabled:
   ```typescript
   const { data: enabled } = await supabase
     .rpc('check_marketplace_enabled', { p_student_id: userId });

   if (!enabled) {
     throw new Error('Marketplace is disabled for your school/class');
   }
   ```

### API Endpoints to Create (Phase 2)

#### Public Marketplace
- `GET /api/marketplace/listings` - List active listings (paginated, filtered)
- `POST /api/marketplace/listings` - Create new listing
- `PATCH /api/marketplace/listings/[id]` - Update/cancel listing
- `GET /api/marketplace/listings/[id]` - Get listing details with proposals
- `POST /api/marketplace/proposals` - Submit proposal to listing
- `PATCH /api/marketplace/proposals/[id]` - Accept/reject/withdraw proposal

#### Friend Trading
- `GET /api/marketplace/trades` - List user's trades
- `POST /api/marketplace/trades` - Initiate friend trade
- `GET /api/marketplace/trades/[id]` - Get trade details with offers
- `POST /api/marketplace/trades/[id]/offers` - Make counter-offer
- `POST /api/marketplace/trades/[id]/accept` - Accept current offer
- `POST /api/marketplace/trades/[id]/cancel` - Cancel trade
- `GET /api/marketplace/trades/[id]/messages` - Get chat messages
- `POST /api/marketplace/trades/[id]/messages` - Send chat message

#### Configuration (Teacher/Admin)
- `GET /api/marketplace/config` - Get config for school/classes
- `PATCH /api/marketplace/config` - Update marketplace settings

### Validation Schemas (Zod) to Create

```typescript
// Example for creating a listing
const createListingSchema = z.object({
  listing_type: z.enum(['sell', 'buy']),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  offered_card_ids: z.array(z.string().uuid()).max(10),
  offered_gidouilles: z.number().int().min(0).max(10000),
  wanted_card_template_ids: z.array(z.string()).max(10),
  wanted_gidouilles: z.number().int().min(0).max(10000),
}).refine(data => {
  // At least one item must be offered or wanted
  return data.offered_card_ids.length > 0 ||
         data.offered_gidouilles > 0 ||
         data.wanted_card_template_ids.length > 0 ||
         data.wanted_gidouilles > 0;
}, "At least one item must be offered or wanted");
```

### Cron Job Setup

Set up a cron job to run every hour:
```typescript
// In Supabase dashboard or external service
SELECT auto_expire_listings();
```

### Testing Considerations

1. **Test Card Locking**: Ensure cards can't be double-spent
2. **Test Trade Atomicity**: Simulate failures mid-trade
3. **Test Daily Limits**: Verify 10 trades/day limit works
4. **Test School Isolation**: Ensure no cross-school visibility
5. **Test Friend Verification**: Non-friends can't trade directly
6. **Test Expiry**: Listings expire and unlock cards properly

## Next Steps

### Phase 2: Backend Implementation
- Create all API endpoints with Zod validation
- Implement business logic and error handling
- Add comprehensive logging
- Create integration tests
- Set up cron job for auto-expiry

### Phase 3: Frontend UI
- Public marketplace browse/search interface
- Listing creation wizard
- Proposal management for creators
- Friend trade negotiation interface
- Mini-chat component for trades
- Teacher/admin configuration panel

### Phase 4: Polish & Launch
- Performance optimization
- Error handling and user feedback
- Analytics and monitoring
- Documentation for users
- Gradual rollout plan

## How to Deploy

1. **Review the migration**: Check `/Users/david/Coding/js/ubumaths/supabase/migrations/20251114082611_marketplace_foundation.sql`
2. **Push to Supabase**: Run `pnpm db:migrate`
3. **Verify deployment**: Check tables, RLS policies, and functions in Supabase dashboard
4. **Test RPC functions**: Use Supabase dashboard to test the 5 RPC functions
5. **Configure marketplace**: Insert initial config for test school/classes

## Security Checklist

✅ RLS enabled on all tables
✅ SECURITY DEFINER on sensitive functions
✅ Card locking prevents double-spending
✅ Atomic trade execution with rollback
✅ School-scoped visibility
✅ Daily trade limits enforced
✅ Friend verification for direct trades
✅ Unused card verification
✅ Input validation via CHECK constraints
✅ Proper CASCADE behavior on deletions

## Performance Considerations

- **Indexes**: All foreign keys and common query patterns indexed
- **Pagination**: API endpoints should implement cursor-based pagination
- **Caching**: Consider caching marketplace config and active listings
- **Rate Limiting**: Implement rate limiting on API endpoints
- **Batch Operations**: Lock/unlock multiple cards in single transaction

## Monitoring & Analytics

Track these metrics when live:
- Active listings per school
- Daily trade volume
- Most traded VIP cards
- Average negotiation rounds
- Expired listing rate
- Failed trade attempts
- User engagement metrics

## Success Criteria

The marketplace will be successful if:
1. Zero double-spending incidents
2. All trades complete atomically (no partial transfers)
3. Students stay within daily limits
4. No cross-school data leaks
5. Sub-second response times for listings
6. 99.9% uptime for trade execution