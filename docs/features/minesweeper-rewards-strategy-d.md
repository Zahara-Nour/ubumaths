# Minesweeper Rewards - Strategy D

## Overview

Strategy D implements a **proportional reward system** with decimal gidouilles.
The key principle: **1 gidouille = meaningful achievement**.

Previously, rewards were integers (10, 30, 60) which was disproportionate.
Now rewards range from **0.3 to 8.0 gidouilles** per game.

## Formula

```
gidouilles = base × time_mult × (1 - hint_penalty) × daily_mult
```

### Base Rewards

| Difficulty   | Base | Grid Size | Mines | Density |
| ------------ | ---- | --------- | ----- | ------- |
| Beginner     | 1.0  | 9×9       | 10    | 12.3%   |
| Intermediate | 3.0  | 16×16     | 40    | 15.6%   |
| Expert       | 6.0  | 16×30     | 99    | 20.6%   |

### Time Multiplier

Continuous formula based on completion time vs reference time:

```
ratio = time / reference_time
time_mult = 1.3 - 0.5 × min(1, ratio)
```

| Performance | Ratio | Multiplier | Effect |
| ----------- | ----- | ---------- | ------ |
| Instant     | 0.0   | 1.30       | +30%   |
| Half ref    | 0.5   | 1.05       | +5%    |
| At ref      | 1.0   | 0.80       | -20%   |
| Beyond ref  | >1.0  | 0.80       | -20%   |

Reference times: Beginner=180s, Intermediate=600s, Expert=1200s

### Hint Penalty (Progressive)

Penalty increases with each hint used. Item-based hints have half penalty.

| Hints | Gidouilles Penalty | Item Penalty |
| ----- | ------------------ | ------------ |
| 0     | 0%                 | 0%           |
| 1     | 10%                | 5%           |
| 2     | 22%                | 11%          |
| 3     | 35%                | 17%          |

**Mixed hints**: Each source contributes its own penalty rate.

### Daily Degressive

Prevents farming by reducing rewards for repeated wins in a day:

| Win # Today | Multiplier |
| ----------- | ---------- |
| 1           | 100%       |
| 2           | 85%        |
| 3           | 70%        |
| 4           | 55%        |
| 5           | 40%        |
| 6+          | 30%        |

### Bounds

- **Minimum**: 0.3 gidouilles (you still won!)
- **Maximum**: 8.0 gidouilles per game

## Expected Reward Ranges

| Difficulty   | Min (slow, 3 hints) | Typical | Max (fast, 0 hints) |
| ------------ | ------------------- | ------- | ------------------- |
| Beginner     | 0.52                | 1.0     | 1.3                 |
| Intermediate | 1.56                | 3.0     | 3.9                 |
| Expert       | 3.12                | 6.0     | 7.8                 |

## Example Calculations

### Example 1: Beginner, Fast, No Hints

- Time: 45s (25% of 180s reference)
- Hints: 0

```
time_mult = 1.3 - 0.5 × 0.25 = 1.175
gidouilles = 1.0 × 1.175 × 1.0 × 1.0 = 1.18
```

### Example 2: Expert, Normal, 2 Gidouilles Hints

- Time: 600s (50% of 1200s reference)
- Hints: 2 (from gidouilles)

```
time_mult = 1.3 - 0.5 × 0.5 = 1.05
hint_penalty = 0.22 (2 hints from gidouilles)
gidouilles = 6.0 × 1.05 × 0.78 × 1.0 = 4.91
```

### Example 3: Expert, Slow, 3 Item Hints, 3rd Win Today

- Time: 1200s (at reference)
- Hints: 3 (all from items)
- Win #3 of the day

```
time_mult = 0.8 (at reference)
hint_penalty = 0.17 (3 item hints = half rate)
daily_mult = 0.7 (3rd win = 70%)
gidouilles = 6.0 × 0.8 × 0.83 × 0.7 = 2.79
```

## Hint Economics

| Item              | Old Cost | New Cost |
| ----------------- | -------- | -------- |
| Hint (gidouilles) | 10       | 1.0      |
| Hint (shop item)  | 10       | 1.0      |

**Strategy**: Buy shop items ("Indice Démineur") for half penalty rate.

## Migration Notes

### Database Changes

- `profiles.gidouilles`: INTEGER → NUMERIC(10,2)
- `minesweeper_games.gidouilles_awarded`: INTEGER → NUMERIC(10,2)
- `gidouilles_history.delta`: INTEGER → NUMERIC(10,2)

### Data Migration

- All existing gidouilles values divided by 10
- Hint cost in shop reduced from 10 to 1.0

### API Changes

- `complete_minesweeper_game` returns decimal `gidouilles_earned`
- `use_hint` returns decimal `gidouilles_spent`

## Files Modified

- `supabase/migrations/20260101100000_strategy_d_gidouilles_decimal.sql`
- `src/lib/types/minesweeper.ts` (DIFFICULTY_CONFIGS, REWARD_CONSTANTS)
- `src/routes/api/games/minesweeper/[id]/complete/+server.ts`
- `src/routes/api/games/minesweeper/[id]/hint/+server.ts`

## TypeScript Constants

```typescript
import { DIFFICULTY_CONFIGS, REWARD_CONSTANTS } from '$lib/types/minesweeper';

// Access base rewards
DIFFICULTY_CONFIGS.beginner.baseGidouilles; // 1.0
DIFFICULTY_CONFIGS.expert.baseGidouilles; // 6.0

// Access reward constants
REWARD_CONSTANTS.MIN_REWARD; // 0.3
REWARD_CONSTANTS.MAX_REWARD; // 8.0
REWARD_CONSTANTS.HINT_COST; // 1.0
```
