# 🗂️ SRS & Flashcards

Spaced Repetition System (SRS) with interactive flashcards using the FSRS algorithm for optimal learning.

**Status**: ✅ Production
**Version**: 2.0.0
**Last Updated**: 2025-10-31

---

## 🚀 Quick Start

### For Teachers: Create a Deck

1. Go to `/dashboard/teacher/flashcards`
2. Click "Create New Deck"
3. Add title and description
4. Add flashcards with question/answer
5. Assign to students or classes
6. Track student progress

### For Students: Study with FSRS

1. Go to `/dashboard/student/flashcards`
2. Select an assigned or personal deck
3. Study cards with spaced repetition
4. Rate difficulty: Easy/Medium/Hard/Again
5. FSRS algorithm schedules next review automatically
6. Track your progress over time

---

## 📖 Overview

The SRS (Spaced Repetition System) uses the **FSRS algorithm** (Free Spaced Repetition Scheduler) to optimize learning retention.

### Key Features

✅ **FSRS Algorithm** - Science-based spaced repetition (v4.5)
✅ **Deck Management** - Create, edit, delete decks
✅ **Flashcard Types** - Question/Answer with rich text + images
✅ **Assignment System** - Assign decks to students/classes
✅ **Progress Tracking** - Monitor student study sessions
✅ **Three Card Components** - FlashCard, QuestionCard, CorrectionCard
✅ **Personal Decks** - Students can create their own decks

### FSRS Algorithm

FSRS (Free Spaced Repetition Scheduler) calculates optimal review intervals based on:

- **Difficulty** (D): How hard the card is for you
- **Stability** (S): How long until you forget
- **Retrievability** (R): Current memory strength

**Rating System**:

- **Again** (1): Forgot completely → Review soon
- **Hard** (2): Struggled to remember → Short interval
- **Medium** (3): Remembered with effort → Normal interval
- **Easy** (4): Instant recall → Long interval

**📖 Complete details**: [FSRS Algorithm](fsrs-algorithm.md)

---

## 🏗️ Architecture

High-level system architecture:

```
Teacher Dashboard → API → Services → Database
     ↓                ↓         ↓
  Create Deck    Validation  CRUD      decks
     ↓                              deck_cards
  Assign                         deck_assignments
                                 card_reviews
Student Dashboard → Study Session → FSRS → Update Reviews
```

**Core Components**:

- **Decks**: CRUD operations (create, read, update, delete)
- **Cards**: Question/Answer pairs with rich text
- **Assignments**: Assign decks to students/classes
- **Reviews**: Track study sessions with FSRS
- **FSRS**: Algorithm implementation (TypeScript port)

**📖 Complete details**: [System Architecture](system.md)

---

## 📚 Documentation

### Technical Documentation

- **[System Architecture](system.md)** - Complete system design
- **[FSRS Algorithm](fsrs-algorithm.md)** - How spaced repetition works
- **[Deck Management](deck-management.md)** - CRUD operations
- **[Testing](testing.md)** - Test suite and coverage
- **[Migration v1→v2](migration-v1-v2.md)** - Upgrade guide

### Component Documentation

- **[Components Overview](components.md)** - All three card components
- **[FlashCard Component](flashcard-component.md)** - Basic flashcard
- **[QuestionCard Component](question-card.md)** - Question display
- **[CorrectionCard Component](correction-card.md)** - Answer + rating

### User Guides

- **[Quick Start](quick-start.md)** - Get started in 5 minutes
- **[Test Feature](test-feature.md)** - How to test the system

---

## 🎯 Components

### Three Card Types

| Component          | Purpose         | Used By  | Features                               |
| ------------------ | --------------- | -------- | -------------------------------------- |
| **FlashCard**      | Basic flashcard | Both     | Simple question/answer, flip animation |
| **QuestionCard**   | Study session   | Students | FSRS integration, rating buttons       |
| **CorrectionCard** | After rating    | Students | Show answer, track progress            |

### Deck Properties

- **Title**: Deck name
- **Description**: Optional details
- **Creator**: Teacher who created it
- **Assignment**: Students/classes who can access
- **Cards**: Collection of question/answer pairs
- **Reviews**: Study session history with FSRS data

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ FSRS algorithm implementation (v4.5)
- ✅ Deck CRUD operations
- ✅ Flashcard creation with rich text
- ✅ Assignment system (student/class-level)
- ✅ Study session interface
- ✅ Progress tracking
- ✅ Three card components (FlashCard, QuestionCard, CorrectionCard)
- ✅ Personal deck creation (students)
- ✅ Migration system (v1→v2)

### In Progress 🔄

- 🔄 Image support in flashcards
- 🔄 Advanced statistics dashboard

### Planned 📝

- 📝 Shared decks (collaborative learning)
- 📝 Import/export decks (JSON, Anki format)
- 📝 Audio support (pronunciation cards)
- 📝 Cloze deletions (fill-in-the-blank)
- 📝 Mobile app integration

---

## 🔧 Technical Stack

- **Algorithm**: FSRS v4.5 (TypeScript port from Rust original)
- **Database**: Supabase PostgreSQL (decks, cards, assignments, reviews)
- **Components**: Svelte 5 (runes), FlashCard/QuestionCard/CorrectionCard
- **Math Rendering**: MathLive (for LaTeX formulas)
- **Frontend**: Tailwind CSS 4, Shadcn-svelte

---

## 📊 Statistics

- **Algorithm**: FSRS v4.5
- **Components**: 3 (FlashCard, QuestionCard, CorrectionCard)
- **Database Tables**: 4 (decks, deck_cards, deck_assignments, card_reviews)
- **API Endpoints**: 8 (CRUD, assignments, reviews, study sessions)
- **Test Coverage**: 50+ tests

---

## 🔗 Related Features

- [Questions](../questions/README.md) - Question templates with variables
- [Assessments](../assessments/README.md) - Formal evaluations
- [Exercises](../exercises/README.md) - Exercise bank

---

[← Back to Features](../README.md)
