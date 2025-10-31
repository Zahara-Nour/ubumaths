# 🎮 Navadra Game

Educational RPG game integrating math challenges with turn-based combat, spell collection, and reward progression.

**Status**: ✅ Production (Phase 1)
**Version**: 1.0.0
**Last Updated**: 2025-10-22

---

## 🚀 Quick Start

### For Students: Play the Game

1. Go to `/dashboard/navadra`
2. View your player stats and spells in your grimoire
3. Click "Combat" to start a battle
4. Select a spell and solve the math challenge
5. Defeat monsters to earn XP, prestige, and pyrs
6. XP converts to gidouilles (10 XP = 1 gidouille)

### For Developers: Setup the Game

1. Run database migrations: `pnpm db:migrate`
2. Import challenges: `pnpm game:import-challenges`
3. Setup game assets: `pnpm game:setup-assets`
4. Navigate to `/dashboard/navadra` to test

---

## 📖 Overview

Navadra is an educational RPG that combines mathematics with turn-based combat mechanics. Students collect spells, fight monsters by solving math challenges, and progress through an engaging storyline.

**Key Features**:

- **Turn-based Combat**: Fight monsters using math skills
- **Spell Collection**: Unlock and upgrade spells across 4 elements (Fire, Water, Earth, Wind)
- **Element Advantages**: Strategic combat with element weaknesses
- **Math Challenges**: 464 challenges across all grade levels
- **Reward System**: XP converts to gidouilles automatically
- **Progress Tracking**: Combat statistics, achievements, and rankings

---

## 🎯 What's Been Implemented

### Complete Features ✅

1. **Database Schema** (12 tables with RLS and triggers)
2. **Game Routes** (Fullscreen game experience)
3. **Challenge System** (Math.js-based evaluation with timer)
4. **Combat System** (Turn-based with element advantages)
5. **Spell Management** (Collection and basic deck system)
6. **Reward Integration** (XP → Gidouilles conversion)
7. **Game Stores** (Svelte 5 runes-based state management)

---

## 📋 Setup Instructions

### Step 1: Apply Database Migrations

```bash
pnpm db:migrate
```

This creates all 12 game tables with RLS policies and triggers.

**Verify migration success:**

```bash
pnpm db:status
```

### Step 2: Import Game Data

#### Import Challenges (Required)

```bash
pnpm game:import-challenges
```

This imports all 464 math challenges from JSON files into the database.

**Note**: Requires `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file.

#### Setup Game Assets (Required - for images/sounds)

```bash
pnpm game:setup-assets
```

Copies monster images, spell icons, and sounds from the original Navadra codebase to the static folder for local serving.

**Note**: This requires the `extern/navadra-jeu/` folder to exist. If you don't have it, placeholder images will be used automatically.

### Step 3: Create Test User with Spells

Since spells aren't automatically unlocked yet, you'll need to manually unlock some spells for testing.

**Option A: Via SQL**

Connect to your Supabase database and run:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
INSERT INTO game_spells (user_id, spell_num, level, element, power, type) VALUES
  ('YOUR_USER_ID', 1, 1, 'fire', 30, 'attack'),
  ('YOUR_USER_ID', 2, 1, 'fire', 50, 'attack'),
  ('YOUR_USER_ID', 6, 1, 'water', 30, 'attack'),
  ('YOUR_USER_ID', 7, 1, 'water', 50, 'attack'),
  ('YOUR_USER_ID', 11, 1, 'earth', 35, 'attack'),
  ('YOUR_USER_ID', 12, 1, 'earth', 55, 'attack'),
  ('YOUR_USER_ID', 16, 1, 'wind', 25, 'attack'),
  ('YOUR_USER_ID', 17, 1, 'wind', 45, 'attack'),
  ('YOUR_USER_ID', 8, 1, 'water', 40, 'heal'),
  ('YOUR_USER_ID', 19, 1, 'wind', 35, 'heal');
```

**Option B: Via TypeScript Script** (coming soon)

---

## 🎮 Testing the Game

### 1. Navigate to Game Hub

Go to: `http://localhost:5173/dashboard/navadra`

You should see:

- Your player stats (level, XP, prestige)
- Navigation cards (Combat, Grimoire, Succès, etc.)
- Tutorial progress indicator

### 2. View Your Spells

Go to: `http://localhost:5173/dashboard/navadra/spells`

You should see:

- Your unlocked spells grouped by element
- Spell power, level, and type
- Total pyrs per element

### 3. Start a Combat

