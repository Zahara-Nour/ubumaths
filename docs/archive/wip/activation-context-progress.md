# Migration activation_context -> action.context - Progress

## Status: COMPLETE

## Summary

Migrated `activation_context` from a separate column on `vip_card_templates` to `action.context` inside the JSONB `action` field. The context is a property of the action, not the template itself.

Previous implementation added `activation_context` as a standalone DB column. This refactoring unifies it into the action object for consistency.

## Phases Completed

1. **Types & Validation** - Added `context?: string` to all action interfaces, removed `activationContext` from VipCard
2. **DB Migration** - SQL to copy data, update RPC, drop column
3. **API Endpoints** - 5 endpoints updated
4. **Store & Utilities** - Removed activation_context from store and utils
5. **UI Components** - Context selector moved into VipCardActionEditor, removed from VipCardTemplateEditor
6. **Tests** - Updated and passing (25/25)
7. **Verification** - ESLint, TypeScript, Svelte autofixer, Prettier all clean

## Files Modified

### New Files

- `supabase/migrations/20260302204831_migrate_activation_context_to_action.sql`

### Modified Files (Types & Validation)

- `src/lib/types/vip-card.ts` - Added `context?: string` to all 7 action interfaces, removed `activationContext` from VipCard
- `src/lib/types/vip-card-admin.ts` - Removed activation_context from VipCardTemplate, CreateTemplateRequest, TemplateResponse, conversion functions
- `src/lib/server/validation/vip-card-admin.ts` - Added `context` to all Zod action schemas, removed from template schemas

### Modified Files (API Endpoints)

- `src/routes/api/vip-cards/activate-add-gidouilles/+server.ts` - `(template.action as VipCardAction | null)?.context`
- `src/routes/api/vip-cards/choose/+server.ts` - Same pattern
- `src/routes/api/vip-cards/exchange/+server.ts` - Same pattern
- `src/routes/api/admin/vip-cards/templates/+server.ts` - Removed activationContext mapping
- `src/routes/api/admin/vip-cards/templates/[id]/+server.ts` - Removed activationContext mapping

### Modified Files (Store & Utils)

- `src/lib/stores/vipCardTemplates.svelte.ts` - Removed activation_context from interface and mapping
- `src/lib/utils/vip-cards.ts` - Removed activationContext from return type and mapping

### Modified Files (UI)

- `src/lib/components/vip-cards/VipCardActionEditor.svelte` - Added context selector (visible for all action types)
- `src/lib/components/vip-cards/VipCardTemplateEditor.svelte` - Removed activation_context UI section
- `src/lib/components/StudentVipCardsModal.svelte` - `card.action?.context` instead of `card.activationContext`
- `src/lib/components/VipCardActivationButton.svelte` - `card.action?.context`
- `src/routes/(protected)/dashboard/admin/vip-cards/+page.svelte` - Removed activation_context from interface and payload

### Modified Files (Other)

- `src/lib/server/vip-card-context.ts` - JSDoc updates
- `src/routes/api/vip-cards/use-card/+server.ts` - Comment updates
- `src/lib/server/validation/vip-cards.ts` - Comment updates
- `tests/unit/vip-card-consumable.test.ts` - Test description updated

## Key Decisions

- `withContext()` helper in VipCardActionEditor cleanly injects context into all action types
- `as VipCardAction | null` cast used in API endpoints (DB returns generic JSON)
- `activationContextEnum` Zod schema kept and reused for action.context validation
- DB migration: data copied first, then RPC recreated, then column dropped (safe order)

## User Actions Required

- `pnpm db:migrate` to apply the SQL migration
- `pnpm db:types` to regenerate database.ts (remove stale activation_context references)
