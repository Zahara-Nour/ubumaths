# Student Dashboard Cache Migration - Manual Testing Checklist

## Overview

This checklist validates the student dashboard cache migration, focusing on:

- **Cache-first architecture**: UI derives from cache, not props
- **Optimistic UI updates**: Instant feedback without full page reloads
- **Error handling**: Rollback on API failures
- **Reactive updates**: Automatic UI updates when cache changes

## Prerequisites

- [ ] Application running on port 5175 (`pnpm dev -- --port 5175`)
- [ ] Database seeded with test data (student account, VIP cards, riddles)
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Test student account credentials ready

---

## Section 1: Initial Dashboard Load

### Test 1.1: Dashboard Displays Rewards from Cache

**Goal**: Verify RewardsBlock derives data from cache, not props

**Steps**:

1. Log in as a student
2. Navigate to `/dashboard`
3. Observe the "Mes Récompenses" section

**Expected**:

- [ ] Gidouilles count displays correctly
- [ ] VIP Cards count displays correctly
- [ ] Riddles solved count displays correctly
- [ ] No console errors
- [ ] No unnecessary network requests

**Validation**:

- Open browser console
- Type: `studentCache.getRewardsSync()`
- Verify displayed values match cache values

---

### Test 1.2: Cache Expiration & Refetch

**Goal**: Verify cache TTL and automatic refetch

**Steps**:

1. On dashboard, note current gidouilles count
2. Wait 11 minutes (rewards cache TTL is 10 minutes)
3. Trigger a cache read by navigating away and back to dashboard

**Expected**:

- [ ] After 10 minutes, next read triggers automatic refetch
- [ ] Network request to `/api/student/rewards` appears
- [ ] UI updates with fresh data
- [ ] No full page reload

**Notes**:

- Rewards TTL: 10 minutes
- Profile TTL: 2 hours
- Warnings TTL: 10 minutes per period

---

## Section 2: VIP Card Operations

### Test 2.1: Request VIP Card Activation (Optimistic BEFORE API)

**Goal**: Verify optimistic update pattern for activation requests

**Steps**:

1. From dashboard, click on "Cartes VIP" tile
2. Modal opens showing owned VIP cards
3. Find a card with an action (e.g., "Joker - Réponse à choix multiple")
4. Click "Demander l'activation" button
5. **DO NOT REFRESH PAGE** - observe UI changes

**Expected**:

- [ ] Button immediately changes to "En attente de validation" (instant)
- [ ] Button becomes disabled
- [ ] Success toast appears: "Demande d'activation envoyée !"
- [ ] **No full page reload**
- [ ] Network request to `/api/vip-cards/request-activation` succeeds
- [ ] UI remains in "waiting" state after API confirms

**Cache Validation**:

- Open console: `studentCache.getRewardsSync().vip_cards`
- Verify `activationRequestedAt` is set on the instance
- Verify `activationRequestedBy` equals student ID

---

### Test 2.2: VIP Card Activation Request Rollback on Error

**Goal**: Verify rollback when API fails

**Setup**:

1. Open DevTools → Network tab
2. Enable "Offline" mode (or block `/api/vip-cards/request-activation`)

**Steps**:

1. Open VIP cards modal
2. Click "Demander l'activation" on a card
3. Observe UI and network

**Expected**:

- [ ] Button initially changes to "En attente" (optimistic)
- [ ] Network request fails
- [ ] Error toast appears: "Erreur de connexion" or similar
- [ ] **Button reverts back to "Demander l'activation"** (rollback)
- [ ] Cache state rolled back (activationRequestedAt removed)

**Cache Validation**:

- Console: `studentCache.getRewardsSync().vip_cards`
- Verify `activationRequestedAt` is NOT set on the instance

---

### Test 2.3: VIP Card Exchange (Server-Confirmed Update)

**Goal**: Verify server-confirmed pattern for exchanges

**Prerequisites**:

- Teacher has activated a VIP card for exchange mode
- Student has the pending activation

**Steps**:

1. Refresh dashboard to see "Activation disponible !" badge
2. Click on VIP Cards tile
3. Find card with green "Activation disponible !" badge
4. Click "Échanger" button in modal
5. **DO NOT REFRESH PAGE**

**Expected**:

- [ ] Exchange modal opens
- [ ] Click "Confirmer l'échange" button
- [ ] Network request to `/api/vip-cards/exchange` succeeds
- [ ] Modal closes
- [ ] VIP card count decreases by 1 (if last instance)
- [ ] Success toast: "Carte VIP échangée !"
- [ ] **No full page reload**
- [ ] Dashboard RewardsBlock updates automatically

**Cache Validation**:

- Console: `studentCache.getRewardsSync().vip_cards`
- Verify exchanged instance has `usedAt` timestamp
- Verify cache updated AFTER API confirmed (not optimistic)

---

### Test 2.4: VIP Cards Collection Page

