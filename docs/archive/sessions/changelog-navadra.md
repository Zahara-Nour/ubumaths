# Navadra Game - Changelog

All notable changes to the Navadra game integration will be documented in this file.

## [Unreleased]

### Fixed - 2025-10-17

#### Unit Test Failures

- **Issue**: 3 test suites failing with 2 failed tests out of 88 total
- **Root Causes & Fixes**:
  1. **Syntax Error**: Curly quotes in test descriptions replaced with straight quotes
  2. **Import Paths**: Moved test fixtures from `tests/fixtures/` to `src/lib/test-utils/` for better Vitest compatibility
  3. **Page Component Import**: Relocated test file to same directory as component for proper path resolution
  4. **pickRandom Function**: Updated to handle Math.js Matrix objects by converting to JavaScript arrays using `.toArray()`
  5. **Combat Test Assertion**: Changed hardcoded HP expectation to dynamic calculation based on randomized monster level
- **Files Changed**:
  - `src/lib/utils/game/challenge-variables.ts` (lines 36-40)
  - `src/lib/utils/game/challenge-variables.test.ts` (lines 435, 448, 118)
  - `src/lib/utils/game/combat.test.ts` (lines 448-451)
  - `src/routes/(public)/page.svelte.spec.ts` (moved from `src/routes/`, updated import to `./+page.svelte`)
  - `src/lib/test-utils/game-fixtures.ts` (moved from `tests/fixtures/`)
- **Result**: ✅ All 88 unit tests now passing
- **Impact**: Test suite fully operational for CI/CD integration

#### Victory Panel Rewards Display

- **Issue**: XP, prestige, and pyrs rewards were displaying as 0 after defeating monsters
- **Cause**: Incorrect parsing of nested PostgreSQL array format in server response
- **Fix**: Updated client-side parsing logic to properly decode nested reward mappings
- **Files Changed**:
  - `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.svelte` (lines 148-165)
- **Impact**: Victory panel now correctly displays all earned rewards (XP, prestige, pyrs)

### Added - 2025-10-17

#### Debug Monster Feature

- **Purpose**: Enable rapid testing of victory conditions and reward display
- **Implementation**: New `spawnDebugMonster` server action
- **Monster Stats**:
  - Level 1
  - 1 HP (defeats in one hit)
  - Fire element, Common category
  - Name: "🐛 [MonsterName] DEBUG"
- **Access**: Yellow button at `/dashboard/navadra/combat`
- **Files Changed**:
  - `src/routes/(protected)/dashboard/navadra/combat/+page.server.ts` (lines 44-101)
  - `src/routes/(protected)/dashboard/navadra/combat/+page.svelte` (lines 46-64)
- **Use Case**: Development and QA testing

### Documentation - 2025-10-17

#### Updated Documentation Files

- `DATABASE_SCHEMA.md`: Added Debug Features section with victory panel response format
- `NAVADRA_IMPLEMENTATION_COMPLETE.md`: Added Recent Fixes & Improvements section

## [1.0.0] - 2025-10-15

### Added

- Complete Navadra game integration (Phase 1)
- 14 database migration files
- Full combat system with turn-based mechanics
- 464 math challenge definitions
- Player progression (XP, levels, prestige)
- Spell collection and deck management
- Achievement system
- Leaderboard system
- Complete RLS policies and database triggers
- TypeScript type definitions
- Svelte 5 reactive stores
- UI components for all game features

---

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes
- **Documentation**: Documentation updates
