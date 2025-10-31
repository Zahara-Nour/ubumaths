# 🎲 Riddles System

Daily mathematical riddles with automatic validation, manual grading, degressive rewards, and gamification features.

**Status**: ✅ Production
**Version**: 1.0.0
**Last Updated**: 2025-10-31

---

## 🚀 Quick Start

### For Teachers: Create a Riddle

1. Go to `/dashboard/teacher/riddles`
2. Click "Create New Riddle"
3. Write problem statement and solution
4. Choose validation type (automatic or manual)
5. Set difficulty and reward points
6. Set as "Riddle of the Day" or save for later

**Example**:

```markdown
**Problem**: If 3 apples cost €6, how much do 7 apples cost?
**Answer**: 14 (automatic validation: numerical exact)
**Base reward**: 50 gidouilles
**Difficulty**: medium
```

### For Students: Solve Daily Riddle

1. Go to `/dashboard/student/riddles`
2. View today's riddle
3. Submit your answer
4. Receive degressive gidouilles based on attempt number
5. Track progress in leaderboard and history

---

## 📖 Overview

The Riddles System provides daily mathematical challenges with:

- **Automatic Validation**: 5 input types with instant feedback
- **Manual Grading**: Teacher validation for open-ended answers
- **Riddle of the Day**: Automatic selection algorithm
- **Degressive Rewards**: First attempt = max gidouilles, decreases with retries
- **Gamification**: Badges, achievements, leaderboards
- **Statistics**: Track student engagement and success rates

### Key Features

✅ **5 Validation Types** - Numerical (exact/decimal/rounded), algebraic, multiple choice
✅ **Degressive Gidouilles** - Reward early success (100% → 75% → 50% → 25% → 10%)
✅ **Automatic Selection** - Algorithm picks riddle of the day based on difficulty/engagement
✅ **Manual Validation** - Teachers validate open-ended submissions with custom messages
✅ **Badge System** - 4 achievement types × 4 tiers (bronze/silver/gold/diamond)
✅ **Leaderboard** - Global ranking by total points
✅ **Statistics Dashboard** - Track participation, success rates, popular riddles
✅ **Archive System** - Browse past riddles with filters

---

## 🏗️ Architecture

High-level system architecture:

```
Teacher Dashboard → API → Database
     ↓                ↓         ↓
  Create Riddle   Validation  riddles
     ↓                        riddle_submissions
  Set Daily                   riddle_of_the_day
                              daily_riddle_assignments

Student Dashboard → Submit Answer → Validation
     ↓                    ↓              ↓
  View Daily         Automatic       Manual
     ↓                                  ↓
  Receive Gidouilles ← Update Stats ← Teacher Feedback
```

**Core Components**:

- **Riddles**: CRUD operations for riddle creation
- **Validation**: Automatic (5 types) + manual grading workflow
- **Daily Selection**: Algorithm for automatic riddle rotation
- **Submissions**: Track attempts, calculate degressive rewards
- **Badges**: Achievement system with 4 types × 4 tiers
- **Statistics**: Aggregated views for teachers and students

**📖 Complete details**: [Implementation](implementation.md)

---

## 📚 Documentation

### Technical Documentation

- **[Implementation](implementation.md)** - Complete system architecture (6 phases)
- **[Deployment](deployment.md)** - Production setup and cron configuration
- **[Optional Features](optional-features.md)** - 14 enhancement items for v1.1+

### User Guides

- **[Quick Start](quick-start.md)** - Step-by-step guide for teachers and students

---

## 🎯 Features

### Validation Types

| Type                     | Description            | Input Format  | Example                  |
| ------------------------ | ---------------------- | ------------- | ------------------------ |
| **numerical_exact**      | Exact integer          | `42`          | How many cm in 1m?       |
| **numerical_decimal**    | Decimal answer         | `3.14`        | Value of π to 2 decimals |
| **numerical_rounded**    | Rounded with tolerance | `3.14 ± 0.01` | Approximate π            |
| **algebraic_expression** | Algebraic formula      | `2x + 3`      | Simplify: x + x + 3      |
| **multiple_choice**      | Single selection       | `index: 2`    | Which is prime?          |

### Gidouilles Reward System

Degressive formula based on attempt number:

- **1st attempt**: 100% of base reward
- **2nd attempt**: 75% of base reward
- **3rd attempt**: 50% of base reward
- **4th attempt**: 25% of base reward
- **5+ attempts**: 10% of base reward

### Badge Achievement System

4 types × 4 tiers (16 total badges):

| Badge Type | Bronze        | Silver       | Gold         | Diamond       |
| ---------- | ------------- | ------------ | ------------ | ------------- |
| **Solver** | 10 solved     | 50 solved    | 200 solved   | 500 solved    |
| **Speed**  | 5 first-try   | 20 first-try | 75 first-try | 200 first-try |
| **Streak** | 7 days        | 30 days      | 100 days     | 365 days      |
| **Points** | 1K gidouilles | 5K           | 20K          | 100K          |

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Complete CRUD for riddles
- ✅ 5 automatic validation types
- ✅ Manual validation workflow with teacher feedback
- ✅ Riddle of the day with auto-selection algorithm
- ✅ Degressive gidouilles reward system
- ✅ Badge system (4 types × 4 tiers)
- ✅ Global leaderboard
- ✅ Personal history and statistics
- ✅ Teacher statistics dashboard
- ✅ Archive system with filters

### In Progress 🔄

- 🔄 Export CSV statistics
- 🔄 Advanced filtering in leaderboard
- 🔄 Push notifications for new riddles

### Planned 📝

- 📝 Riddle templates library
- 📝 Import/Export riddles (JSON)
- 📝 Visual riddle editor
- 📝 Collaborative multi-player riddles
- 📝 1v1 duel mode
- 📝 Tournament events
- 📝 AI-generated riddles based on curriculum

---

## 🔧 Technical Stack

- **Database**: Supabase PostgreSQL (4 tables, 3 views, 6 RPC functions)
- **Validation**: Custom TypeScript validators for 5 input types
- **Rewards**: Integration with gidouilles system
- **Auto-selection**: Algorithm based on difficulty, engagement, recency
- **Frontend**: Svelte 5 (runes), Tailwind CSS 4, Shadcn-svelte
- **Math Rendering**: MathLive for LaTeX formulas

---

## 📊 Statistics

- **Files Created**: 42 (components, pages, utils, API endpoints)
- **Database Tables**: 4 (riddles, submissions, daily, assignments)
- **Database Views**: 3 (aggregated stats)
- **RPC Functions**: 6 (submission, validation, leaderboard)
- **Validation Types**: 5 (numerical × 3, algebraic, multiple choice)
- **Badge Types**: 4 categories × 4 tiers = 16 total badges
- **Routes**: 8 (4 teacher pages, 4 student pages)

---

## 🔗 Related Features

- [Rewards](../rewards/README.md) - Gidouilles reward system
- [Questions](../questions/README.md) - Question templates with variables
- [Assessments](../assessments/README.md) - Formal evaluations

---

[← Back to Features](../README.md)
