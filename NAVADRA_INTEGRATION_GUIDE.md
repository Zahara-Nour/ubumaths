# Navadra Game Integration Guide for UbuMaths

**Author**: Claude Code
**Date**: October 15, 2025
**Status**: Planning Phase - Phase 1 Implementation
**Purpose**: Complete guide for integrating the full Navadra educational RPG game into the UbuMaths platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Design](#database-design)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Asset Migration Strategy](#asset-migration-strategy)
7. [Challenge System Integration](#challenge-system-integration)
8. [Combat System Architecture](#combat-system-architecture)
9. [Integration Points with UbuMaths](#integration-points-with-ubumaths)
10. [Implementation Phases](#implementation-phases)
11. [Technical Challenges & Solutions](#technical-challenges--solutions)
12. [Security & Performance Considerations](#security--performance-considerations)
13. [Testing Strategy](#testing-strategy)
14. [Deployment Plan](#deployment-plan)

---

## Executive Summary

### Project Goals

Integrate the **complete Navadra educational math game** into UbuMaths, transforming it from a standalone PHP application into a fully integrated Svelte 5 + SvelteKit module with the following characteristics:

- **Full-featured RPG experience**: Combat, progression, spells, monsters, achievements
- **Educational integration**: 464 math challenges across 4 elements (Fire, Water, Earth, Wind)
- **Multiplayer support**: Friend-based combat invitations using existing UbuMaths friend system
- **Teacher oversight**: Progress monitoring, difficulty management, analytics
- **Reward integration**: XP and victories convert to gidouilles (UbuMaths currency)
- **Fullscreen experience**: Browser-takeover game mode with seamless exit
- **Real-time features**: WebSocket-based chat and combat coordination

### Key Metrics

| Metric          | Original Navadra                          | Target UbuMaths Integration                       |
| --------------- | ----------------------------------------- | ------------------------------------------------- |
| **Codebase**    | ~5,380 lines PHP + 20,944 lines JS        | Rewritten in TypeScript/Svelte 5                  |
| **Challenges**  | 464 JSON files (~4 elements × ~120 types) | All ported, stored in Supabase                    |
| **Assets**      | 90MB images + 25MB sounds                 | Optimized, hosted in Supabase Storage             |
| **Database**    | MySQL (~15 tables)                        | PostgreSQL via Supabase (~12 new tables)          |
| **Auth System** | Custom PHP sessions                       | UbuMaths Supabase Auth                            |
| **Real-time**   | Ratchet WebSocket server                  | Existing UbuMaths WebSocket (already implemented) |

### Implementation Timeline Estimate

**Phase 1 (Priority)**: Solo Combat + Challenges

- **Estimated**: 8-12 weeks
- **Deliverable**: Students can play solo combat with math challenges

**Phase 2**: RPG Progression System

- **Estimated**: 4-6 weeks
- **Deliverable**: Levels, XP, spell unlocking, achievements

**Phase 3**: Multiplayer & Social Features

- **Estimated**: 4-5 weeks
- **Deliverable**: Friend invites, team combat, leaderboards

**Phase 4**: Teacher Tools & Analytics

- **Estimated**: 3-4 weeks
- **Deliverable**: Progress dashboards, difficulty management

**Total Estimate**: 19-27 weeks (5-7 months)

---

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        UbuMaths Platform                         │
│  (SvelteKit + Svelte 5 + TypeScript + Tailwind + Shadcn)       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         Dashboard      Navadra Game    Teacher Tools
              │               │               │
              │         ┌─────┴─────┐         │
              │         │           │         │
              │    Combat System  Challenge  │
              │         │         System      │
              │         │           │         │
              └─────────┼───────────┼─────────┘
                        │           │
                ┌───────┴───────────┴───────┐
                │    Supabase Backend       │
                │  • PostgreSQL Database    │
                │  • Authentication         │
                │  • Storage (Assets)       │
                │  • Real-time (WebSocket)  │
                └───────────────────────────┘
```

### Key Architectural Decisions

#### 1. **Routing Strategy**

**Decision**: Create a dedicated protected route group for the game

```
src/routes/
  (protected)/
    dashboard/
      navadra/              # NEW: Game route group
        +layout.svelte      # Game shell (fullscreen wrapper)
        +layout.server.ts   # Game-specific data loading
        +page.svelte        # Game hub/menu
        combat/
          [combatId]/
            +page.svelte    # Active combat page
        challenges/
          [challengeId]/
            +page.svelte    # Challenge page
        spells/
          +page.svelte      # Spell management
        achievements/
          +page.svelte      # Achievements page
        leaderboard/
          +page.svelte      # Leaderboard
```

**Why?**

- Leverages existing `(protected)` auth layer
- Fullscreen layout isolated in `navadra/+layout.svelte`
- URL structure: `/dashboard/navadra/combat/123`
- Easy to add teacher monitoring at `/dashboard/navadra/teacher/*`

#### 2. **State Management Strategy**

**Decision**: Use Svelte 5 runes with strategic SvelteKit stores for real-time

```typescript
// Game state hierarchy
$lib/stores/game/
  player.svelte.ts       # Player stats, XP, level (Svelte 5 rune store)
  combat.svelte.ts       # Active combat state (runes)
  spells.svelte.ts       # Player's spell deck (runes)
  challenge.svelte.ts    # Active challenge state (runes)
  websocket.svelte.ts    # Real-time combat sync (existing WS store)
```

**Why?**

- Svelte 5 runes provide reactive, type-safe state
- Existing WebSocket store already handles real-time communication
- Can persist state to localStorage for "save progress on exit"
- Easy to derive computed values with `$derived`

#### 3. **Data Flow Pattern**

```
User Action (Combat/Challenge)
    ↓
Svelte Component (optimistic update)
    ↓
SvelteKit Server Action (+page.server.ts)
    ↓
Supabase Database Transaction
    ↓
Server Response → Component Update
    ↓
WebSocket Broadcast (multiplayer only)
    ↓
Other Players' UI Updates
```

**Pattern**: Optimistic UI with server reconciliation (like rewards system)

---

## Database Design

### New Tables Required

We need **12 new tables** to support the full game. Here's the complete schema:

#### 1. **`game_players`** - Player Game Profile

Extends the existing `profiles` table with game-specific data.

```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RPG Stats
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  prestige INTEGER NOT NULL DEFAULT 0,  -- Overall score/rank

  -- Element Affinities (Pyrs = in-game currency for each element)
  pyrs_fire INTEGER NOT NULL DEFAULT 0,
  pyrs_water INTEGER NOT NULL DEFAULT 0,
  pyrs_earth INTEGER NOT NULL DEFAULT 0,
  pyrs_wind INTEGER NOT NULL DEFAULT 0,

  -- Element Pyrs spent (for tracking)
  pyrs_fire_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_water_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_earth_spent INTEGER NOT NULL DEFAULT 0,
  pyrs_wind_spent INTEGER NOT NULL DEFAULT 0,

  -- Game Progress
  tutorial_stage TEXT NOT NULL DEFAULT 'cinematic_0',  -- Tutorial progression
  tutorial_completed_at TIMESTAMPTZ,
  total_combats INTEGER NOT NULL DEFAULT 0,
  combats_won INTEGER NOT NULL DEFAULT 0,
  combats_lost INTEGER NOT NULL DEFAULT 0,

  -- Settings
  help_bubbles_enabled BOOLEAN NOT NULL DEFAULT true,
  help_bubbles_seen TEXT[] NOT NULL DEFAULT '{}',  -- IDs of seen help tips
  music_settings JSONB NOT NULL DEFAULT '{"enabled": true, "volume": 0.7}'::jsonb,

  -- Timestamps
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_players_level ON game_players(level DESC);
CREATE INDEX idx_game_players_prestige ON game_players(prestige DESC);
```

**Integration with `profiles`**:

- XP from game feeds into gidouilles: `gidouilles += (xp_gained / 10)`
- Combat victories give bonus gidouilles: `+5 per win`

#### 2. **`game_spells`** - Player Spell Collection

```sql
CREATE TABLE game_spells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  spell_num INTEGER NOT NULL,  -- Spell identifier (1-50+)
  level INTEGER NOT NULL DEFAULT 1,  -- Upgrade level (1-5)
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind')),

  -- Spell Stats (calculated based on level)
  power INTEGER NOT NULL,  -- Damage/healing amount
  type TEXT NOT NULL CHECK (type IN ('attack', 'heal', 'buff', 'debuff')),

  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_upgraded_at TIMESTAMPTZ,

  UNIQUE(user_id, spell_num),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_spells_user_id ON game_spells(user_id);
CREATE INDEX idx_game_spells_element ON game_spells(element);
```

**Spell System**:

- Each spell has 5 upgrade levels
- Upgrading costs element-specific Pyrs
- Players choose 10 spells for their "deck" before combat

#### 3. **`game_monsters`** - Monster Instances

```sql
CREATE TABLE game_monsters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Monster Definition
  name TEXT NOT NULL,  -- e.g., "Cobra", "Dragon de Feu"
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind')),
  level INTEGER NOT NULL,  -- 1-50
  category TEXT NOT NULL CHECK (category IN ('common', 'elite', 'legendary')),

  -- Monster Stats
  max_endurance INTEGER NOT NULL,  -- HP
  attack_coefficient FLOAT NOT NULL,  -- Damage multiplier

  -- Visual
  img_url TEXT NOT NULL,  -- Path to monster image
  img_head_url TEXT NOT NULL,  -- Path to monster head icon

  -- Spawn Info
  position TEXT,  -- Serialized position data (for map, future feature)
  spawned_by UUID REFERENCES profiles(id),  -- Teacher-spawned monsters
  spawned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  is_dead BOOLEAN NOT NULL DEFAULT false,
  defeated_by UUID REFERENCES profiles(id),
  defeated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_monsters_element ON game_monsters(element);
CREATE INDEX idx_game_monsters_level ON game_monsters(level);
CREATE INDEX idx_game_monsters_category ON game_monsters(category);
CREATE INDEX idx_game_monsters_is_dead ON game_monsters(is_dead);
```

**Monster Generation**:

- Monsters are generated dynamically when combat starts
- Teachers can spawn specific monsters for their classes
- Legendary monsters are rare and give massive rewards

#### 4. **`game_combats`** - Combat Instances

```sql
CREATE TABLE game_combats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Combat Participants
  organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  monster_id UUID NOT NULL REFERENCES game_monsters(id) ON DELETE CASCADE,
  invited_player_ids UUID[] NOT NULL DEFAULT '{}',  -- Multiplayer invites
  ready_player_ids UUID[] NOT NULL DEFAULT '{}',  -- Players who accepted

  -- Combat State
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'abandoned')),
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn INTEGER NOT NULL DEFAULT 1,

  -- Turn Order
  turn_order JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of player IDs in order

  -- Combat Snapshot (at start)
  player_snapshots JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Player stats at combat start
  monster_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Monster stats

  -- Combat Flow (turn-by-turn history)
  combat_flow JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of turn actions

  -- Combat Result
  outcome TEXT CHECK (outcome IN ('victory', 'defeat')),  -- null while active
  monster_endurance_remaining INTEGER,
  prestige_gained INTEGER,
  xp_gained INTEGER,
  pyrs_gained JSONB,  -- {fire: 10, water: 5, ...}

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_combats_organizer ON game_combats(organizer_id);
CREATE INDEX idx_game_combats_status ON game_combats(status);
CREATE INDEX idx_game_combats_started_at ON game_combats(started_at DESC);
```

**Combat Flow Structure** (JSONB):

```typescript
type CombatFlow = Array<{
	round: number;
	turn: number;
	player_id: string;
	action: 'spell' | 'challenge' | 'monster_attack' | 'heal';
	spell_num?: number;
	challenge_result?: {
		challenge_id: string;
		success: boolean;
		time_taken: number;
	};
	damage_dealt?: number;
	healing_done?: number;
	critical?: boolean;
	timestamp: string;
}>;
```

#### 5. **`game_challenges`** - Math Challenge Definitions

```sql
CREATE TABLE game_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Challenge Metadata
  slug TEXT NOT NULL UNIQUE,  -- e.g., "water_tables_1_1"
  element TEXT NOT NULL CHECK (element IN ('fire', 'water', 'earth', 'wind', 'base')),
  category TEXT NOT NULL,  -- e.g., "tables", "fractions", "geometry"
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),

  -- Challenge Data (from original JSON)
  timer INTEGER NOT NULL,  -- Milliseconds
  challenge_type INTEGER NOT NULL,  -- Type identifier (1-10+)
  question TEXT NOT NULL,  -- Question template with {variables}

  view_config JSONB NOT NULL DEFAULT '{}'::jsonb,  -- View settings (graph, table, etc.)
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Variable definitions
  answer JSONB NOT NULL,  -- Answer structure
  hint TEXT,  -- Hint HTML
  show_answer JSONB,  -- Show answer logic (for geometry)

  -- Usage Stats
  times_attempted INTEGER NOT NULL DEFAULT 0,
  times_succeeded INTEGER NOT NULL DEFAULT 0,
  avg_time_taken FLOAT,  -- Average completion time in seconds

  -- Management
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),  -- For custom challenges

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_challenges_element ON game_challenges(element);
CREATE INDEX idx_game_challenges_category ON game_challenges(category);
CREATE INDEX idx_game_challenges_difficulty ON game_challenges(difficulty);
CREATE INDEX idx_game_challenges_slug ON game_challenges(slug);
```

**Challenge Import**:

- All 464 JSON files will be parsed and inserted into this table
- Original file structure preserved in JSONB columns
- Enables future teacher-created custom challenges

#### 6. **`game_challenge_attempts`** - Student Challenge History

```sql
CREATE TABLE game_challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES game_challenges(id) ON DELETE CASCADE,
  combat_id UUID REFERENCES game_combats(id) ON DELETE SET NULL,  -- Context

  -- Attempt Details
  success BOOLEAN NOT NULL,
  time_taken INTEGER NOT NULL,  -- Milliseconds
  answer_given JSONB NOT NULL,  -- Student's answer
  correct_answer JSONB NOT NULL,  -- Expected answer

  -- Challenge Instance (randomized variables)
  challenge_instance JSONB NOT NULL,  -- The specific challenge shown

  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_challenge_attempts_user_id ON game_challenge_attempts(user_id);
CREATE INDEX idx_game_challenge_attempts_challenge_id ON game_challenge_attempts(challenge_id);
CREATE INDEX idx_game_challenge_attempts_combat_id ON game_challenge_attempts(combat_id);
CREATE INDEX idx_game_challenge_attempts_success ON game_challenge_attempts(success);
CREATE INDEX idx_game_challenge_attempts_attempted_at ON game_challenge_attempts(attempted_at DESC);
```

**Teacher Analytics**:

- Teachers can query this table to see:
  - Which challenges students struggle with
  - Average time per challenge type
  - Success rates per element/category

#### 7. **`game_achievements`** - Achievement Definitions

```sql
CREATE TABLE game_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT NOT NULL UNIQUE,  -- e.g., "fire_master"
  name TEXT NOT NULL,  -- Display name
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('combat', 'progression', 'exploration', 'social')),

  -- Requirements
  requirement_type TEXT NOT NULL,  -- e.g., "monsters_defeated", "level_reached"
  requirement_value INTEGER NOT NULL,  -- e.g., 100 monsters
  element TEXT CHECK (element IN ('fire', 'water', 'earth', 'wind')),  -- Element-specific

  -- Rewards
  prestige_reward INTEGER NOT NULL DEFAULT 0,
  gidouilles_reward INTEGER NOT NULL DEFAULT 0,

  -- Visual
  icon_url TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_achievements_slug ON game_achievements(slug);
CREATE INDEX idx_game_achievements_category ON game_achievements(category);
```

**Achievements** (100 total from original, examples):

- "Fire Apprentice" - Defeat 5 Fire monsters
- "Berseker" - Win without using heal spells
- "Super Saiyan" - Win by succeeding every challenge
- "Level 50" - Reach max level

#### 8. **`game_player_achievements`** - Achievement Progress

```sql
CREATE TABLE game_player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES game_achievements(id) ON DELETE CASCADE,

  progress INTEGER NOT NULL DEFAULT 0,  -- Current progress toward requirement
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,

  UNIQUE(user_id, achievement_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_player_achievements_user_id ON game_player_achievements(user_id);
CREATE INDEX idx_game_player_achievements_completed ON game_player_achievements(completed);
```

#### 9. **`game_leaderboards`** - Seasonal Rankings

```sql
CREATE TABLE game_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  season_identifier TEXT NOT NULL,  -- e.g., "2025-10" (year-month)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stats for the season
  prestige_earned INTEGER NOT NULL DEFAULT 0,
  combats_won INTEGER NOT NULL DEFAULT 0,
  challenges_completed INTEGER NOT NULL DEFAULT 0,

  -- Ranking
  rank INTEGER,  -- Calculated via SQL window function

  UNIQUE(season_identifier, user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_leaderboards_season ON game_leaderboards(season_identifier);
CREATE INDEX idx_game_leaderboards_prestige ON game_leaderboards(season_identifier, prestige_earned DESC);
```

**Leaderboard System**:

- Resets monthly (like original)
- Top 10 students get bonus gidouilles
- Class-specific leaderboards available for teachers

#### 10. **`game_timeslots`** - Teacher-Scheduled Challenges

```sql
CREATE TABLE game_timeslots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timeslot Definition
  name TEXT NOT NULL,  -- e.g., "Fractions Practice"
  challenge_ids UUID[] NOT NULL,  -- Specific challenges to use

  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),

  -- Scheduling
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT timeslot_valid_dates CHECK (ends_at > starts_at)
);

CREATE INDEX idx_game_timeslots_class_id ON game_timeslots(class_id);
CREATE INDEX idx_game_timeslots_teacher_id ON game_timeslots(teacher_id);
CREATE INDEX idx_game_timeslots_active ON game_timeslots(is_active);
```

**Teacher Use Case**:

- Teacher creates timeslot: "Geometry Week"
- Assigns specific geometry challenges
- Students in that class see boosted rewards for those challenges during the time window

#### 11. **`game_spell_decks`** - Player Spell Loadouts

```sql
CREATE TABLE game_spell_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deck_name TEXT NOT NULL,  -- e.g., "Fire Focus", "Balanced"

  spell_ids UUID[] NOT NULL,  -- Array of 10 spell IDs

  is_active BOOLEAN NOT NULL DEFAULT false,  -- Current active deck

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT deck_size_limit CHECK (array_length(spell_ids, 1) = 10)
);

CREATE INDEX idx_game_spell_decks_user_id ON game_spell_decks(user_id);
CREATE INDEX idx_game_spell_decks_active ON game_spell_decks(user_id, is_active);
```

**Spell Deck System**:

- Players choose 10 spells before combat
- Can save multiple deck presets
- Only active deck is used in combat

#### 12. **`game_class_settings`** - Class-Level Game Configuration

```sql
CREATE TABLE game_class_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Difficulty Scaling
  base_difficulty INTEGER NOT NULL DEFAULT 3 CHECK (base_difficulty >= 1 AND base_difficulty <= 5),
  challenge_timer_multiplier FLOAT NOT NULL DEFAULT 1.0,  -- 1.0 = normal, 1.5 = 50% more time

  -- Features Enabled
  multiplayer_enabled BOOLEAN NOT NULL DEFAULT true,
  leaderboard_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Rewards Scaling
  xp_multiplier FLOAT NOT NULL DEFAULT 1.0,
  gidouilles_multiplier FLOAT NOT NULL DEFAULT 1.0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(class_id)
);

CREATE INDEX idx_game_class_settings_class_id ON game_class_settings(class_id);
```

**Teacher Control**:

- Adjust difficulty per class
- Give struggling classes more time per challenge
- Scale rewards for advanced classes

---

### Database Migration Files

Here's the migration file structure (to be created):

```
supabase/migrations/
  044_create_game_players_table.sql
  045_create_game_spells_table.sql
  046_create_game_monsters_table.sql
  047_create_game_combats_table.sql
  048_create_game_challenges_table.sql
  049_create_game_challenge_attempts_table.sql
  050_create_game_achievements_table.sql
  051_create_game_player_achievements_table.sql
  052_create_game_leaderboards_table.sql
  053_create_game_timeslots_table.sql
  054_create_game_spell_decks_table.sql
  055_create_game_class_settings_table.sql
  056_add_game_rls_policies.sql
  057_add_game_triggers_and_functions.sql
```

### Row Level Security (RLS) Policies

Each table needs RLS policies. Example for `game_players`:

```sql
-- RLS Policies for game_players table
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Players can view their own profile
CREATE POLICY "Users can view own game profile"
  ON game_players FOR SELECT
  USING (auth.uid() = user_id);

-- Players can update their own profile (limited fields)
CREATE POLICY "Users can update own game profile"
  ON game_players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Teachers can view their students' profiles
CREATE POLICY "Teachers can view student game profiles"
  ON game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN classes c ON cm.class_id = c.id
      WHERE cm.user_id = game_players.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all game profiles"
  ON game_players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**RLS Policy Pattern for All Tables**:

1. Users can manage their own data
2. Teachers can view (not modify) their students' data
3. Admins have full access
4. Combat participants can view combat data

---

## Frontend Architecture

### Component Structure

```
src/lib/components/game/
  layout/
    GameShell.svelte           # Fullscreen wrapper with exit button
    GameHeader.svelte          # In-game header (level, XP, pyrs)
    GameNavigation.svelte      # In-game navigation menu

  combat/
    CombatArena.svelte         # Main combat UI
    PlayerPanel.svelte         # Player stats + HP bar
    MonsterPanel.svelte        # Monster stats + HP bar
    SpellSelector.svelte       # Choose spell for turn
    CombatLog.svelte           # Turn-by-turn history
    CombatCountdown.svelte     # Timer for choosing spell
    ComboMeter.svelte          # Combo gauge for critical hits

  challenges/
    ChallengeContainer.svelte  # Challenge wrapper
    ChallengeInput.svelte      # Input for numeric answers
    ChallengeDragDrop.svelte   # Drag-and-drop interface
    ChallengeGeometry.svelte   # Geometry challenge renderer
    ChallengeTable.svelte      # Table-based challenges
    ChallengeGraph.svelte      # Graph/chart challenges
    ChallengeTimer.svelte      # Challenge countdown
    ChallengeHint.svelte       # Show hint bubble

  spells/
    SpellCard.svelte           # Individual spell display
    SpellGrid.svelte           # Grid of available spells
    SpellUpgrade.svelte        # Spell upgrade UI
    DeckBuilder.svelte         # Build spell deck (choose 10)

  monsters/
    MonsterCard.svelte         # Monster card with stats
    MonsterList.svelte         # Available monsters to fight
    MonsterAnimation.svelte    # Monster attack animation

  progression/
    XPBar.svelte               # Experience progress bar
    LevelUpModal.svelte        # Level up celebration
    ElementPyrs.svelte         # Display pyrs for each element

  achievements/
    AchievementCard.svelte     # Achievement display
    AchievementGrid.svelte     # All achievements
    AchievementNotification.svelte  # Pop-up when unlocked

  leaderboard/
    LeaderboardTable.svelte    # Rankings table
    LeaderboardFilters.svelte  # Filter by class/season

  multiplayer/
    InviteFriend.svelte        # Invite friend to combat
    LobbyWaitingRoom.svelte    # Waiting for players to join
    PlayerReadyStatus.svelte   # Show who's ready

  teacher/
    StudentGameProgress.svelte # Student game stats
    ClassLeaderboard.svelte    # Class-specific leaderboard
    DifficultySettings.svelte  # Adjust class difficulty
    TimeslotCreator.svelte     # Create challenge timeslots
    ChallengeAnalytics.svelte  # Challenge success rates
```

### Route Structure

```
src/routes/(protected)/dashboard/navadra/
  +layout.svelte                    # Fullscreen game shell
  +layout.server.ts                 # Load player game profile
  +page.svelte                      # Game home/hub

  combat/
    +page.svelte                    # Available monsters list
    [combatId]/
      +page.svelte                  # Active combat
      +page.server.ts               # Load combat data

  challenges/
    [challengeId]/
      +page.svelte                  # Challenge UI
      +page.server.ts               # Load challenge data

  spells/
    +page.svelte                    # Spell collection
    +page.server.ts                 # Load player spells
    deck/
      +page.svelte                  # Deck builder

  achievements/
    +page.svelte                    # Achievement list
    +page.server.ts                 # Load achievements

  leaderboard/
    +page.svelte                    # Rankings
    +page.server.ts                 # Load leaderboard data

  profile/
    +page.svelte                    # Game profile & stats

  teacher/                          # Teacher-only routes
    +layout.server.ts               # Require teacher role
    +page.svelte                    # Teacher game dashboard
    students/
      [studentId]/
        +page.svelte                # Student game progress
        +page.server.ts
    settings/
      [classId]/
        +page.svelte                # Class game settings
        +page.server.ts
    timeslots/
      +page.svelte                  # Manage timeslots
      +page.server.ts
```

### State Management with Svelte 5 Runes

#### `src/lib/stores/game/player.svelte.ts`

```typescript
import { type GamePlayer } from '$lib/types/game';

class PlayerStore {
	private _player = $state<GamePlayer | null>(null);

	get player() {
		return this._player;
	}

	set player(value: GamePlayer | null) {
		this._player = value;
		// Auto-save to localStorage for persistence
		if (value) {
			localStorage.setItem('game_player', JSON.stringify(value));
		}
	}

	// Derived values
	get level() {
		return this._player?.level ?? 1;
	}

	get xp() {
		return this._player?.xp ?? 0;
	}

	get xpForNextLevel() {
		return this.level * 1000; // Example formula
	}

	get xpProgress() {
		return (this.xp / this.xpForNextLevel) * 100;
	}

	get totalPyrs() {
		if (!this._player) return 0;
		return (
			this._player.pyrs_fire +
			this._player.pyrs_water +
			this._player.pyrs_earth +
			this._player.pyrs_wind
		);
	}

	// Methods
	gainXP(amount: number) {
		if (!this._player) return;

		this._player.xp += amount;

		// Check for level up
		while (this._player.xp >= this.xpForNextLevel) {
			this._player.xp -= this.xpForNextLevel;
			this._player.level += 1;
			// Trigger level up event
			this.onLevelUp();
		}

		this.player = this._player; // Trigger save
	}

	gainPyrs(element: string, amount: number) {
		if (!this._player) return;

		switch (element) {
			case 'fire':
				this._player.pyrs_fire += amount;
				break;
			case 'water':
				this._player.pyrs_water += amount;
				break;
			case 'earth':
				this._player.pyrs_earth += amount;
				break;
			case 'wind':
				this._player.pyrs_wind += amount;
				break;
		}

		this.player = this._player; // Trigger save
	}

	private onLevelUp() {
		// Show level up modal
		// Unlock new spells
		// Convert XP to gidouilles
	}

	// Persistence
	loadFromLocalStorage() {
		const saved = localStorage.getItem('game_player');
		if (saved) {
			this._player = JSON.parse(saved);
		}
	}

	async syncWithServer() {
		// Fetch latest data from server
		// Merge with local state
		// Resolve conflicts (server wins)
	}
}

export const playerStore = new PlayerStore();
```

#### `src/lib/stores/game/combat.svelte.ts`

```typescript
import { type Combat, type CombatTurn } from '$lib/types/game';

class CombatStore {
  private _combat = $state<Combat | null>(null);
  private _selectedSpell = $state<number | null>(null);
  private _combatLog = $state<CombatTurn[]>([]);

  get combat() {
    return this._combat;
  }

  set combat(value: Combat | null) {
    this._combat = value;
    if (value) {
      this._combatLog = value.combat_flow || [];
    }
  }

  get selectedSpell() {
    return this._selectedSpell;
  }

  set selectedSpell(spellNum: number | null) {
    this._selectedSpell = spellNum;
  }

  get combatLog() {
    return this._combatLog;
  }

  get isPlayerTurn() {
    // Determine if it's the current player's turn
    return this._combat?.status === 'active' && /* logic */;
  }

  get currentRound() {
    return this._combat?.current_round ?? 1;
  }

  get currentTurn() {
    return this._combat?.current_turn ?? 1;
  }

  // Methods
  selectSpell(spellNum: number) {
    this._selectedSpell = spellNum;
  }

  addTurnToLog(turn: CombatTurn) {
    this._combatLog.push(turn);
  }

  reset() {
    this._combat = null;
    this._selectedSpell = null;
    this._combatLog = [];
  }
}

export const combatStore = new CombatStore();
```

### Challenge System Svelte Components

The challenge system is the most complex part. Here's how to structure it:

#### `ChallengeContainer.svelte` - Main Challenge Wrapper

```svelte
<script lang="ts">
	import { type Challenge } from '$lib/types/game';
	import ChallengeInput from './ChallengeInput.svelte';
	import ChallengeGeometry from './ChallengeGeometry.svelte';
	import ChallengeTimer from './ChallengeTimer.svelte';
	import { challengeStore } from '$lib/stores/game/challenge.svelte';

	let { challenge }: { challenge: Challenge } = $props();

	// Generate challenge instance (randomize variables)
	let instance = $derived(generateChallengeInstance(challenge));

	// Timer
	let timeRemaining = $state(challenge.timer);

	// Answer submission
	async function handleSubmit(answer: any) {
		const success = evaluateAnswer(answer, instance.correct_answer);

		await challengeStore.submitAttempt({
			challenge_id: challenge.id,
			success,
			answer_given: answer,
			time_taken: challenge.timer - timeRemaining,
			challenge_instance: instance
		});

		// Trigger callback (return to combat or show results)
		if (success) {
			onSuccess();
		} else {
			onFailure();
		}
	}
</script>

<div class="challenge-container">
	<ChallengeTimer bind:timeRemaining onTimeout={handleTimeout} />

	<div class="challenge-question">
		{@html interpolateQuestion(challenge.question, instance.variables)}
	</div>

	{#if challenge.challenge_type === 'geometry'}
		<ChallengeGeometry {instance} {onSubmit} />
	{:else if challenge.challenge_type === 'table'}
		<ChallengeTable {instance} {onSubmit} />
	{:else}
		<ChallengeInput {instance} {onSubmit} />
	{/if}

	{#if challenge.hint}
		<button onclick={showHint}>Afficher l'indice</button>
	{/if}
</div>
```

#### Variable Interpolation (from original challenge.js)

The original Navadra uses a custom variable system with Math.js for evaluating expressions. We need to port this:

```typescript
// src/lib/utils/game/challenge-variables.ts

import { create, all } from 'mathjs';

const math = create(all);

// Add custom functions
math.import({
	randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min,
	pickRandom: (arr: any[]) => arr[Math.floor(Math.random() * arr.length)],
	different: (arr1: any[], ...otherArrays: any[][]) => {
		// Logic to ensure arr1 is different from all other arrays
	}
	// ... other custom functions
});

export function generateChallengeInstance(challenge: Challenge) {
	const variables: Record<string, any> = {};
	const expressions: Record<string, string> = {};

	// Sort variables by dependency order
	const sortedVars = topologicalSort(challenge.variables);

	// Evaluate each variable
	for (const [varName, varDef] of Object.entries(sortedVars)) {
		if (varDef.value) {
			// Evaluate with Math.js
			const evaluated = evaluateWithContext(varDef.value, variables);
			variables[varName] = evaluated;
		} else if (varDef.expression) {
			// Store expression (don't evaluate)
			expressions[varName] = interpolateExpression(varDef.expression, variables);
		}
	}

	return {
		variables,
		expressions,
		correct_answer: evaluateAnswer(challenge.answer, variables)
	};
}

function evaluateWithContext(expr: string, context: Record<string, any>) {
	// Replace variable references {varName} with actual values
	const interpolated = expr.replace(/\{(\w+)\}/g, (_, varName) => {
		return context[varName] ?? varName;
	});

	try {
		return math.evaluate(interpolated, context);
	} catch (error) {
		console.error('Failed to evaluate expression:', expr, error);
		return null;
	}
}
```

**Challenge**: This is **complex** and will require significant effort to port. The original `challenge.js` is 132KB and handles:

- Variable generation with Math.js
- Geometry rendering with JSXGraph
- Drag-and-drop interfaces
- Table/chart rendering
- Answer validation

**Recommendation**: Port incrementally by challenge type:

1. Start with simple numeric challenges (type 1-3)
2. Add table/chart challenges (type 4-6)
3. Finally tackle geometry challenges (type 7-10)

---

## Backend Architecture

### SvelteKit Server Actions

#### `src/routes/(protected)/dashboard/navadra/combat/[combatId]/+page.server.ts`

```typescript
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAuth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
  const { user } = await safeGetSession();
  requireAuth(user);

  const combatId = params.combatId;

  // Fetch combat data
  const { data: combat, error: combatError } = await supabase
    .from('game_combats')
    .select(`
      *,
      monster:game_monsters(*),
      organizer:profiles!organizer_id(id, firstname, lastname, avatar_url)
    `)
    .eq('id', combatId)
    .single();

  if (combatError || !combat) {
    throw error(404, 'Combat not found');
  }

  // Verify user is a participant
  const isParticipant =
    combat.organizer_id === user!.id ||
    combat.invited_player_ids.includes(user!.id);

  if (!isParticipant) {
    throw error(403, 'You are not a participant in this combat');
  }

  // Fetch player game profile
  const { data: gamePlayer } = await supabase
    .from('game_players')
    .select('*')
    .eq('user_id', user!.id)
    .single();

  // Fetch player spells (active deck)
  const { data: spellDeck } = await supabase
    .from('game_spell_decks')
    .select(`
      *,
      spells:game_spells(*)
    `)
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .single();

  return {
    combat,
    gamePlayer,
    spellDeck
  };
};

export const actions: Actions = {
  // Action: Player chooses a spell for their turn
  chooseSpell: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { user } = await safeGetSession();
    requireAuth(user);

    const data = await request.formData();
    const combatId = data.get('combat_id') as string;
    const spellNum = parseInt(data.get('spell_num') as string);

    // Validate it's the player's turn
    const { data: combat } = await supabase
      .from('game_combats')
      .select('*')
      .eq('id', combatId)
      .single();

    if (!combat || combat.status !== 'active') {
      return fail(400, { error: 'Combat is not active' });
    }

    // TODO: Validate turn order

    // Store spell choice, trigger challenge
    // This will redirect to challenge page
    return {
      success: true,
      redirect: `/dashboard/navadra/challenges/${generateChallengeId(combat, spellNum)}`
    };
  },

  // Action: Complete a challenge and apply spell effect
  completeChallenge: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { user } = await safeGetSession();
    requireAuth(user);

    const data = await request.formData();
    const combatId = data.get('combat_id') as string;
    const challengeId = data.get('challenge_id') as string;
    const success = data.get('success') === 'true';
    const timeTaken = parseInt(data.get('time_taken') as string);

    // Calculate spell effect based on challenge success
    let damage = 0;
    let healing = 0;

    if (success) {
      // Full spell power
      damage = calculateDamage(/* spell, player, monster */);
    } else {
      // Reduced spell power
      damage = calculateDamage(/* ... */) * 0.5;
    }

    // Update combat flow
    const { data: combat } = await supabase
      .from('game_combats')
      .select('*')
      .eq('id', combatId)
      .single();

    const newTurn = {
      round: combat!.current_round,
      turn: combat!.current_turn,
      player_id: user!.id,
      action: 'spell',
      spell_num: /* ... */,
      challenge_result: {
        challenge_id: challengeId,
        success,
        time_taken: timeTaken
      },
      damage_dealt: damage,
      timestamp: new Date().toISOString()
    };

    const updatedFlow = [...combat!.combat_flow, newTurn];

    // Update monster endurance
    const newEndurance = combat!.monster_endurance_remaining - damage;

    // Check if combat is over
    const isVictory = newEndurance <= 0;

    await supabase
      .from('game_combats')
      .update({
        combat_flow: updatedFlow,
        monster_endurance_remaining: newEndurance,
        current_turn: combat!.current_turn + 1,
        status: isVictory ? 'completed' : 'active',
        outcome: isVictory ? 'victory' : null
      })
      .eq('id', combatId);

    // If victory, award rewards
    if (isVictory) {
      await awardCombatRewards(user!.id, combat!);
    }

    // Broadcast turn to other players via WebSocket
    await broadcastCombatUpdate(combatId, newTurn);

    return { success: true, isVictory };
  },

  // Action: Abandon combat (forfeit)
  abandonCombat: async ({ request, locals: { safeGetSession, supabase } }) => {
    const { user } = await safeGetSession();
    requireAuth(user);

    const data = await request.formData();
    const combatId = data.get('combat_id') as string;

    await supabase
      .from('game_combats')
      .update({
        status: 'abandoned',
        outcome: 'defeat',
        completed_at: new Date().toISOString()
      })
      .eq('id', combatId);

    return { success: true };
  }
};
```

### Real-Time Combat Synchronization

For multiplayer combat, we need real-time updates. We'll use the existing WebSocket system:

#### `src/lib/server/websocket-handlers/game-combat.ts`

```typescript
import type { WebSocket } from 'ws';
import type { WebSocketMessage } from '$lib/types/websocket';

export function handleGameCombatMessage(ws: WebSocket, message: WebSocketMessage) {
	switch (message.type) {
		case 'game:combat:join':
			handleCombatJoin(ws, message);
			break;
		case 'game:combat:ready':
			handlePlayerReady(ws, message);
			break;
		case 'game:combat:turn':
			handleTurnUpdate(ws, message);
			break;
		case 'game:combat:spell':
			handleSpellCast(ws, message);
			break;
	}
}

function handleCombatJoin(ws: WebSocket, message: WebSocketMessage) {
	const { combat_id, user_id } = message.payload;

	// Add user to combat room
	joinRoom(ws, `combat:${combat_id}`);

	// Broadcast to other players
	broadcastToRoom(
		`combat:${combat_id}`,
		{
			type: 'game:combat:player_joined',
			payload: { user_id }
		},
		ws
	);
}

function handleTurnUpdate(ws: WebSocket, message: WebSocketMessage) {
	const { combat_id, turn_data } = message.payload;

	// Broadcast turn result to all participants
	broadcastToRoom(`combat:${combat_id}`, {
		type: 'game:combat:turn_completed',
		payload: turn_data
	});
}
```

**Integration**: This extends the existing WebSocket server in `src/lib/server/websocket-server.ts`.

---

## Asset Migration Strategy

### Assets to Migrate

| Asset Type        | Original Location          | Size  | Target Location                             |
| ----------------- | -------------------------- | ----- | ------------------------------------------- |
| Monster images    | `webroot/img/monstres/`    | ~40MB | Supabase Storage: `game-assets/monsters/`   |
| Spell icons       | `webroot/img/spells/`      | ~10MB | Supabase Storage: `game-assets/spells/`     |
| Character avatars | `webroot/img/personnages/` | ~5MB  | Supabase Storage: `game-assets/characters/` |
| Sound effects     | `webroot/sons/`            | 25MB  | Supabase Storage: `game-assets/sounds/`     |
| UI elements       | `webroot/img/icones/`      | ~10MB | `static/game/ui/` (public)                  |

### Migration Script

Create a Node.js script to upload assets to Supabase Storage:

#### `scripts/migrate-navadra-assets.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAVADRA_ROOT = '/Users/david/Coding/js/ubumaths/extern/navadra-jeu/webroot';
const ASSETS_DIR = path.join(NAVADRA_ROOT, 'img');
const SOUNDS_DIR = path.join(NAVADRA_ROOT, 'sons');

async function createStorageBucket() {
	const { data, error } = await supabase.storage.createBucket('game-assets', {
		public: true,
		fileSizeLimit: 10 * 1024 * 1024, // 10MB per file
		allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/ogg']
	});

	if (error && !error.message.includes('already exists')) {
		console.error('Failed to create bucket:', error);
	} else {
		console.log('✓ Storage bucket created');
	}
}

async function uploadAssets(category: string, sourceDir: string) {
	const files = await glob(`${sourceDir}/**/*.{png,jpg,jpeg,webp,mp3,ogg}`);

	console.log(`Uploading ${files.length} files from ${category}...`);

	let successCount = 0;
	let errorCount = 0;

	for (const filePath of files) {
		const relativePath = path.relative(NAVADRA_ROOT, filePath);
		const targetPath = `${category}/${relativePath}`;

		const fileContent = fs.readFileSync(filePath);

		const { error } = await supabase.storage.from('game-assets').upload(targetPath, fileContent, {
			contentType: getContentType(filePath),
			upsert: true
		});

		if (error) {
			console.error(`✗ Failed to upload ${targetPath}:`, error.message);
			errorCount++;
		} else {
			successCount++;
		}
	}

	console.log(`✓ Uploaded ${successCount} files (${errorCount} errors)`);
}

function getContentType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	const mimeTypes: Record<string, string> = {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.mp3': 'audio/mpeg',
		'.ogg': 'audio/ogg'
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

async function main() {
	console.log('Starting Navadra asset migration...\n');

	await createStorageBucket();

	await uploadAssets('monsters', path.join(ASSETS_DIR, 'monstres'));
	await uploadAssets('spells', path.join(ASSETS_DIR, 'spells'));
	await uploadAssets('characters', path.join(ASSETS_DIR, 'personnages'));
	await uploadAssets('sounds', SOUNDS_DIR);

	console.log('\n✓ Asset migration complete!');
}

main().catch(console.error);
```

**Run migration**:

```bash
npx tsx scripts/migrate-navadra-assets.ts
```

### Asset URL Helper

Create a helper to generate Supabase Storage URLs:

#### `src/lib/utils/game/assets.ts`

```typescript
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export function getGameAssetUrl(
	category: 'monsters' | 'spells' | 'characters' | 'sounds',
	filename: string
): string {
	return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/game-assets/${category}/${filename}`;
}

// Examples:
// getGameAssetUrl('monsters', 'dragon_feu.png')
// => 'https://xxx.supabase.co/storage/v1/object/public/game-assets/monsters/dragon_feu.png'
```

---

## Challenge System Integration

### Challenge Import Script

Import all 464 JSON challenge files into the database:

#### `scripts/import-navadra-challenges.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const supabase = createClient(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHALLENGES_DIR = '/Users/david/Coding/js/ubumaths/extern/navadra-jeu/generators/challenges';

async function importChallenges() {
	const files = await glob(`${CHALLENGES_DIR}/**/*.json`);

	console.log(`Found ${files.length} challenge files`);

	const challenges = [];

	for (const filePath of files) {
		const content = fs.readFileSync(filePath, 'utf-8');
		const challenge = JSON.parse(content);

		// Parse metadata from file path
		// e.g., challenges/water/tables/1/water_tables_1_1.json
		const relativePath = path.relative(CHALLENGES_DIR, filePath);
		const pathParts = relativePath.split(path.sep);

		const element = pathParts[0]; // 'water', 'fire', 'earth', 'wind', 'base'
		const category = pathParts[1]; // 'tables', 'fractions', etc.
		const difficulty = parseInt(pathParts[2]) || 1; // '1', '2', etc.
		const filename = path.basename(filePath, '.json');

		challenges.push({
			slug: filename,
			element,
			category,
			difficulty,
			timer: challenge.timer,
			challenge_type: challenge.type,
			question: challenge.question,
			view_config: challenge.view || {},
			variables: challenge.var || {},
			answer: challenge.answer,
			hint: challenge.hint || null,
			show_answer: challenge.showAnswer || null,
			is_active: true
		});
	}

	console.log(`Importing ${challenges.length} challenges...`);

	// Batch insert
	const { data, error } = await supabase.from('game_challenges').insert(challenges);

	if (error) {
		console.error('Import failed:', error);
	} else {
		console.log(`✓ Successfully imported ${challenges.length} challenges`);
	}
}

importChallenges().catch(console.error);
```

**Run import**:

```bash
npx tsx scripts/import-navadra-challenges.ts
```

### Challenge Selection Algorithm

When a player casts a spell in combat, the system needs to select an appropriate challenge:

#### `src/lib/server/game/challenge-selection.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';

export async function selectChallenge(
	supabase: SupabaseClient,
	userId: string,
	spellElement: string,
	playerLevel: number,
	classSettings?: {
		base_difficulty: number;
		challenge_timer_multiplier: number;
	}
): Promise<string> {
	// Determine difficulty based on player level and class settings
	const baseDifficulty = classSettings?.base_difficulty ?? 3;
	const levelDifficulty = Math.min(5, Math.floor(playerLevel / 10) + 1);
	const targetDifficulty = Math.min(
		5,
		Math.max(1, Math.round((baseDifficulty + levelDifficulty) / 2))
	);

	// Fetch player's challenge history for this element
	const { data: recentAttempts } = await supabase
		.from('game_challenge_attempts')
		.select('challenge_id')
		.eq('user_id', userId)
		.order('attempted_at', { ascending: false })
		.limit(20);

	const recentChallengeIds = recentAttempts?.map((a) => a.challenge_id) || [];

	// Select random challenge matching criteria
	// Exclude recently attempted challenges for variety
	const { data: challenges } = await supabase
		.from('game_challenges')
		.select('id')
		.eq('element', spellElement)
		.eq('difficulty', targetDifficulty)
		.eq('is_active', true)
		.not('id', 'in', `(${recentChallengeIds.join(',')})`)
		.limit(10);

	if (!challenges || challenges.length === 0) {
		// Fallback: select any challenge for this element
		const { data: fallbackChallenges } = await supabase
			.from('game_challenges')
			.select('id')
			.eq('element', spellElement)
			.eq('is_active', true)
			.limit(10);

		return fallbackChallenges![Math.floor(Math.random() * fallbackChallenges!.length)].id;
	}

	// Return random challenge from selection
	return challenges[Math.floor(Math.random() * challenges.length)].id;
}
```

---

## Combat System Architecture

### Combat Flow State Machine

The combat system follows a strict turn-based flow:

```
Combat States:
  pending → active → completed/abandoned

Round Structure:
  3 turns per round (configurable)

Turn Sequence:
  1. Player chooses spell (20s timer)
  2. System selects challenge
  3. Player solves challenge (timer based on difficulty)
  4. System calculates damage/healing
  5. System applies effects to monster
  6. Monster HP updated
  7. Next turn (or monster attack if round ends)
  8. Check victory/defeat conditions
```

### Combat Resolution Logic

#### `src/lib/server/game/combat-engine.ts`

```typescript
export class CombatEngine {
  constructor(
    private supabase: SupabaseClient,
    private combatId: string
  ) {}

  async processTurn(
    playerId: string,
    spellNum: number,
    challengeSuccess: boolean,
    timeTaken: number
  ) {
    // Fetch combat state
    const combat = await this.fetchCombat();

    // Fetch player spell
    const spell = await this.fetchSpell(playerId, spellNum);

    // Calculate spell effectiveness
    const effectiveness = this.calculateEffectiveness(
      spell,
      challengeSuccess,
      timeTaken,
      combat
    );

    // Apply spell effect
    let damage = 0;
    let healing = 0;
    let critical = false;

    if (spell.type === 'attack') {
      damage = this.calculateDamage(spell, effectiveness, combat);

      // Check for critical hit (based on combo meter)
      if (Math.random() < combat.combo_meter) {
        damage *= 1.5;
        critical = true;
      }
    } else if (spell.type === 'heal') {
      healing = this.calculateHealing(spell, effectiveness);
    }

    // Update monster HP
    const newMonsterHP = Math.max(0, combat.monster_endurance_remaining - damage);

    // Update player HP (if healing)
    const playerSnapshot = combat.player_snapshots[playerId];
    const newPlayerHP = Math.min(
      playerSnapshot.max_endurance,
      playerSnapshot.current_endurance + healing
    );

    // Record turn in combat flow
    const turn = {
      round: combat.current_round,
      turn: combat.current_turn,
      player_id: playerId,
      action: 'spell',
      spell_num: spellNum,
      challenge_result: {
        challenge_id: /* ... */,
        success: challengeSuccess,
        time_taken: timeTaken
      },
      damage_dealt: damage,
      healing_done: healing,
      critical,
      timestamp: new Date().toISOString()
    };

    // Update combat state
    await this.updateCombat({
      combat_flow: [...combat.combat_flow, turn],
      monster_endurance_remaining: newMonsterHP,
      current_turn: combat.current_turn + 1,
      combo_meter: challengeSuccess ? combat.combo_meter + 0.1 : 0
    });

    // Check victory condition
    if (newMonsterHP <= 0) {
      await this.resolveCombat('victory');
    }

    // Check if round ended (every 3 turns)
    if (combat.current_turn % 3 === 0) {
      await this.triggerMonsterAttack();
    }

    return { success: true, damage, healing, critical };
  }

  private async triggerMonsterAttack() {
    const combat = await this.fetchCombat();

    // Calculate monster damage
    const baseDamage = this.calculateMonsterDamage(combat);

    // Apply damage to all active players
    for (const playerId of combat.ready_player_ids) {
      const playerSnapshot = combat.player_snapshots[playerId];
      const newHP = Math.max(0, playerSnapshot.current_endurance - baseDamage);

      playerSnapshot.current_endurance = newHP;

      // Check if player knocked out
      if (newHP <= 0) {
        await this.knockOutPlayer(playerId);
      }
    }

    // Check defeat condition
    const allKnockedOut = combat.ready_player_ids.every(id =>
      combat.player_snapshots[id].current_endurance <= 0
    );

    if (allKnockedOut) {
      await this.resolveCombat('defeat');
    }

    // Start new round
    await this.updateCombat({
      current_round: combat.current_round + 1,
      current_turn: 1
    });
  }

  private async resolveCombat(outcome: 'victory' | 'defeat') {
    const combat = await this.fetchCombat();

    if (outcome === 'victory') {
      // Calculate rewards
      const xpGained = this.calculateXPReward(combat);
      const prestigeGained = this.calculatePrestigeReward(combat);
      const pyrsGained = this.calculatePyrsReward(combat);

      // Award rewards to all participants
      for (const playerId of combat.ready_player_ids) {
        await this.awardRewards(playerId, {
          xp: xpGained,
          prestige: prestigeGained,
          pyrs: pyrsGained
        });

        // Convert XP to gidouilles (10:1 ratio)
        await this.awardGidouilles(playerId, Math.floor(xpGained / 10) + 5);
      }

      // Mark monster as dead
      await this.supabase
        .from('game_monsters')
        .update({
          is_dead: true,
          defeated_by: combat.organizer_id,
          defeated_at: new Date().toISOString()
        })
        .eq('id', combat.monster_id);

      // Update achievements
      for (const playerId of combat.ready_player_ids) {
        await this.updateAchievements(playerId, combat);
      }
    }

    // Update combat status
    await this.updateCombat({
      status: 'completed',
      outcome,
      completed_at: new Date().toISOString(),
      xp_gained: xpGained,
      prestige_gained: prestigeGained,
      pyrs_gained: pyrsGained
    });
  }

  // ... helper methods
}
```

### Damage Calculation Formulas

Based on the original Navadra combat system:

```typescript
function calculateDamage(
	spell: Spell,
	effectiveness: number, // 0-1 based on challenge performance
	combat: Combat
): number {
	// Base damage from spell power
	const baseDamage = spell.power;

	// Player level bonus
	const playerLevel = combat.player_snapshots[playerId].level;
	const levelBonus = 1 + playerLevel * 0.05; // +5% per level

	// Effectiveness multiplier (0.5 for failed challenge, 1.0 for success)
	const effectivenessMultiplier = effectiveness;

	// Element affinity bonus (if spell element matches monster weakness)
	const elementBonus = getElementAdvantage(spell.element, combat.monster_snapshot.element);

	// Final damage calculation
	const damage = Math.floor(baseDamage * levelBonus * effectivenessMultiplier * elementBonus);

	return damage;
}

function getElementAdvantage(spellElement: string, monsterElement: string): number {
	// Rock-paper-scissors element system
	const advantages: Record<string, string> = {
		fire: 'earth',
		earth: 'wind',
		wind: 'water',
		water: 'fire'
	};

	if (advantages[spellElement] === monsterElement) {
		return 1.5; // 50% bonus damage
	} else if (advantages[monsterElement] === spellElement) {
		return 0.75; // 25% penalty
	}

	return 1.0; // Neutral
}
```

---

## Integration Points with UbuMaths

### 1. Authentication Integration

**Already Solved**: The game uses the existing `(protected)` route group, so authentication is automatic.

### 2. Friend System Integration

For multiplayer combat invitations, we use the existing `friendships` table:

```typescript
// Fetch player's friends for combat invitations
async function fetchFriendsForInvite(userId: string) {
	const { data } = await supabase
		.from('friendships')
		.select(
			`
      *,
      friend:profiles!addressee_id(id, firstname, lastname, avatar_url)
    `
		)
		.eq('requester_id', userId)
		.eq('status', 'accepted');

	return data;
}
```

### 3. Chat System Integration

For combat coordination, we use the existing WebSocket chat system:

```typescript
// Send combat invitation via chat
async function sendCombatInvitation(fromUserId: string, toUserId: string, combatId: string) {
  // Use existing chat system
  await chatStore.sendMessage({
    conversation_id: /* get or create DM conversation */,
    content: `Je t'invite à combattre un monstre ! [Rejoindre](/dashboard/navadra/combat/${combatId})`,
    type: 'game_invite'
  });
}
```

### 4. Reward Integration (XP → Gidouilles)

When students win combats, XP is converted to gidouilles:

```typescript
async function awardGidouilles(userId: string, amount: number) {
	// Update profiles table
	await supabase
		.from('profiles')
		.update({
			gidouilles: supabase.raw(`gidouilles + ${amount}`)
		})
		.eq('id', userId);

	// Show toast notification
	toaster.success(`+${amount} gidouilles gagnées !`);
}
```

### 5. Teacher Dashboard Integration

Add game stats to existing teacher dashboard:

#### `src/routes/(protected)/dashboard/teacher/students/[studentId]/+page.server.ts`

```typescript
// Add game progress to existing student data
const { data: gameProgress } = await supabase
	.from('game_players')
	.select(
		`
    *,
    spells_count:game_spells(count),
    combats_won,
    combats_lost,
    total_combats
  `
	)
	.eq('user_id', studentId)
	.single();

return {
	student,
	gameProgress // NEW: Add to existing data
	// ... existing fields
};
```

### 6. Student Dashboard Integration

Add game entry point to student dashboard:

#### `src/routes/(protected)/dashboard/+page.svelte` (Student View)

```svelte
{#if profile.role === 'student'}
	<div class="game-entry-card">
		<h3>Navadra - Le Jeu</h3>
		<p>Apprends les maths en combattant des monstres !</p>
		<a href="/dashboard/navadra">
			<Button variant="default" size="lg">Jouer maintenant</Button>
		</a>

		{#if gamePlayer}
			<div class="game-stats-preview">
				<span>Niveau {gamePlayer.level}</span>
				<span>{gamePlayer.combats_won} victoires</span>
			</div>
		{/if}
	</div>
{/if}
```

---

## Implementation Phases

### **Phase 1: Solo Combat + Challenges (Priority)**

**Duration**: 8-12 weeks
**Goal**: Students can play single-player combat with math challenges

#### Milestones

**Milestone 1.1: Database Setup** (Week 1)

- [ ] Create all 12 database tables
- [ ] Write migration files
- [ ] Set up RLS policies
- [ ] Test database with sample data

**Milestone 1.2: Asset Migration** (Week 1-2)

- [ ] Set up Supabase Storage bucket
- [ ] Run asset migration script
- [ ] Optimize images (convert to WebP)
- [ ] Create asset URL helpers

**Milestone 1.3: Challenge Import** (Week 2)

- [ ] Write challenge import script
- [ ] Import all 464 challenges
- [ ] Verify data integrity
- [ ] Create challenge selection algorithm

**Milestone 1.4: Game Layout & Routes** (Week 2-3)

- [ ] Create fullscreen game layout
- [ ] Set up route structure
- [ ] Build game header (XP, level, pyrs)
- [ ] Implement exit button with progress save

**Milestone 1.5: Player Profile System** (Week 3-4)

- [ ] Create `game_players` table integration
- [ ] Build player profile page
- [ ] Implement XP/level system
- [ ] Create element pyrs display

**Milestone 1.6: Challenge System (Numeric)** (Week 4-6)

- [ ] Port challenge variable evaluation logic
- [ ] Build challenge container component
- [ ] Implement numeric input challenges (types 1-3)
- [ ] Add challenge timer
- [ ] Build hint system

**Milestone 1.7: Combat System (Solo)** (Week 6-8)

- [ ] Build monster generation system
- [ ] Create combat arena UI
- [ ] Implement turn-based flow
- [ ] Build spell selection
- [ ] Connect challenges to combat

**Milestone 1.8: Spell System** (Week 8-9)

- [ ] Create spell database + seed data
- [ ] Build spell collection UI
- [ ] Implement spell deck builder
- [ ] Add spell upgrade system

**Milestone 1.9: Combat Resolution** (Week 9-10)

- [ ] Implement damage calculations
- [ ] Add victory/defeat logic
- [ ] Build reward distribution
- [ ] Integrate gidouilles conversion

**Milestone 1.10: Polish & Testing** (Week 10-12)

- [ ] Add animations
- [ ] Implement sound effects
- [ ] Test all challenge types (numeric)
- [ ] Fix bugs
- [ ] Write documentation

**Phase 1 Deliverables**:

- ✅ Students can create game profile
- ✅ Students can fight solo monsters
- ✅ Students solve numeric challenges (not geometry yet)
- ✅ Students earn XP, level up, gain pyrs
- ✅ Students unlock and upgrade spells
- ✅ XP converts to gidouilles
- ✅ Game progress saves on exit

---

### **Phase 2: RPG Progression System**

**Duration**: 4-6 weeks
**Goal**: Full progression with achievements, leaderboards

#### Milestones

**Milestone 2.1: Achievement System** (Week 1-2)

- [ ] Import achievement definitions
- [ ] Build achievement tracking logic
- [ ] Create achievement UI
- [ ] Add achievement notifications

**Milestone 2.2: Leaderboard System** (Week 2-3)

- [ ] Implement seasonal rankings
- [ ] Build leaderboard UI
- [ ] Add class leaderboards
- [ ] Create reward distribution

**Milestone 2.3: Advanced Challenge Types** (Week 3-5)

- [ ] Port table/chart challenges
- [ ] Port graph challenges
- [ ] Add drag-and-drop challenges
- [ ] Test all challenge types

**Milestone 2.4: Tutorial System** (Week 5-6)

- [ ] Build tutorial flow
- [ ] Create guided combat
- [ ] Add help bubbles
- [ ] Test first-time experience

**Phase 2 Deliverables**:

- ✅ Full achievement system
- ✅ Monthly leaderboards
- ✅ All challenge types working (except geometry)
- ✅ Tutorial for new players

---

### **Phase 3: Multiplayer & Social Features**

**Duration**: 4-5 weeks
**Goal**: Friend invitations and team combat

#### Milestones

**Milestone 3.1: Multiplayer Combat** (Week 1-2)

- [ ] Build combat invitation system
- [ ] Create lobby/waiting room
- [ ] Implement turn coordination
- [ ] Add WebSocket synchronization

**Milestone 3.2: Friend Integration** (Week 2-3)

- [ ] Connect to existing friend system
- [ ] Build friend invitation UI
- [ ] Add friend search for game
- [ ] Test multiplayer combat

**Milestone 3.3: Chat Integration** (Week 3-4)

- [ ] Add combat chat channel
- [ ] Implement combat notifications
- [ ] Build combat history sharing

**Milestone 3.4: Polish & Testing** (Week 4-5)

- [ ] Test multiplayer synchronization
- [ ] Fix edge cases
- [ ] Optimize WebSocket usage

**Phase 3 Deliverables**:

- ✅ Students can invite friends to combat
- ✅ 2-4 player team combat works
- ✅ Real-time combat synchronization
- ✅ Combat chat functional

---

### **Phase 4: Teacher Tools & Analytics**

**Duration**: 3-4 weeks
**Goal**: Teacher oversight and difficulty management

#### Milestones

**Milestone 4.1: Teacher Dashboard** (Week 1-2)

- [ ] Add game stats to student profiles
- [ ] Build class game progress view
- [ ] Create challenge analytics
- [ ] Add combat history view

**Milestone 4.2: Difficulty Management** (Week 2-3)

- [ ] Build class settings UI
- [ ] Implement difficulty scaling
- [ ] Add timer adjustments
- [ ] Test difficulty variations

**Milestone 4.3: Timeslot System** (Week 3)

- [ ] Build timeslot creator
- [ ] Implement challenge scheduling
- [ ] Add reward boosting
- [ ] Test timeslot logic

**Milestone 4.4: Reports & Analytics** (Week 3-4)

- [ ] Build challenge success reports
- [ ] Add element proficiency charts
- [ ] Create combat performance metrics
- [ ] Export data functionality

**Phase 4 Deliverables**:

- ✅ Teachers can view student game progress
- ✅ Teachers can adjust difficulty per class
- ✅ Teachers can schedule challenges
- ✅ Teachers can export analytics

---

## Technical Challenges & Solutions

### Challenge 1: Porting jQuery to Svelte 5

**Problem**: The original `challenge.js` is 132KB of jQuery-heavy code.

**Solution**:

1. **Incremental Port**: Start with simple challenge types (numeric input)
2. **Use vanilla JS where possible**: Modern DOM APIs replace most jQuery
3. **Svelte reactivity**: Replace jQuery DOM manipulation with Svelte bindings
4. **Extract core logic**: The Math.js evaluation logic is jQuery-independent

**Example**: jQuery to Svelte

```javascript
// Original jQuery
$("#challenge_content").html("<p>" + question + "</p>");
$(".submit-button").on("click", function() { /* ... */ });

// Svelte 5 equivalent
<div id="challenge_content">
  {@html question}
</div>
<button onclick={handleSubmit}>Submit</button>
```

---

### Challenge 2: Geometry Challenges

**Problem**: The original uses JSXGraph, a jQuery-dependent library for interactive geometry.

**Solution**: Evaluate alternatives

**Option A: Port JSXGraph**

- **Pros**: Already familiar, 464 challenges designed for it
- **Cons**: jQuery dependency, not maintained actively

**Option B: Use GeoGebra API**

- **Pros**: Modern, well-maintained, powerful
- **Cons**: Requires rewriting all geometry challenges

**Option C: Use Mafs (React library)**

- **Pros**: React-based (can be wrapped in Svelte), modern
- **Cons**: React dependency, limited compared to JSXGraph

**Recommendation**: **Option A initially**, then migrate to Option B in Phase 2.

**Implementation**:

```svelte
<!-- ChallengeGeometry.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import JSXGraph from 'jsxgraph'; // Port to ESM if needed

	let boardElement: HTMLDivElement;
	let board: any;

	onMount(() => {
		board = JSXGraph.initBoard(boardElement, {
			boundingbox: [-10, 10, 10, -10],
			axis: true
		});

		// Create geometric objects from challenge definition
		// ...
	});
</script>

<div bind:this={boardElement} class="geometry-board"></div>
```

---

### Challenge 3: Real-Time Combat Synchronization

**Problem**: Multiplayer combat requires all players to see the same state in real-time.

**Solution**: Use existing WebSocket system with combat-specific channels

**Architecture**:

1. Players join combat room: `combat:${combatId}`
2. Server broadcasts turn updates to all participants
3. Client optimistically updates UI, then reconciles with server state
4. Use combat_flow JSONB as source of truth

**Edge Cases**:

- **Player disconnects mid-combat**: Auto-forfeit after 2 minutes
- **Network lag**: Show loading state, queue actions
- **Concurrent actions**: Server-side turn order enforcement

---

### Challenge 4: Database Performance

**Problem**: With many students playing simultaneously, database queries could slow down.

**Solutions**:

1. **Indexes**: Already planned on key columns (user_id, combat_id, etc.)
2. **JSONB Queries**: Use GIN indexes for combat_flow searches
3. **Caching**: Cache challenge definitions (rarely change)
4. **Denormalization**: Store combat stats in `game_players` to avoid joins

**Example**: Cache challenges in SvelteKit load function

```typescript
// +layout.server.ts
export const load: LayoutServerLoad = async ({ locals: { supabase } }) => {
	// Cache challenges for 1 hour
	const { data: challenges } = await supabase
		.from('game_challenges')
		.select('*')
		.eq('is_active', true);

	return {
		challenges, // Available to all child routes
		// Set cache header
		headers: {
			'Cache-Control': 'public, max-age=3600'
		}
	};
};
```

---

### Challenge 5: Mobile Responsiveness

**Problem**: The original game is desktop-focused. Students may play on tablets/phones.

**Solution**: Responsive design from day one

**Key Considerations**:

1. **Touch-friendly**: Large buttons, no hover-only interactions
2. **Geometry challenges**: May require landscape orientation
3. **Keyboard input**: MathLive works well on mobile
4. **Fullscreen on mobile**: Use CSS `position: fixed` to avoid scrolling

**Example**: Mobile-first combat UI

```svelte
<div class="combat-arena">
	<!-- Stack vertically on mobile, side-by-side on desktop -->
	<div class="player-panel">...</div>
	<div class="monster-panel">...</div>
</div>

<style>
	.combat-arena {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.combat-arena {
			flex-direction: row;
			justify-content: space-between;
		}
	}
</style>
```

---

## Security & Performance Considerations

### Security

#### 1. **Server-Side Validation**

**Critical**: Never trust client-side challenge answers.

```typescript
// ❌ BAD: Client sends "I got it right"
{ success: true }

// ✅ GOOD: Client sends answer, server validates
{ answer_given: "42", challenge_instance: {...} }

// Server validates
const correct = evaluateChallenge(challenge, answer_given, challenge_instance);
```

#### 2. **Combat State Tampering**

**Risk**: Malicious client could fake damage values.

**Solution**: Server calculates all damage

```typescript
// Server action
export const actions = {
	completeChallenge: async ({ request }) => {
		// Client sends challenge result
		const { success, time_taken } = await request.formData();

		// SERVER calculates damage (client cannot fake)
		const damage = calculateDamage(spell, success, time_taken);

		// Update database
		// ...
	}
};
```

#### 3. **Rate Limiting**

**Risk**: Students could spam challenges for XP farming.

**Solution**: Rate limit challenge attempts

```typescript
// Check last attempt timestamp
const lastAttempt = await getLastAttempt(userId);
if (Date.now() - lastAttempt < 1000) {
	return fail(429, { error: 'Too many attempts' });
}
```

#### 4. **RLS Policies**

All game tables have RLS enabled to prevent:

- Students viewing other students' data (except leaderboards)
- Students modifying game state directly
- Unauthorized combat participation

---

### Performance

#### 1. **Lazy Loading Assets**

Don't load all 90MB of images upfront.

```typescript
// Load monster images on-demand
const monsterImage = $derived(
  `/storage/game-assets/monsters/${monster.img_url}`
);

// Use <img loading="lazy">
<img src={monsterImage} alt={monster.name} loading="lazy" />
```

#### 2. **Challenge Preloading**

Preload next challenge while current one is active.

```typescript
onMount(() => {
	// Preload likely next challenges
	const nextChallenges = predictNextChallenges(playerElement);
	nextChallenges.forEach((challenge) => {
		preloadChallenge(challenge.id);
	});
});
```

#### 3. **WebSocket Message Throttling**

Avoid flooding WebSocket with updates.

```typescript
// Throttle combat updates to 1 per second
const throttledUpdate = throttle((update) => {
	websocket.send({ type: 'game:combat:update', payload: update });
}, 1000);
```

#### 4. **Database Query Optimization**

Use JOINs efficiently and select only needed columns.

```typescript
// ❌ BAD: Fetch everything
const { data } = await supabase.from('game_combats').select('*').eq('id', combatId);

// ✅ GOOD: Fetch only what's needed
const { data } = await supabase
	.from('game_combats')
	.select('id, status, current_round, monster_endurance_remaining')
	.eq('id', combatId);
```

---

## Testing Strategy

### Unit Tests

Focus on pure logic functions:

```typescript
// src/lib/utils/game/challenge-variables.test.ts
import { describe, it, expect } from 'vitest';
import { generateChallengeInstance } from './challenge-variables';

describe('Challenge Variable Generation', () => {
	it('should evaluate numeric variables', () => {
		const challenge = {
			variables: {
				a: { type: 'number', value: 'randomInt(1, 10)' }
			}
		};

		const instance = generateChallengeInstance(challenge);

		expect(instance.variables.a).toBeGreaterThanOrEqual(1);
		expect(instance.variables.a).toBeLessThan(10);
	});

	it('should handle variable dependencies', () => {
		const challenge = {
			variables: {
				a: { type: 'number', value: '5' },
				b: { type: 'number', value: '{a} * 2' }
			}
		};

		const instance = generateChallengeInstance(challenge);

		expect(instance.variables.b).toBe(10);
	});
});
```

### Integration Tests

Test combat flow end-to-end:

```typescript
// tests/game/combat-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete combat flow', async ({ page }) => {
	await page.goto('/dashboard/navadra/combat');

	// Start combat
	await page.click('button:has-text("Combattre")');

	// Select spell
	await page.click('[data-spell="1"]');

	// Solve challenge
	await page.fill('input[name="answer"]', '42');
	await page.click('button:has-text("Valider")');

	// Verify damage applied
	await expect(page.locator('.monster-hp')).toContainText('80/100');

	// Continue until victory
	// ...

	// Verify rewards
	await expect(page.locator('.xp-gained')).toBeVisible();
});
```

### Teacher Oversight Tests

Verify teachers can view student progress:

```typescript
test('teacher views student game progress', async ({ page }) => {
	await page.goto('/dashboard/teacher/students/student-id');

	// Check game stats visible
	await expect(page.locator('.game-progress')).toBeVisible();
	await expect(page.locator('.game-level')).toContainText('Niveau 5');
});
```

---

## Deployment Plan

### Pre-Deployment Checklist

**Database**:

- [ ] Run all migrations on production
- [ ] Verify RLS policies
- [ ] Import challenges
- [ ] Import achievements
- [ ] Seed spell definitions

**Assets**:

- [ ] Upload all assets to Supabase Storage
- [ ] Verify public access
- [ ] Test asset URLs
- [ ] Optimize images (WebP conversion)

**Configuration**:

- [ ] Set environment variables
- [ ] Configure WebSocket server
- [ ] Set up error tracking (Sentry)
- [ ] Enable rate limiting

**Testing**:

- [ ] Run full test suite
- [ ] Test on staging environment
- [ ] Verify mobile responsiveness
- [ ] Load test combat system

---

### Rollout Strategy

**Phase 1 Launch**: Soft launch to 1-2 classes

- Monitor for bugs
- Gather feedback
- Iterate quickly

**Phase 2 Launch**: Expand to all classes

- Announce to students
- Provide tutorial
- Monitor performance

**Post-Launch**:

- Weekly analytics review
- Bi-weekly bug fixes
- Monthly feature additions

---

## Conclusion

This guide provides a complete roadmap for integrating the full Navadra game into UbuMaths. The implementation is ambitious but achievable with the phased approach outlined above.

**Key Success Factors**:

1. **Start with Phase 1**: Solo combat is the foundation
2. **Port incrementally**: Don't try to port everything at once
3. **Test continuously**: Catch bugs early
4. **Gather feedback**: Students and teachers will guide improvements
5. **Be patient**: This is a 5-7 month project

**Next Steps**:

1. Review this guide with the team
2. Set up development environment
3. Begin Phase 1, Milestone 1.1 (Database Setup)
4. Create a project board to track milestones
5. Schedule regular check-ins

Good luck with the implementation! This will transform UbuMaths into a truly engaging educational gaming platform. 🎮🧮

---

**Document Version**: 1.0
**Last Updated**: October 15, 2025
**Author**: Claude Code
**Status**: Ready for Implementation
