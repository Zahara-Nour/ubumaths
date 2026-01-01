# Evoland Port - Phase 8: Rendering & Game Integration

## Status: IN PROGRESS

## Overview

This phase connects the canvas renderer to actual game logic with sprite rendering, combat system, and progression mechanics.

---

## Completed Work

### 1. Sprite Sheet System

**Files:**

- `src/lib/games/evoland/engine/sprite-sheet.ts` - Sprite loading with magenta transparency
- `src/lib/games/evoland/engine/sprite-mapping.ts` - Sprite positions based on Haxe EKind enum

**Key insight:** Sprite positions follow original Haxe enum indices:

- `row = Type.enumIndex(kind)` for entities (EKind)
- `row = Type.enumIndex(block) - 1` for tiles (Block)

**Sprite positions verified:**
| Entity | EKind Index | Row |
|--------|-------------|-----|
| NPC | 0 | 0 |
| Chest | 1 | 1 |
| Monster (Slime) | 2 | 2 |
| Sword | 3 | 3 |
| SavePoint | 4 | 4 |
| Cursor | 5 | 5 |
| Hero | 6 | 6 |
| HeroUp | 7 | 7 |
| Bat | 8 | 8 |
| Knight | 9 | 9 |
| Fireball | 10 | 10 |

### 2. Tile Rendering

- Tiles render correctly with culling (only visible tiles)
- Camera follows hero after CScroll chest
- Fixed sub-pixel artifacts by rounding camera/entity positions
- Removed camera smoothing to match original Evoland (direct follow)

### 3. Combat System

- Sword attack with Space key
- Sword hitbox collision with monsters
- Monsters spawn after CMonsters chest
- XP gain after CLevelUp chest
- Gold drops from killed monsters
- Hero takes damage on monster contact
- Hit recovery (invulnerability frames)

### 4. Hero Animation

- Walking animation cycles between frame 0 and frame 1
- Static frame when standing still
- Correct sprite rows for each direction (row 6 down/left/right, row 7 up)
- Horizontal flip for right-facing sprites

### 5. Sword Rendering

- Sword sprite at row 3, col 0
- Correct rotation based on direction (sprite points DOWN in sheet)
  - Down: 0° (no rotation)
  - Up: 180°
  - Left: 90° clockwise
  - Right: 90° counter-clockwise

### 6. Chest System

- Chests disappear when opened (matches original behavior)
- Dialog shows chest name and description
- Progression flags applied correctly

### 7. HUD Fixes

- XP bar only shows after CLevelUp chest (uses `flags.levelUpEnabled`)
- Gold only shows when > 0
- Keys only shows when > 0

### 8. Input System

- Fixed toggle detection: get state BEFORE incrementing frame counter
- Attack (Space) now triggers sword correctly

### 9. Chest Data Fixes

- CRightCtrl renamed to "Fleches Haut/Bas" (unlocks up/down, not right)

---

## Commits

| Commit                                            | Description                        |
| ------------------------------------------------- | ---------------------------------- |
| `fix(evoland): correct tile sprite positions`     | Tile sprites use row = Block - 1   |
| `fix(evoland): fix input toggle detection`        | Swap order: getState before update |
| `fix(evoland): correct sword sprite position`     | Sword at row 3                     |
| `fix(evoland): correct all sprite positions`      | Based on Haxe EKind enum           |
| `fix(evoland): fix camera scrolling`              | Use progression flag, not config   |
| `fix(evoland): round camera and entity positions` | Prevent sub-pixel artifacts        |
| `fix(evoland): remove camera smoothing`           | Match original Evoland behavior    |
| `fix(evoland): correct CRightCtrl chest name`     | "Fleches Haut/Bas"                 |
| `fix(evoland): correct sword sprite rotation`     | Base sprite points DOWN            |
| `fix(evoland): chests disappear when opened`      | Match original behavior            |
| `feat(evoland): add hero walking animation`       | Use animation.frame for walk cycle |
| `fix(evoland): hide XP bar until CLevelUp`        | Use flags.levelUpEnabled           |

---

## Test World

Current test world (30x25 tiles) includes:

- Field area with trees border
- Water pond
- Scattered rocks and bushes
- 6 test chests:
  - (53, 78) CLeftCtrl - Unlock left movement
  - (55, 78) CRightCtrl - Unlock up/down movement
  - (57, 78) CScroll - Enable scrolling
  - (53, 76) CWeapon - Get sword
  - (55, 76) CMonsters - Enable monsters
  - (57, 76) CLevelUp - Enable XP system
- 4 test monsters:
  - 3 Slimes at (50-54, 75)
  - 1 Bat at (47, 78)

---

## Testing Checklist

### Movement

- [x] Right movement (always available)
- [x] Left movement (after CLeftCtrl)
- [x] Up/Down movement (after CRightCtrl)
- [x] Grid-based movement

### Scrolling

- [x] Camera follows hero (after CScroll)
- [x] No flashing lines between tiles
- [x] No stuttering

### Combat

- [x] Sword attack (Space, after CWeapon)
- [x] Sword points in correct direction
- [x] Monsters visible (after CMonsters)
- [x] Kill monsters with sword
- [x] Hero takes damage on contact
- [x] XP gain (after CLevelUp)

### Sprites

- [x] Hero sprite in all directions
- [x] Hero walking animation
- [x] Tile sprites (grass, trees, water, rocks)
- [x] Monster sprites (slime, bat)
- [x] Chest sprite (closed only, disappears when opened)
- [x] Sword sprite with rotation

### HUD

- [x] HP display
- [x] Gold display (when > 0)
- [x] XP/Level display (after CLevelUp)
- [x] Keys display (when > 0)

---

## Next Steps

1. **Load real world from PNG** - Convert world.png to tile data
2. **Add more chest types** - Color levels, zoom, sounds, music
3. **Dungeon system** - Load dungeon.png, separate world
4. **NPC interactions** - Dialog system for NPCs
5. **Save/Load** - Persist game state

---

## Reference: Original Haxe Files

Key files in `extern/EvolandClassicJoshua/`:

- `src/Entity.hx` - Sprite indexing: `sprites[Type.enumIndex(kind)]`
- `src/Hero.hx` - Movement, animation, sword attack
- `src/Game.hx` - Chest opening: `c.e.remove()` (chests disappear)
- `src/Chests.hx` - Chest types and descriptions
- `lib/Tiles.hx` - Tile sprite loading
- `src/World.hx` - World collision and tile management
