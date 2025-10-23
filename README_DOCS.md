# UbuMaths Documentation Index

Complete documentation for the UbuMaths educational math application.

**Last Updated**: 2025-10-23

---

## 🚀 Quick Start

| Document                                 | Description                          | Audience   |
| ---------------------------------------- | ------------------------------------ | ---------- |
| [CLAUDE.md](CLAUDE.md)                   | Project overview & development guide | Developers |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Complete database schema reference   | Developers |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md)       | Git workflow & version management    | Developers |

---

## 🐛 Error Monitoring System (NEW)

**Status**: ✅ Operational

| Document                                                               | Description                       | Audience   |
| ---------------------------------------------------------------------- | --------------------------------- | ---------- |
| [**ERROR_MONITORING_QUICK_START.md**](ERROR_MONITORING_QUICK_START.md) | ⚡ Quick start guide (5 min)      | All        |
| [**ERROR_MONITORING_SYSTEM.md**](ERROR_MONITORING_SYSTEM.md)           | 📖 Complete reference (70+ pages) | Developers |

**Key Features**:

- ✅ Automatic error capture (client & server)
- ✅ Admin dashboard `/dashboard/admin/errors`
- ✅ Test page `/dashboard/admin/errors/test`
- ✅ Critical error notifications
- ✅ Privacy-protected (student data sanitized)
- ✅ Service role bypass for logging

**Quick Links**:

- Dashboard: http://localhost:5173/dashboard/admin/errors
- Test Page: http://localhost:5173/dashboard/admin/errors/test
- Migration: `supabase/migrations/20251023024428_create_error_monitoring_system.sql`

---

## 📚 Question Components Documentation

| Document                                                     | Description                              | Status     |
| ------------------------------------------------------------ | ---------------------------------------- | ---------- |
| [DOCS_INDEX.md](DOCS_INDEX.md)                               | 📑 Question components documentation hub | ✅ Current |
| [FLASHCARD_README.md](FLASHCARD_README.md)                   | FlashCard component guide                | ✅ Current |
| [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md)             | FlashCard technical docs                 | ✅ Current |
| [QUESTION_CARD_COMPONENT.md](QUESTION_CARD_COMPONENT.md)     | QuestionCard technical docs              | ✅ Current |
| [CORRECTION_CARD_COMPONENT.md](CORRECTION_CARD_COMPONENT.md) | CorrectionCard technical docs            | ✅ Current |

**Which component to use?**

- **FlashCard**: Interactive study/revision with immediate feedback
- **QuestionCard**: Tests/exams with deferred feedback
- **CorrectionCard**: Post-test corrections with flip animation

See [DOCS_INDEX.md](DOCS_INDEX.md) for complete question component documentation.

---

## 🎯 Assessment System

| Document                                                       | Description                | Status     |
| -------------------------------------------------------------- | -------------------------- | ---------- |
| [ASSESSMENT_SYSTEM_SUMMARY.md](ASSESSMENT_SYSTEM_SUMMARY.md)   | Assessment system overview | ✅ Current |
| [CLAUDE_FEATURES_ASSESSMENT.md](CLAUDE_FEATURES_ASSESSMENT.md) | Assessment feature guide   | ✅ Current |

**Features**:

- Teacher-created assessments
- Graded evaluations
- Assignment tracking
- Results dashboard
- Question bank integration

---

## 📝 Spaced Repetition System (SRS)

| Document                                                     | Description            | Status     |
| ------------------------------------------------------------ | ---------------------- | ---------- |
| [SRS_INDEX.md](SRS_INDEX.md)                                 | SRS documentation hub  | ✅ Current |
| [SRS_QUICK_START.md](SRS_QUICK_START.md)                     | Quick start guide      | ✅ Current |
| [SRS_SYSTEM_DOCUMENTATION.md](SRS_SYSTEM_DOCUMENTATION.md)   | Complete SRS reference | ✅ Current |
| [FSRS_GUIDE.md](FSRS_GUIDE.md)                               | FSRS algorithm guide   | ✅ Current |
| [SRS_IMPLEMENTATION_STATUS.md](SRS_IMPLEMENTATION_STATUS.md) | Implementation status  | ✅ Current |

**Features**:

- FSRS algorithm implementation
- Deck management
- Review scheduling
- Custom card creation
- Analytics & progress tracking

---

## 🔔 Notification System

| Document                                           | Description                   | Status     |
| -------------------------------------------------- | ----------------------------- | ---------- |
| [NOTIFICATIONS_SYSTEM.md](NOTIFICATIONS_SYSTEM.md) | Notification system reference | ✅ Current |

**Features**:

- User notifications
- System notifications
- Priority levels (normal, important, urgent)
- Targeting (all, role, classes, users)
- Read/unread tracking
- Notification expiration

