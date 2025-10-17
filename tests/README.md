# Navadra Game Testing Documentation

**Author**: Claude Code
**Date**: 2025-10-17
**Status**: Phase 1 Testing Infrastructure

---

## Table of Contents

1. [Overview](#overview)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Fixtures](#test-fixtures)
5. [Unit Tests](#unit-tests)
6. [E2E Tests](#e2e-tests)
7. [Test Data Management](#test-data-management)
8. [Coverage Goals](#coverage-goals)
9. [CI/CD Integration](#cicd-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This test suite validates the Navadra Phase 1 implementation (Solo Combat + Challenges) before proceeding to Phase 2. It includes:

- **Unit Tests** (Vitest): Game logic calculations and challenge system
- **E2E Tests** (Playwright): Full user flows and UI interactions
- **Test Fixtures**: Reusable test data and mocking utilities

### Testing Philosophy

- **100% coverage** on game logic (combat.ts, challenge-variables.ts)
- **80% coverage** on server actions
- **Comprehensive error handling** for all edge cases
- **Gradual expansion**: Start with 3 simple challenge types, expand to all

---

## Test Structure

```
tests/
├── fixtures/
│   └── game-fixtures.ts          # Test data factories + seed data
├── seed-test-data.ts             # Seed local DB for e2e
├── cleanup-test-data.ts          # Clean up after e2e
└── README.md                     # This file

src/lib/utils/game/
├── combat.test.ts                # Unit: Combat calculations
├── challenge-variables.test.ts   # Unit: Challenge system

e2e/navadra/
├── student-combat-flow.spec.ts   # E2E: Full combat flow
├── challenge-types.spec.ts       # E2E: Challenge validation
├── leveling-progression.spec.ts  # E2E: XP/leveling (TODO)
└── spell-management.spec.ts      # E2E: Spell system (TODO)
```

---

## Running Tests

### 🚀 Quick Start (Complete Workflow)

```bash
# 1. Start Supabase
npx supabase start

# 2. Seed test data
npx tsx tests/seed-test-data.ts

# 3. Run tests
pnpm test:unit                    # Unit tests first
pnpm test:e2e                     # Then E2E tests

# 4. View coverage (opens in browser)
open coverage/index.html

# 5. Cleanup
npx tsx tests/cleanup-test-data.ts

# 6. Stop Supabase (optional)
npx supabase stop
```

### Prerequisites

Before running tests for the first time:
1. **Install dependencies**: `pnpm install`
2. **Install Playwright browsers**: `npx playwright install --with-deps`
3. **Docker installed** (required for local Supabase)
4. **Local Supabase configured** with test users

#### What is Local Supabase?

Local Supabase is a **complete local database stack** running on your machine, NOT a client for remote Supabase.

When you run `npx supabase start`, it spins up:
- **PostgreSQL Database** - Real Postgres on `localhost:54322`
- **PostgREST API** - REST API on `localhost:54321`
- **GoTrue Auth** - Authentication service
- **Realtime Server** - WebSocket server
- **Storage API** - File storage
- **Studio Dashboard** - Web UI on `http://localhost:54323`

**Key Points:**
- ✅ **Completely isolated** - No connection to production Supabase
- ✅ **Uses Docker** - Runs all services in containers
- ✅ **Disposable** - Data resets when you stop/restart
- ✅ **Same as production** - Exact same stack, just local
- ✅ **Fast & safe** - No network latency, won't affect production

**Useful Commands:**
```bash
# Check local Supabase status
npx supabase status

# Reset local database (wipe all data)
npx supabase db reset

# View Studio dashboard
open http://localhost:54323
```

### Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Run with coverage report
pnpm test:unit -- --coverage

# Run in watch mode (auto-rerun on file changes)
pnpm test:unit -- --watch

# Run specific test file
pnpm test:unit -- combat           # runs combat.test.ts
pnpm test:unit -- challenge        # runs challenge-variables.test.ts
```

### E2E Tests

**Prerequisites:**
1. Local Supabase running: `npx supabase start`
2. Test data seeded: `npx tsx tests/seed-test-data.ts`

```bash
# Run all e2e tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- combat-flow       # runs student-combat-flow.spec.ts
pnpm test:e2e -- challenge-types   # runs challenge-types.spec.ts
pnpm test:e2e -- error-scenarios   # runs error-scenarios.spec.ts

# Run with visible browser (debug mode)
pnpm test:e2e -- --headed

# Run in specific browser
pnpm test:e2e -- --project=chromium
pnpm test:e2e -- --project=firefox
```

**Cleanup after tests:**
```bash
npx tsx tests/cleanup-test-data.ts
```

### All Tests

```bash
# Run unit + e2e tests sequentially
pnpm test
```

### Debugging Failed Tests

```bash
# Run specific test in debug mode
pnpm test:e2e -- --headed --debug

# Generate detailed report
pnpm test:e2e -- --reporter=html

# View Playwright report
npx playwright show-report

# Pause test execution for debugging
# Add await page.pause() in your test code
```

### CI/CD (GitHub Actions)

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

View results in GitHub Actions tab of your repository.

---

## Test Fixtures

### Location
`tests/fixtures/game-fixtures.ts`

### Factory Functions

```typescript
import {
  createTestPlayer,
  createTestMonster,
  createTestChallenge,
  createTestCombat,
  createTestSpell
} from '../tests/fixtures/game-fixtures';

// Create test player with overrides
const player = createTestPlayer({
  level: 10,
  xp: 5000,
  pyrs_fire: 200
});

// Create test monster (category: common, elite, legendary)
const monster = createTestMonster('legendary', {
  element: 'fire',
  level: 20
});

// Create test challenge (type: addition, subtraction, multiplication)
const challenge = createTestChallenge('addition', 3); // difficulty 3
```

### Seed Data Collections

Pre-defined test data for common scenarios:

```typescript
import { TEST_MONSTERS, TEST_CHALLENGES, TEST_SPELLS } from '../tests/fixtures/game-fixtures';

// Access predefined monsters
const fireMonster = TEST_MONSTERS.fire;
const legendaryDragon = TEST_MONSTERS.legendary;

// Access predefined challenges
const easyAddition = TEST_CHALLENGES.addition_easy;
const hardMultiplication = TEST_CHALLENGES.multiplication_hard;
```

### Seeded Random Numbers

For deterministic tests:

```typescript
import { seedRandom, resetRandom } from '../tests/fixtures/game-fixtures';

beforeEach(() => {
  seedRandom(12345); // Reproducible RNG
});

afterEach(() => {
  resetRandom(); // Restore native Math.random
});
```

---

## Unit Tests

### Combat Calculations (`combat.test.ts`)

Tests all combat calculation functions with **100% coverage goal**:

- ✅ `calculateDamage()` - Base damage, level bonus, element advantage, critical hits
- ✅ `calculateHealing()` - Healing amounts, level scaling
- ✅ `calculateMonsterDamage()` - Monster damage with player level reduction
- ✅ `getElementAdvantage()` - Element advantage system (fire>earth>wind>water>fire)
- ✅ `calculateXPReward()` - XP based on monster category, perfect rounds
- ✅ `calculatePrestigeReward()` - Prestige with speed/perfect bonuses
- ✅ `calculatePyrsReward()` - Pyrs based on element
- ✅ `calculatePlayerMaxEndurance()` - Player HP scaling
- ✅ `calculateSpellUpgradeCost()` - Exponential upgrade costs
- ✅ `calculateSpellPower()` - Power scaling by level
- ✅ `generateRandomMonster()` - Monster generation with deterministic RNG

**Run tests:**
```bash
pnpm test:unit -- combat
```

### Challenge System (`challenge-variables.test.ts`)

Tests challenge generation and validation with **100% coverage goal**:

- ✅ `generateChallengeInstance()` - Variable evaluation, dependencies, randomization
- ✅ `interpolateQuestion()` - Question template interpolation
- ✅ `validateAnswer()` - Numeric, string, array validation with tolerance
- ✅ `formatAnswer()` - Answer display formatting
- ✅ Math.js functions: `randomInt`, `pickRandom`, `pgcd`, `ppcm`
- ✅ Topological sorting for variable dependencies
- ✅ Edge cases: circular dependencies, division by zero, missing variables

**Simple Challenge Types (Prioritized):**
- ✅ Addition challenges
- ✅ Subtraction challenges
- ✅ Multiplication challenges

**Run tests:**
```bash
pnpm test:unit -- challenge
```

---

## E2E Tests

### Combat Flow (`student-combat-flow.spec.ts`)

Tests complete combat experience:

- ✅ **Victory scenario**: Complete combat with correct answers
- ✅ **Defeat scenario**: Lose combat by failing challenges
- ✅ **Abandon combat**: Forfeit mid-session
- ✅ **Timer timeout**: Challenge auto-fails when time expires
- ✅ **State persistence**: Combat state survives page refresh
- ✅ **Combat log**: Turn history displays correctly
- ✅ **Element advantage**: Damage bonuses for elemental matchups

**Run tests:**
```bash
pnpm test:e2e -- combat-flow
```

### Challenge Types (`challenge-types.spec.ts`)

Tests challenge UI and validation:

- ✅ **Addition challenges**: Correct/incorrect answers, hints
- ✅ **Subtraction challenges**: Including negative results
- ✅ **Multiplication challenges**: Large number handling
- ✅ **Timer display**: Countdown visualization
- ✅ **Difficulty scaling**: Number ranges per difficulty level
- ✅ **Answer validation**: Tolerance, whitespace trimming
- ✅ **Challenge history**: Attempt tracking

**Run tests:**
```bash
pnpm test:e2e -- challenge-types
```

### Leveling & Progression (TODO)

```bash
pnpm test:e2e -- leveling
```

### Spell Management (TODO)

```bash
pnpm test:e2e -- spell
```

---

## Test Data Management

### Seeding Test Data

**Script**: `tests/seed-test-data.ts`

Seeds test data into local Supabase:
- 7 test monsters (common, elite, legendary + all elements)
- 7 test challenges (addition, subtraction, multiplication at various difficulties)
- 4 test spells (fire, water, earth, wind)
- 1 test player profile
- 1 active spell deck

**Environment Variables** (`.env.test` or shell):
```bash
PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-key
TEST_STUDENT_ID=uuid-of-test-student
TEST_TEACHER_ID=uuid-of-test-teacher
```

**Run seeding:**
```bash
npx tsx tests/seed-test-data.ts
```

### Cleanup After Tests

**Script**: `tests/cleanup-test-data.ts`

Removes test combat sessions and resets player progress while preserving reusable data (monsters, challenges).

**Run cleanup:**
```bash
npx tsx tests/cleanup-test-data.ts
```

### Test Data Lifecycle

**Before Test Suite:**
1. Start local Supabase: `npx supabase start`
2. Run seed script: `npx tsx tests/seed-test-data.ts`
3. Run e2e tests: `pnpm test:e2e`

**After Test Suite:**
1. Run cleanup script: `npx tsx tests/cleanup-test-data.ts`

**Note**: Monsters and challenges are preserved across test runs for performance.

---

## Coverage Goals

### Unit Tests: 100% Coverage on Game Logic

- ✅ `combat.ts`: 100% (all calculation functions)
- ✅ `challenge-variables.ts`: 100% (all evaluation functions)
- ⏳ `assets.ts`: 80% (asset URL helpers)

### E2E Tests: Critical Paths + Major Errors

- ✅ Happy path: Student completes combat and wins
- ✅ Error scenarios: Defeat, abandonment, timeout
- ✅ State recovery: Page refresh, network errors
- ⏳ Edge cases: Concurrent actions, browser state

### Coverage Report

```bash
pnpm test:unit -- --coverage
```

**Output**: `coverage/index.html`

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test-navadra.yml`

```yaml
name: Test Navadra Phase 1
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:unit -- --run

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: npx supabase start
      - run: npx tsx tests/seed-test-data.ts
      - run: pnpm test:e2e
      - run: npx tsx tests/cleanup-test-data.ts
```

### Pre-commit Hook

Add to `package.json`:

```json
{
  "scripts": {
    "precommit": "pnpm test:unit -- --run"
  }
}
```

Or use Husky:

```bash
npx husky add .husky/pre-commit "pnpm test:unit -- --run"
```

---

## Troubleshooting

### Unit Tests Fail with Math.random Issues

**Problem**: Random number generation causes non-deterministic test failures.

**Solution**: Use seeded RNG:

```typescript
import { seedRandom, resetRandom } from '../tests/fixtures/game-fixtures';

beforeEach(() => seedRandom(12345));
afterEach(() => resetRandom());
```

### E2E Tests Can't Find Elements

**Problem**: Selectors don't match actual DOM structure.

**Solution**:
1. Verify component structure: `await page.pause()` to debug
2. Use data attributes: `data-testid="combat-arena"`
3. Check timing: Add `await expect(element).toBeVisible()` before interactions

### Test Database Connection Fails

**Problem**: E2E tests can't connect to Supabase.

**Solution**:
1. Check Supabase is running: `npx supabase status`
2. Verify environment variables: `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. Check firewall/ports: Port 54321 should be accessible

### Tests Pass Locally but Fail in CI

**Problem**: Different environment between local and CI.

**Solution**:
1. Ensure CI uses same Node version: Check `.nvmrc`
2. Install all dependencies: `pnpm install --frozen-lockfile`
3. Use local Supabase in CI: Add Supabase setup step

### Challenge Validation Fails Unexpectedly

**Problem**: `validateAnswer()` rejects correct answers.

**Solution**:
1. Check tolerance: Default is 0.01 for numeric answers
2. Verify type matching: String vs Number comparison
3. Log debug info: Console.log in `validateAnswer()` function

---

## Next Steps

### Week 1: Foundation ✅
- [x] Create test fixtures and factories
- [x] Write unit tests for combat calculations
- [x] Write unit tests for challenge variable system

### Week 2: E2E Critical Path ✅
- [x] Set up test data seeding
- [x] Write combat flow e2e tests
- [x] Write challenge types e2e tests

### Week 3: Error Scenarios 🔄
- [ ] Add network error tests
- [ ] Add concurrent action tests
- [ ] Add browser state recovery tests
- [ ] Add edge case tests

### Week 4: CI/CD & Documentation ⏳
- [ ] Set up GitHub Actions workflow
- [ ] Add pre-commit hooks
- [ ] Generate coverage reports
- [ ] Write test maintenance guide

---

## Additional Resources

- **Vitest Docs**: https://vitest.dev/
- **Playwright Docs**: https://playwright.dev/
- **Supabase Testing**: https://supabase.com/docs/guides/local-development
- **Project Testing Guidelines**: `CLAUDE.md#testing-architecture`

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions**: See project documentation or ask in team chat
