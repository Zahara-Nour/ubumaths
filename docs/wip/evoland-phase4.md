# Evoland Port - Phase 4 Progress

## Status: COMPLETE

**Date**: 2026-01-01
**Duration**: ~1 session

---

## Completed Tasks

### 4.1 Entity Base

- [x] `logic/entities.ts` (540 lines):
  - Entity base class with position (x, y) and grid (ix, iy)
  - Target-based movement with interpolation
  - Animation state management
  - AABB collision detection
  - Health/damage system with hit recovery
  - Serialization for save/load
  - EntityManager for collection management
  - Factory functions and utilities

### 4.2 Hero Logic

- [x] `logic/hero.ts` (380 lines):
  - Grid-based movement (default)
  - Free pixel movement (CFreeMove unlocked)
  - Sword attack with hitbox calculation
  - Push-block mechanic (25 frame threshold)
  - Inventory: keys, gold, XP, level
  - Progression flags for unlockable features
  - Direction-based sprite selection
  - Input handling with toggle detection

### 4.3 Monster AI

- [x] `logic/monster.ts` (380 lines):
  - Monster base with spawn position
  - Random walk AI (Fisher-Yates shuffle)
  - Bat AI: fly within spawn radius (4 tiles)
  - Knight AI: teleport near hero + fireball
  - Fireball projectile entity
  - MonsterManager for spawning/updates
  - Collision detection with hero/sword

### 4.4 Entity Renderer

- [x] `engine/entity-renderer.ts` (300 lines):
  - Y-sorting for depth ordering
  - Sprite definitions per entity kind
  - Directional animation frames
  - Hit flash effect (invincibility)
  - Shadow rendering
  - Sword attack rendering
  - Viewport culling

### 4.5 Tests

- [x] `logic/entities.test.ts` (60 tests)
- [x] `logic/hero.test.ts` (56 tests)
- [x] `logic/monster.test.ts` (42 tests)
- **Total: 158 new tests**

### 4.6 Code Review

- [x] Reviewed by code-reviewer agent
- [x] Fixed division by zero in moveTowardsTarget()
- [x] Fixed array mutation in randomWalk() with Fisher-Yates
- [x] Improved hitRecovery decrement with Math.max()

---

## Files Created/Modified

| File                        | Lines  | Purpose                  |
| --------------------------- | ------ | ------------------------ |
| `logic/entities.ts`         | 540    | Entity base and manager  |
| `logic/entities.test.ts`    | 330    | Entity tests             |
| `logic/hero.ts`             | 380    | Hero player logic        |
| `logic/hero.test.ts`        | 340    | Hero tests               |
| `logic/monster.ts`          | 380    | Monster AI and fireballs |
| `logic/monster.test.ts`     | 260    | Monster tests            |
| `engine/entity-renderer.ts` | 300    | Entity rendering         |
| `index.ts`                  | +4     | New exports              |
| **Total new code**          | ~2,530 |                          |

---

## Technical Decisions

1. **Entity inheritance**: Hero and Monster extend Entity base
2. **Grid vs free movement**: Grid by default, free unlocked by CFreeMove
3. **Fisher-Yates shuffle**: Better randomness than sort(() => random())
4. **Y-sorting**: Entities lower on screen render on top
5. **Hit flash**: Alternating visibility during hit recovery
6. **Deferred removal**: Entities marked removed, cleaned at frame end

---

## Entity Kinds

| EKind    | Behavior            | HP   |
| -------- | ------------------- | ---- |
| Hero     | Player controlled   | 3-10 |
| Monster  | Random walk         | 1    |
| Bat      | Fly in radius       | 1    |
| Knight   | Teleport + fireball | 3    |
| Fireball | Linear projectile   | N/A  |

---

## Movement Modes

**Grid Movement** (default):

- Tile-by-tile movement
- Can't move while already moving
- Smooth interpolation to target

**Free Movement** (unlocked):

- Pixel-based movement
- AABB collision with world
- Diagonal movement normalized

---

## Code Review Fixes

1. **Division by zero guard**:

   ```typescript
   if (distance === 0) {
   	this.target = null;
   	return false;
   }
   ```

2. **Fisher-Yates shuffle**:

   ```typescript
   for (let i = arr.length - 1; i > 0; i--) {
   	const j = Math.floor(Math.random() * (i + 1));
   	[arr[i], arr[j]] = [arr[j], arr[i]];
   }
   ```

3. **Math.max for recovery**:
   ```typescript
   this.hitRecovery = Math.max(0, this.hitRecovery - tmod);
   ```

---

## Next Phase: Phase 5 - Progression

### Files to create:

- `logic/progression.ts` - Chest system, XP/level, unlocks
- `logic/save-system.ts` - localStorage + Supabase sync

### Key challenges:

- 26 ChestKind with unique effects
- Multi-level chests (CScroll levels)
- Feature flag management
- Save state validation

---

## Recovery Information

If session crashes, resume from:

1. Phase 4 code is complete
2. Plan is at `/Users/david/.claude/plans/typed-splashing-sloth.md`
3. Next task: Phase 5.1 - Chest System