---

## 💬 Private Messaging System

| Document                                                                                   | Description                      | Status     |
| ------------------------------------------------------------------------------------------ | -------------------------------- | ---------- |
| [PRIVATE_MESSAGING_SESSION_COMPLETE.md](PRIVATE_MESSAGING_SESSION_COMPLETE.md)             | Private messaging implementation | ✅ Current |
| [MESSAGE_TEMPLATES_GUIDE.md](MESSAGE_TEMPLATES_GUIDE.md)                                   | Message templates guide          | ✅ Current |
| [MESSAGE_TEMPLATES_IMPLEMENTATION_SUMMARY.md](MESSAGE_TEMPLATES_IMPLEMENTATION_SUMMARY.md) | Templates implementation         | ✅ Current |

**Features**:

- Student-teacher messaging
- Thread support
- Message templates
- Rich text editor (TipTap)
- File attachments (max 5MB)
- Read receipts

---

## 🧩 Riddles System

| Document                                                             | Description               | Status     |
| -------------------------------------------------------------------- | ------------------------- | ---------- |
| [RIDDLES_DOCS_INDEX.md](RIDDLES_DOCS_INDEX.md)                       | Riddles documentation hub | ✅ Current |
| [RIDDLES_QUICK_START_GUIDE.md](RIDDLES_QUICK_START_GUIDE.md)         | Quick start guide         | ✅ Current |
| [RIDDLES_SYSTEM_IMPLEMENTATION.md](RIDDLES_SYSTEM_IMPLEMENTATION.md) | Implementation details    | ✅ Current |
| [RIDDLES_SYSTEM_SUMMARY.md](RIDDLES_SYSTEM_SUMMARY.md)               | System summary            | ✅ Current |

**Features**:

- Daily riddles
- Auto-selection algorithm
- Badge/reward system
- Difficulty levels
- Hints & solutions
- Admin management

---

## 🗄️ Database

| Document                                             | Description               | Status     |
| ---------------------------------------------------- | ------------------------- | ---------- |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)             | Complete schema reference | ✅ Current |
| [UPDATE_DATABASE_TYPES.md](UPDATE_DATABASE_TYPES.md) | Type generation guide     | ✅ Current |

**Key Tables**:

- `profiles` - User profiles (students, teachers, admins)
- `schools` - School information
- `classes` - Class management
- `class_members` - Student-class relationships
- `error_logs` - Error monitoring (NEW)
- `error_occurrences` - Error deduplication (NEW)
- `notifications` - User notifications
- `private_messages` - Private messaging
- `riddles` - Riddle system
- Plus many more...

**Migrations Location**: `supabase/migrations/`

---

## ⚙️ Development

### Essential Files

| File                                           | Description            |
| ---------------------------------------------- | ---------------------- |
| [CLAUDE.md](CLAUDE.md)                         | Main development guide |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md)             | Git workflow           |
| [VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md) | Version management     |
| `package.json`                                 | Dependencies & scripts |
| `tsconfig.json`                                | TypeScript config      |
| `tailwind.config.ts`                           | Tailwind CSS config    |

### Development Commands

```bash
# Development
pnpm dev              # Start dev server (port 5173 for user, 5175 for Claude)
pnpm build            # Build for production
pnpm check            # Type checking
pnpm lint             # Check formatting/linting
pnpm format           # Format code

# Testing
pnpm test:unit        # Run Vitest tests

# Database
pnpm db:migrate       # Push Supabase migrations
pnpm db:status        # Check migration status

# Release
pnpm release          # Create version release (main branch only)
```

### Tech Stack

- **Framework**: SvelteKit + Svelte 5 (runes)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn-svelte
- **Math**: MathLive
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Package Manager**: pnpm

---

## 📊 Features Documentation

### Core Features

| Feature          | Documentation                                                                  | Status |
| ---------------- | ------------------------------------------------------------------------------ | ------ |
| Questions        | [DOCS_INDEX.md](DOCS_INDEX.md)                                                 | ✅     |
| Assessments      | [ASSESSMENT_SYSTEM_SUMMARY.md](ASSESSMENT_SYSTEM_SUMMARY.md)                   | ✅     |
| SRS/Flashcards   | [SRS_INDEX.md](SRS_INDEX.md)                                                   | ✅     |
| Notifications    | [NOTIFICATIONS_SYSTEM.md](NOTIFICATIONS_SYSTEM.md)                             | ✅     |
| Private Messages | [PRIVATE_MESSAGING_SESSION_COMPLETE.md](PRIVATE_MESSAGING_SESSION_COMPLETE.md) | ✅     |
| Riddles          | [RIDDLES_DOCS_INDEX.md](RIDDLES_DOCS_INDEX.md)                                 | ✅     |
| Error Monitoring | [ERROR_MONITORING_SYSTEM.md](ERROR_MONITORING_SYSTEM.md)                       | ✅ NEW |