Go to: `http://localhost:5173/dashboard/navadra/combat`

Click **"Commencer un combat"**

This will:

1. Generate a random monster based on your level
2. Create a combat instance
3. Redirect you to the combat arena

### 4. Combat Flow

In the combat arena:

1. **Select a Spell** - Choose from your available spells
2. **Click "Lancer le sort !"** - A challenge appears
3. **Solve the Challenge** - Answer the math question within the time limit
4. **See Results** - View if your answer was correct
5. **Continue** - Damage is applied, combat continues
6. **Victory!** - Defeat the monster to earn XP, prestige, and pyrs

### Expected Combat Behavior

- **Correct Answer**: Full spell damage applied
- **Wrong Answer**: 50% spell damage applied
- **Element Advantage**: Fire > Earth > Wind > Water > Fire (50% bonus damage)
- **Victory Rewards**:
  - XP (converted to gidouilles: 10:1 ratio)
  - Prestige (for rankings)
  - Element Pyrs (for the monster's element)
  - +5 bonus gidouilles per victory (from trigger)

---

## 🧪 Testing Checklist

### Basic Flow ✅

- [ ] Game hub loads with correct player stats
- [ ] Can navigate to all game sections
- [ ] Spell collection displays unlocked spells
- [ ] Can start a combat (random monster generated)

### Combat System ✅

- [ ] Monster panel shows correct HP
- [ ] Player panel shows correct level and HP
- [ ] Can select a spell
- [ ] Challenge appears after selecting spell
- [ ] Timer counts down
- [ ] Can submit answer
- [ ] Answer validation works (try both correct/incorrect)
- [ ] Damage is calculated and applied
- [ ] Monster HP decreases
- [ ] Combat log updates with each turn

### Victory Screen ✅

- [ ] Victory screen appears when monster HP reaches 0
- [ ] XP reward is displayed
- [ ] Prestige reward is displayed
- [ ] Pyrs reward is displayed
- [ ] Can return to combat selection or hub

### Reward Integration ✅

- [ ] Check `profiles` table: gidouilles increased after victory
- [ ] Check `game_players` table: XP, prestige, pyrs increased
- [ ] Check `game_players` table: `combats_won` incremented

---

## 🐛 Common Issues & Fixes

### Issue: "No challenges available"

**Cause**: Challenges not imported

**Fix**:

```bash
pnpm game:import-challenges
```

### Issue: "You don't have any spells"

**Cause**: No spells unlocked for your user

**Fix**: Manually insert spells via SQL (see Step 3 above)

### Issue: Monster image not loading

**Cause**: Assets not uploaded to Supabase Storage

**Fix**: Either:

1. Run `pnpm game:migrate-assets` (requires original Navadra assets)
2. Update monster `img_url` to use placeholder images
3. Comment out the image in `MonsterPanel.svelte` temporarily

### Issue: Database migration fails

**Cause**: Missing permissions or existing tables

**Fix**:

```bash
# Check Supabase connection
pnpm db:link

# Re-run migration
pnpm db:migrate
```

### Issue: RLS policy blocking access

**Cause**: User not authenticated or policy mismatch

**Fix**: Check that:

1. You're logged in as a student user
2. Game profile was created (check `game_players` table)
3. RLS policies allow `auth.uid()` to access data

---

## 📊 Database Inspection

### Check Game Profile Created

```sql
SELECT * FROM game_players WHERE user_id = 'YOUR_USER_ID';
```

Should show level 1, 0 XP, 0 combats, etc.

### Check Spells Unlocked

```sql
SELECT * FROM game_spells WHERE user_id = 'YOUR_USER_ID';
```

Should show 10 spells (if you inserted them).

### Check Active Combat

```sql
SELECT * FROM game_combats
WHERE organizer_id = 'YOUR_USER_ID'
AND status = 'active'
ORDER BY created_at DESC LIMIT 1;
```

Shows current combat with monster HP, combat flow, etc.

### Check Challenge Attempts

```sql
SELECT * FROM game_challenge_attempts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY attempted_at DESC LIMIT 10;
```

Shows your recent challenge attempts with success/failure.

---

## 🎨 UI Components Created

### Challenge Components

- `ChallengeContainer.svelte` - Main challenge wrapper
- `ChallengeTimer.svelte` - Countdown timer with warning states
- `ChallengeInput.svelte` - Answer input (numeric/text)
- `ChallengeResult.svelte` - Success/failure display

### Combat Components

- `MonsterCard.svelte` - Monster selection card
- `PlayerPanel.svelte` - Player HP and stats
- `MonsterPanel.svelte` - Monster HP and info
- `SpellSelector.svelte` - Choose spell for turn
- `CombatLog.svelte` - Turn-by-turn history

---

## 🔧 Development Tips

### Hot Reload

The dev server watches for file changes:

```bash
pnpm dev
```

### Type Checking

Run type checks:

```bash
pnpm check
```

### Build Test

Test production build:

```bash
pnpm build
pnpm preview
```

### Database Reset

If you need to reset game data:

```sql
-- WARNING: Deletes ALL game data!
TRUNCATE game_combats, game_spells, game_players,
  game_challenge_attempts, game_spell_decks CASCADE;
```

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Database schema with 12 tables, RLS policies, and triggers
- ✅ Game profile auto-creation on first login
- ✅ Turn-based combat system with element advantages
- ✅ Spell collection and management (4 elements)
- ✅ Math challenge system with 464 challenges (Math.js evaluation)
- ✅ Challenge timer with warning states
- ✅ XP → Gidouilles automatic conversion (10:1 ratio)
- ✅ Combat statistics tracking (wins, attempts, pyrs)
- ✅ Victory rewards (XP, prestige, pyrs)
- ✅ Challenge attempt history

### In Progress 🔄

- 🔄 Spell unlocking system (automatic from combat victories)
- 🔄 Deck builder UI (choose 10 spells from collection)
- 🔄 Achievement system (definitions and progress tracking)
- 🔄 Monster variety (names, images, categories)

### Planned 📝

- 📝 Additional challenge types (multiple choice, drag-and-drop, geometry)
- 📝 Boss monsters and special encounters
- 📝 Achievement notifications and rewards
- 📝 Multiplayer combat (WebSocket support)
- 📝 Performance optimizations (caching, image preloading)
- 📝 Storyline progression system
- 📝 Leaderboards and rankings

---

## 📝 Next Development Steps

### Priority 1: Spell Unlocking System

Currently, spells must be manually inserted. Next steps:

1. Create starter spell unlock on first game load
2. Add spell unlock rewards from combat victories
3. Create spell unlock modal/celebration

### Priority 2: Deck Builder

Currently, first 10 spells are used automatically. Add:

1. Deck creation UI
2. Spell selection (choose 10 from collection)
3. Multiple deck support
4. Active deck switching

### Priority 3: More Challenge Types

Currently supports only numeric input. Add:

1. Multiple choice challenges
2. Drag-and-drop challenges
3. Geometry challenges (with JSXGraph)
4. Table-based challenges

### Priority 4: Monster Variety

Currently uses placeholder monster data. Add:

1. Monster name generator
2. Monster image mapping
3. More monster categories
4. Boss monsters

### Priority 5: Achievements

1. Seed achievement definitions
2. Track achievement progress
3. Display achievement notifications
4. Achievement rewards

---

## 🚀 Performance Optimization

### Recommended for Production

1. **Enable caching** for challenge definitions
2. **Preload images** for monsters and spells
3. **Optimize challenge query** (add indexes)
4. **Batch combat flow updates** (reduce DB writes)
5. **Add WebSocket support** for multiplayer (Phase 3)

---

## 📞 Support

### Stuck? Check:

1. Browser console for errors
2. Supabase logs in dashboard
3. Network tab for failed requests
4. Database logs for query errors

### Debug Mode

Add to your challenge components:

```svelte
<pre>{JSON.stringify(challengeInstance, null, 2)}</pre>
```

---

## ✨ What's Working

- ✅ Full database schema with RLS
- ✅ Game profile auto-creation
- ✅ Challenge variable evaluation with Math.js
- ✅ Turn-based combat system
- ✅ Spell selection and casting
- ✅ Damage calculation with element advantages
- ✅ Victory detection and rewards
- ✅ XP → Gidouilles conversion
- ✅ Combat statistics tracking
- ✅ Challenge attempt history

---

## 🎯 Success Criteria

You'll know it's working when you can:

1. ✅ Start a combat
2. ✅ Select a spell
3. ✅ See a math challenge
4. ✅ Submit an answer
5. ✅ See damage applied to monster
6. ✅ Defeat the monster
7. ✅ See victory screen with rewards
8. ✅ Verify gidouilles increased in main dashboard

---

**Ready to test? Let's go! 🎮🧮**

## Start here: `http://localhost:5173/dashboard/navadra`

[← Back to Features](../README.md)
