# Project Overview: Two Parallel Initiatives

> **Last Updated**: 2025-11-17 (Current Session)
> **Purpose**: Master overview to prevent confusion between two separate but related projects

---

## 📊 Current Status Dashboard

```
Project 1: TinyMath Migration    [■■■□□□□□□□] 30% - READY TO RESUME
Project 2: Template Unification  [■■■■■■■■■□] 90% - PHASE 4 NEXT

Dependencies: Project 2 Phase 3 ✅ COMPLETE - Ready for Phase 4 cleanup
```

---

## 🎯 Project 1: TinyMath Questions Migration (ORIGINAL)

### Overview
- **Goal**: Migrate 2,238 questions from TinyMath to UbuMaths v2
- **Started**: Before 2025-11-17 session
- **Status**: Phase 1 COMPLETE ✅, Phase 2 BLOCKED ⏸️
- **Duration**: Multi-phase project (estimated 4-6 hours total)

### Current State
```
Phase 1: Infrastructure ✅ COMPLETE (2025-11-16)
Phase 2: Import Core    ⏸️ PAUSED (waiting for Project 2)
Phase 3: Import MathLive □ NOT STARTED
Phase 4: Verification   □ NOT STARTED
```

### Documentation
- **Master Plan**: `.claude/question-migration-analysis.md`
- **Phase 1 Complete**: `.claude/PHASE1-COMPLETE-SUMMARY.md`
- **Progress Tracking**: `.claude/migration-progress.md`
- **Converter Script**: `scripts/tinymce-to-ubumaths-converter.js`

### Why Paused?
- Discovered converter outputs `%{variable}` syntax
- UbuMaths Questions expects `{{variable}}` syntax
- Must fix converter BEFORE importing 2,238 questions

---

## 🔄 Project 2: Template Syntax Unification (NEW - THIS SESSION)

### Overview
- **Goal**: Unify template syntax between Questions and Exercises
- **Started**: 2025-11-17 (current session)
- **Status**: Phase 3 COMPLETE ✅, Phase 4 cleanup NEXT
- **Duration**: Completed in 2 hours

### The Problem
```
Questions Module: Uses {{variable}} syntax (mustache-like)
Exercises Module: Uses %{variable} syntax (custom)
Shared Library:   MUST support both → Needs unification
```

### Optimized Solution (Decided 2025-11-17)
1. **Delete seed questions** ✅ COMPLETE (test data only, backup created)
2. **Fix converter** ✅ COMPLETE to output `{{variable}}` syntax
3. **Skip DB migration** ✅ COMPLETE (no production data exists)
4. **Test thoroughly** ✅ COMPLETE before resuming Project 1

### Current State
```
Phase 3.1: Delete seed questions ✅ COMPLETE (10 questions backed up)
Phase 3.2: Fix converter syntax   ✅ COMPLETE (108 lines changed)
Phase 3.3: Test converter        ✅ COMPLETE (126/126 passing, 100%)
Phase 3.4: Code review           ✅ COMPLETE (APPROVED for production)
Phase 4.1: Cleanup & removal     ⏳ NEXT STEP
```

### Documentation
- **Progress**: `.claude/migration-progress.md` (Phase 3 summary)
- **Decision Log**: `.claude/DECISION-LOG-2025-11-17.md` (Decision 5 added)
- **Backup**: `.claude/BACKUP-SEED-QUESTIONS-2025-11-17.md`
- **Code Review**: Code review completed, APPROVED with minor notes

---

## 🔗 Interdependence

### Critical Relationship
```
Project 2 (Template Unification)
    ↓
MUST COMPLETE FIRST
    ↓
Project 1 Phase 2 (TinyMath Import)
```

### Why This Order?
1. **Converter must output correct syntax** before importing 2,238 questions
2. **Better to fix now** than migrate with wrong syntax and fix later
3. **Simpler solution** - no runtime adapters needed
4. **Cleaner codebase** - single syntax throughout

---

## 📍 Current Position & Next Steps

### YOU ARE HERE
```
Timeline: [P1-Phase1]--✅--[P2-Phase3]--✅--[P2-Phase4]--⏳--[P1-Phase2]----[P1-Phase3]----[P1-Phase4]
                                               ↑
                                          YOU ARE HERE
```

### Next Immediate Actions
1. **NOW**: Complete Project 2 Phase 4 - Cleanup
   - Remove old syntax adapter (if present)
   - Clean up test files
   - Update documentation
   - Final validation

2. **THEN**: Resume Project 1 - Phase 2
   - Import 2,238 TinyMath questions with correct `{{...}}` syntax
   - All questions will be compatible with Shared library
   - Continue through Phases 3-4

### Command to Resume Project 1
```bash
# After Phase 4 cleanup complete
pnpm tsx scripts/migrate-questions-phase1.ts --dry-run  # Preview
pnpm tsx scripts/migrate-questions-phase1.ts            # Execute
```

---

## 📊 Full Timeline Visualization

```
2025-11-16: Project 1 Phase 1 Started
    ├── Infrastructure ready ✅
    ├── Converter created ✅
    └── Pipeline tested ✅

2025-11-17 Morning: Project 1 Phase 2 Attempted
    ├── Discovered syntax issue ⚠️
    └── Decision: Pause and fix syntax first

2025-11-17 Morning: Project 2 Started
    ├── Analyzed problem
    ├── Optimized solution
    └── Executed Phase 3

2025-11-17 Afternoon: Project 2 Phase 3 Complete ✅ ← NOW
    ├── Deleted 10 seed questions (backed up)
    ├── Fixed converter (108 lines changed)
    ├── Tests passing (126/126, 100%)
    ├── Code reviewed (APPROVED)
    └── Ready for Phase 4 cleanup

2025-11-17 Next: Project 2 Phase 4 (cleanup)
    └── Then resume Project 1 Phase 2

2025-11-17/18: Project 1 Phases 2-4
    └── Complete migration
```

---

## 🔄 Session Recovery Instructions

### If Session Crashes
1. **Read THIS FILE first** to understand both projects
2. **Check current status**:
   - Project 2 complete? → Resume Project 1 Phase 2
   - Project 2 incomplete? → Check `.claude/template-system-status.md`
3. **Continue from last checkpoint** marked in status files

### Key Files to Check
- **This file**: Overall status and current focus
- **For Project 1**: `.claude/question-migration-analysis.md`
- **For Project 2**: `.claude/template-system-status.md`
- **For decisions**: `.claude/DECISION-LOG-2025-11-17.md`

---

## ✅ Success Criteria

### Project 2 Success (TODAY)
- [x] All seed questions deleted (10 backed up)
- [x] Converter outputs `{{variable}}` syntax (108 lines changed)
- [x] Tests pass with new syntax (126/126, 100%)
- [x] Code review approved
- [ ] Phase 4 cleanup complete

### Project 1 Success (AFTER Project 2)
- [ ] 2,238 questions imported successfully
- [ ] All template variables work
- [ ] MathLive integration complete
- [ ] Full verification passes

---

## 📝 Important Notes

1. **DO NOT** start Project 1 Phase 2 until Project 2 completes
2. **DO NOT** confuse the two converters:
   - Project 1: `scripts/tinymce-to-ubumaths-converter.js` (TinyMath → UbuMaths)
   - Project 2: Fixing the above to output correct syntax
3. **ALWAYS** check this file when resuming work

---

**Remember**: We are fixing the syntax issue (Project 2) SO THAT we can properly migrate TinyMath questions (Project 1).