### Additional Features

| Feature            | Documentation                                          |
| ------------------ | ------------------------------------------------------ |
| User Management    | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#profiles)      |
| School Management  | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#schools)       |
| Class Management   | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#classes)       |
| Friend System      | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#friendships)   |
| Real-Time Presence | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#user_presence) |

---

## 🔍 Finding Documentation

### By Topic

- **Questions/Tests**: [DOCS_INDEX.md](DOCS_INDEX.md)
- **Assessments**: [ASSESSMENT_SYSTEM_SUMMARY.md](ASSESSMENT_SYSTEM_SUMMARY.md)
- **Flashcards/SRS**: [SRS_INDEX.md](SRS_INDEX.md)
- **Notifications**: [NOTIFICATIONS_SYSTEM.md](NOTIFICATIONS_SYSTEM.md)
- **Messaging**: [PRIVATE_MESSAGING_SESSION_COMPLETE.md](PRIVATE_MESSAGING_SESSION_COMPLETE.md)
- **Riddles**: [RIDDLES_DOCS_INDEX.md](RIDDLES_DOCS_INDEX.md)
- **Errors**: [ERROR_MONITORING_QUICK_START.md](ERROR_MONITORING_QUICK_START.md)
- **Database**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Development**: [CLAUDE.md](CLAUDE.md)

### By Role

**Developers**:

1. Start: [CLAUDE.md](CLAUDE.md)
2. Database: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
3. Git: [GIT_WORKFLOW.md](GIT_WORKFLOW.md)
4. Features: See sections above

**Admins**:

1. Error Monitoring: [ERROR_MONITORING_QUICK_START.md](ERROR_MONITORING_QUICK_START.md)
2. Notifications: [NOTIFICATIONS_SYSTEM.md](NOTIFICATIONS_SYSTEM.md)
3. User Management: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

**Teachers**:

1. Assessments: [ASSESSMENT_SYSTEM_SUMMARY.md](ASSESSMENT_SYSTEM_SUMMARY.md)
2. Question Components: [DOCS_INDEX.md](DOCS_INDEX.md)
3. SRS/Flashcards: [SRS_QUICK_START.md](SRS_QUICK_START.md)
4. Messaging: [MESSAGE_TEMPLATES_GUIDE.md](MESSAGE_TEMPLATES_GUIDE.md)

---

## 📈 Documentation Statistics

- **Total Documentation Files**: 60+
- **Total Pages**: ~5,000+ lines
- **Last Major Update**: 2025-10-23 (Error Monitoring System)
- **Most Recent Feature**: Error Monitoring (v1.0)

---

## 🔗 External Resources

- **Svelte 5**: https://svelte.dev/docs/svelte/overview
- **SvelteKit**: https://kit.svelte.dev/docs
- **Shadcn-svelte**: https://www.shadcn-svelte.com/docs
- **MathLive**: https://cortexjs.io/mathlive/
- **Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## 🆕 What's New

### October 23, 2025

**🐛 Error Monitoring System** - v1.0

- Comprehensive error logging (client + server)
- Admin dashboard with filters & statistics
- Automatic error deduplication
- Privacy-protected logging
- Critical error notifications
- Test page for verification

**Documentation**:

- [ERROR_MONITORING_QUICK_START.md](ERROR_MONITORING_QUICK_START.md) - Quick start (NEW)
- [ERROR_MONITORING_SYSTEM.md](ERROR_MONITORING_SYSTEM.md) - Complete reference (NEW)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Updated with error tables

### Previous Updates

- **October 22, 2025**: Riddles System
- **October 22, 2025**: Message Templates
- **October 22, 2025**: Private Messaging
- **October 21, 2025**: Question Components v2.0
- **Earlier**: SRS, Assessments, Notifications, etc.

---

## 🤝 Contributing

When adding new features:

1. ✅ Update relevant documentation
2. ✅ Update [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) if schema changes
3. ✅ Update this index ([README_DOCS.md](README_DOCS.md))
4. ✅ Create migration files for database changes
5. ✅ Update types: `npx supabase gen types typescript --linked > src/lib/types/database.ts`

---

## 📞 Support

For questions or issues:

1. Check relevant documentation above
2. Check [CLAUDE.md](CLAUDE.md) for development guidance
3. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for database questions
4. Check feature-specific docs for feature questions

---

**Maintained by**: Claude Code
**Project**: UbuMaths Educational Math Platform
**Status**: 🟢 Active Development