**Goal**: Verify collection page uses cache and handles requests

**Steps**:

1. Navigate to `/vip-cards/collection`
2. Observe all VIP cards displayed
3. Find an owned card with action and no pending request
4. Click "Utiliser" button
5. **DO NOT REFRESH PAGE**

**Expected**:

- [ ] Button immediately shows "En attente" (optimistic)
- [ ] Success toast appears
- [ ] **No window.location.reload()** or full page reload
- [ ] Network request succeeds
- [ ] Button remains in "En attente" state
- [ ] Owned count remains correct

**Rollback Test**:

- Enable offline mode
- Click "Utiliser" on another card
- [ ] Button reverts back after error
- [ ] Error toast appears

---

## Section 3: Gidouilles Operations

### Test 3.1: Earn Gidouilles from Riddle (Server-Confirmed Update)

**Goal**: Verify gidouilles cache update after solving riddle

**Steps**:

1. Note current gidouilles count on dashboard
2. Navigate to `/dashboard/student/riddles`
3. Click on an unsolved riddle
4. Submit correct answer
5. Observe UI and navigation

**Expected**:

- [ ] Success toast: "Bravo ! Tu as gagné X gidouilles !"
- [ ] After 2 seconds, navigate back to `/dashboard/student/riddles`
- [ ] **No window.location.reload()** or full page reload
- [ ] Navigate back to `/dashboard`
- [ ] Gidouilles count increased by awarded amount

**Cache Validation**:

- Console: `studentCache.getRewardsSync().gidouilles`
- Verify value matches displayed count
- Cache updated AFTER API confirmed award (not optimistic)

**Network Validation**:

- Check Network tab
- POST to `/api/riddles/:id/submit` succeeded
- Response contains `gidouilles_awarded` field
- Cache updated with exact server-returned value

---

### Test 3.2: Gidouilles Display Reactivity

**Goal**: Verify RewardsBlock automatically updates when cache changes

**Steps**:

1. Open dashboard in one tab
2. Solve a riddle in another tab (same browser session)
3. Return to dashboard tab (DO NOT REFRESH)
4. Trigger a re-render (e.g., hover over rewards block)

**Expected**:

- [ ] Gidouilles count updates automatically
- [ ] No manual refresh needed
- [ ] UI reactively derives from `$derived(studentCache.getRewardsSync())`

**Notes**:

- Svelte's $derived rune ensures automatic reactivity
- Cache is a Svelte rune, so updates trigger re-renders

---

## Section 4: Cross-Component Cache Consistency

### Test 4.1: VIP Card Modal → Dashboard Sync

**Goal**: Verify cache updates propagate across components

**Steps**:

1. On dashboard, note VIP card count in RewardsBlock
2. Click VIP Cards tile to open modal
3. Request activation on a card
4. Close modal
5. Observe RewardsBlock (DO NOT REFRESH)

**Expected**:

- [ ] RewardsBlock still shows same count (request doesn't consume card)
- [ ] Reopen modal → card shows "En attente" badge
- [ ] Both components derive from same cache source

---

### Test 4.2: Collection Page → Dashboard Sync

**Goal**: Verify cache sync between collection page and dashboard

**Steps**:

1. Start on dashboard, note VIP card count
2. Navigate to `/vip-cards/collection`
3. Request activation on a card
4. Navigate back to `/dashboard` (use browser back button)
5. **DO NOT REFRESH**

**Expected**:

- [ ] Dashboard loads instantly (SvelteKit navigation)
- [ ] VIP card count remains consistent
- [ ] Open VIP modal → card shows "En attente" badge
- [ ] Cache persisted across navigation

---

## Section 5: Error Handling & Edge Cases

### Test 5.1: Network Failure During Riddle Submission

**Goal**: Verify error handling without cache corruption

**Setup**:

- Enable offline mode in DevTools

**Steps**:

1. Navigate to a riddle
2. Submit an answer
3. Observe error handling

**Expected**:

- [ ] Error toast appears: "Erreur de connexion"
- [ ] Stay on riddle page (no navigation)
- [ ] Gidouilles cache NOT updated
- [ ] User can retry submission

---

### Test 5.2: Multiple Rapid VIP Card Requests

**Goal**: Verify cache doesn't get corrupted with rapid clicks

**Steps**:

1. Open VIP cards modal
2. Rapidly click "Demander l'activation" multiple times on same card
3. Observe behavior

**Expected**:

- [ ] Button disables after first click
- [ ] Only one network request sent
- [ ] Cache updated exactly once
- [ ] No duplicate activation requests

---

### Test 5.3: Cache with Stale Data

**Goal**: Verify cache invalidation on refetch

**Setup**:

1. Teacher gives student a VIP card via database (outside app)
2. Student is on dashboard (cache is stale)

**Steps**:

1. Wait for cache TTL to expire (10 minutes for rewards)
   OR manually invalidate: `studentCache.invalidateRewards()`
2. Navigate away and back to dashboard
3. Observe rewards display

**Expected**:

- [ ] New VIP card appears after refetch
- [ ] Cache automatically invalidates after TTL
- [ ] UI updates with fresh data

---

## Section 6: Performance & UX Validation

### Test 6.1: No Full Page Reloads

**Goal**: Verify elimination of window.location.reload()

**Steps**:
Perform all previous tests and confirm:

**Expected**:

- [ ] VIP card request activation: NO full page reload
- [ ] VIP card exchange: NO full page reload
- [ ] Riddle submission: NO full page reload (navigates with goto())
- [ ] All operations use SvelteKit navigation or optimistic updates

**Validation**:

- Search codebase for `window.location.reload()`
- Should only appear in auth flows (login/logout)
- Never in student dashboard operations

---

### Test 6.2: Instant UI Feedback

**Goal**: Verify optimistic updates feel instant

**Steps**:

1. Request VIP card activation
2. Exchange VIP card
3. Submit riddle answer

**Expected**:

- [ ] Button state changes INSTANTLY (< 100ms)
- [ ] Toast notifications appear within 500ms
- [ ] No loading spinners blocking entire UI
- [ ] User perceives immediate response

---

### Test 6.3: Cache Read Performance

**Goal**: Verify cache reads are synchronous and fast

**Steps**:

1. Open browser console
2. Run: `console.time('cache'); studentCache.getRewardsSync(); console.timeEnd('cache')`

**Expected**:

- [ ] Cache read completes in < 1ms
- [ ] No network request triggered
- [ ] Synchronous return (not async)

---

## Section 7: Developer Experience

### Test 7.1: Type Safety

**Goal**: Verify TypeScript types are correct

**Steps**:

1. Run: `pnpm check`

**Expected**:

- [ ] No TypeScript errors in cache-sync.ts
- [ ] No TypeScript errors in components using cache
- [ ] CacheContext types properly enforce teacher vs student

---

### Test 7.2: Unit Tests

**Goal**: Verify cache-sync utilities are tested

**Steps**:

1. Run: `pnpm exec vitest run src/lib/utils/cache-sync.test.ts`

**Expected**:

- [ ] All 37 tests pass (100% pass rate)
- [ ] Tests cover syncVipCards, syncGidouilles, rollbackGidouilles
- [ ] Tests cover both teacher and student contexts
- [ ] Tests cover error scenarios and rollback patterns

---

## Section 8: Regression Tests

### Test 8.1: Existing Features Still Work

**Goal**: Ensure migration didn't break existing functionality

**Steps**:
Test the following features still work:

- [ ] Student login/logout
- [ ] Dashboard navigation
- [ ] Exercises list and detail pages
- [ ] SRS revision system
- [ ] Profile viewing
- [ ] Teacher dashboard (if applicable)

---

### Test 8.2: Build & Lint

**Goal**: Verify code quality standards maintained

**Steps**:

1. Run: `pnpm build`
2. Run: `pnpm lint`
3. Run: `pnpm check`

**Expected**:

- [ ] Build succeeds with 0 errors
- [ ] Lint passes with 0 errors
- [ ] TypeScript check passes with 0 errors

---

## Summary Checklist

After completing all tests above, verify:

**Architecture**:

- [ ] RewardsBlock derives from cache, not props
- [ ] All VIP card operations use cache-sync utilities
- [ ] Gidouilles updates use cache-sync utilities
- [ ] No direct cache manipulation outside cache-sync.ts

**Patterns**:

- [ ] Optimistic BEFORE API: activation requests
- [ ] Server-confirmed AFTER API: exchanges, gidouilles awards
- [ ] Rollback on error: all optimistic updates revert
- [ ] No full page reloads in student dashboard operations

**Code Quality**:

- [ ] 37/37 unit tests pass (100%)
- [ ] 0 TypeScript errors
- [ ] 0 build errors
- [ ] 0 ESLint errors

**User Experience**:

- [ ] Instant UI feedback (< 100ms for optimistic updates)
- [ ] No blocking loading states
- [ ] Clear error messages with recovery options
- [ ] Consistent behavior across all student pages

---

## Known Issues / Limitations

Document any issues found during testing:

1. **Issue**: [Description]
   - **Severity**: Critical / High / Medium / Low
   - **Steps to Reproduce**: [Steps]
   - **Expected**: [What should happen]
   - **Actual**: [What actually happens]
   - **Workaround**: [If any]

---

## Testing Complete

**Date**: **\*\***\_\_\_**\*\***
**Tester**: **\*\***\_\_\_**\*\***
**Result**: ☐ Pass ☐ Fail (with issues documented above)
**Notes**:

---

**Next Steps** (if issues found):

1. Document all issues with severity
2. Prioritize critical/high severity bugs
3. Create GitHub issues for tracking
4. Fix bugs and re-test affected scenarios
