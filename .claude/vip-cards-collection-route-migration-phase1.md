# Phase 1: Complete Reference Discovery for `/vip-cards/collection`

## Executive Summary

This document provides a comprehensive inventory of all references to `/vip-cards/collection` in the codebase, organized by type and criticality. Total references found: **5 critical + 2 informational = 7 total**.

---

## Critical References (Will Break If Not Updated)

These references must be updated during migration. They directly reference the `/vip-cards/collection` route.

### 1. Navigation Link in Dashboard Layout

**File**: `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/+layout.svelte`

**Line**: 117

**Context**: Student navigation menu - direct href link
```svelte
{ href: '/vip-cards/collection', label: 'Collection VIP', icon: Sparkles }
```

**Severity**: CRITICAL - This is the primary user navigation link

**Impact**: Students cannot access the collection from the dashboard sidebar if route changes

**Update Action**: Change href to new route path

---

### 2. Route Files (Page Component)

**File**: `/Users/david/Coding/js/ubumaths/src/routes/(protected)/vip-cards/collection/+page.svelte`

**Context**: Main student VIP cards collection page component

**Severity**: CRITICAL - This is the page itself

**Impact**: Must be moved/renamed to new route path

**Update Action**: Move this file to new route directory

---

### 3. Route Files (Page Server Load)

**File**: `/Users/david/Coding/js/ubumaths/src/routes/(protected)/vip-cards/collection/+page.server.ts`

**Lines**: 42, 65 (console.error statements)
```typescript
console.error('[vip-cards/collection] Error fetching templates:', templatesError);
console.error('[vip-cards/collection] Error fetching profile:', profileError);
```

**Context**: Server-side data loading for the collection page

**Severity**: CRITICAL - This is the server load function

**Impact**: Must be moved/renamed to new route directory; console logs may be updated (optional)

**Update Action**: Move this file to new route directory; optionally update log identifiers

---

## Informational References (Nice-to-Have Updates)

These references are in documentation or testing checklists and won't break functionality, but should be updated for consistency.

### 4. Testing Checklist - Test 2.4

**File**: `/Users/david/Coding/js/ubumaths/STUDENT_CACHE_TESTING_CHECKLIST.md`

**Line**: 177

**Context**: Manual testing instructions for VIP Cards Collection Page

**Section**: "Test 2.4: VIP Cards Collection Page"
```markdown
1. Navigate to `/vip-cards/collection`
```

**Severity**: LOW - Documentation/testing reference

**Impact**: Testers will need updated instructions if URL changes

**Update Action**: Update URL in testing documentation

---

### 5. Testing Checklist - Test 4.2

**File**: `/Users/david/Coding/js/ubumaths/STUDENT_CACHE_TESTING_CHECKLIST.md`

**Line**: 291

**Context**: Manual testing instructions for cross-component cache consistency

**Section**: "Test 4.2: Collection Page -> Dashboard Sync"
```markdown
2. Navigate to `/vip-cards/collection`
```

**Severity**: LOW - Documentation/testing reference

**Impact**: Testers will need updated instructions if URL changes

**Update Action**: Update URL in testing documentation

---

## Related Routes & Components (FYI - No Action Needed)

These are related VIP cards routes and components that are NOT being migrated, but are relevant context:

### Teacher/Admin Routes (Different Path Structure)
- `/dashboard/teacher/vip-cards` - Teacher VIP card management
- `/dashboard/admin/vip-cards` - Admin VIP card management
- `/demo/vip-cards-demo` - Public demo/showcase

### API Endpoints (Not Affected)
- `POST /api/vip-cards/request-activation`
- `POST /api/vip-cards/exchange`
- `POST /api/vip-cards/use-card`
- `POST /api/rewards/draw-vip-cards`

### Related Components (Not Affected)
- `src/lib/components/VipCard.svelte`
- `src/lib/components/VipCardsModal.svelte`
- `src/lib/components/StudentVipCardsModal.svelte`
- `src/lib/components/rewards/VipCardExchangeModal.svelte`

---

## Migration Checklist

Use this checklist to ensure all critical references are updated:

### Phase 2: Update Navigation
- [ ] Update `src/routes/(protected)/dashboard/+layout.svelte` line 117 href value
- [ ] Test sidebar navigation to new route

### Phase 3: Move Route Files
- [ ] Move `/src/routes/(protected)/vip-cards/collection/+page.svelte` to new location
- [ ] Move `/src/routes/(protected)/vip-cards/collection/+page.server.ts` to new location
- [ ] Verify both files are accessible at new route

### Phase 4: Update Documentation
- [ ] Update `STUDENT_CACHE_TESTING_CHECKLIST.md` line 177
- [ ] Update `STUDENT_CACHE_TESTING_CHECKLIST.md` line 291
- [ ] Review any internal wiki/documentation (if applicable)

### Phase 5: Testing & Validation
- [ ] Run existing tests (`pnpm test:unit`)
- [ ] Manual testing: Navigate from dashboard to new route
- [ ] Manual testing: Verify all VIP card operations work
- [ ] Run full test suite (`pnpm build && pnpm lint`)

---

## Reference Summary by File Type

| File Type | Count | Files |
|-----------|-------|-------|
| Svelte Components | 2 | +page.svelte, +page.server.ts |
| Navigation Links | 1 | +layout.svelte |
| Docs/Testing | 2 | STUDENT_CACHE_TESTING_CHECKLIST.md |
| **TOTAL CRITICAL** | **5** | |
| **TOTAL INFORMATIONAL** | **2** | |
| **TOTAL REFERENCES** | **7** | |

---

## New Route Path Decision

Before proceeding, confirm the new route path:

**Current Path**: `/vip-cards/collection`

**Proposed New Path**: [TO BE DETERMINED]

### Options to Consider:
1. `/dashboard/student/vip-cards` - Aligns with other student dashboard routes
2. `/dashboard/vip-cards/collection` - Groups VIP cards under dashboard
3. `/student/vip-cards/collection` - Separates student routes from dashboard
4. `/my/vip-cards` - Personal collection metaphor

---

## Files Modified During Discovery

No files were modified during this discovery phase. This is a read-only reference document.

---

## Next Steps

1. **Confirm new route path** with stakeholders
2. **Run Phase 2** (Update Navigation) once path is decided
3. **Track progress** using this document as the master checklist
4. **Document any new references** found during migration

---

**Discovery Completed**: 2025-11-12
**Total References Found**: 7 (5 critical, 2 informational)
**Status**: Ready for Phase 2 - Navigation Updates
