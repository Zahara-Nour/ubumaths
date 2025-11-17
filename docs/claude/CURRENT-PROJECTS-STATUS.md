# Current Projects Status

> **Last Updated**: 2025-11-17
> **Active Project**: Template Syntax Unification (Project 2)
> **Master Overview**: `.claude/PROJECT-OVERVIEW-2025-11-17.md`

---

## 🚨 CRITICAL: Two Separate Projects in Progress

We have TWO distinct projects that must not be confused:

### Project 1: TinyMath Questions Migration (PAUSED)
- **Goal**: Migrate 2,238 questions from TinyMath to UbuMaths v2
- **Progress**: Phase 1 Complete, Phase 2 Paused
- **Blocked By**: Syntax incompatibility (being fixed in Project 2)
- **Will Resume**: After Project 2 completes

### Project 2: Template Syntax Unification (ACTIVE)
- **Goal**: Unify template syntax across Questions/Exercises/Shared
- **Progress**: Plan ready, execution starting
- **Duration**: 1-2 hours
- **Priority**: MUST complete before Project 1 Phase 2

---

## 📍 Current Position

```
You are here: Starting Project 2 execution
              ↓
Next step:    Delete seed questions from database
              ↓
Then:         Fix converter to output {{variable}} syntax
              ↓
Finally:      Resume Project 1 Phase 2 with correct syntax
```

---

## 🔄 Why the Interruption?

1. **Discovered during Phase 2 attempt**: Converter outputs `%{variable}`
2. **But Questions module expects**: `{{variable}}`
3. **Decision**: Fix converter BEFORE importing 2,238 questions
4. **Benefit**: Clean migration with correct syntax from the start

---

## 📚 Key Documentation Files

### Master Overview
- `.claude/PROJECT-OVERVIEW-2025-11-17.md` - **READ THIS FIRST**

### Project 1 (Migration) Docs
- `.claude/question-migration-analysis.md` - Detailed migration plan
- `.claude/PHASE1-COMPLETE-SUMMARY.md` - What's done
- `.claude/migration-progress.md` - Current progress

### Project 2 (Syntax) Docs
- `.claude/template-system-status.md` - Current status
- `.claude/DECISION-LOG-2025-11-17.md` - Key decisions
- `.claude/TIMELINE-BOTH-PROJECTS.md` - Visual timeline

---

## ⚡ Quick Commands

### Check Current State
```bash
# Verify syntax adapter works (from Phase 1 fix)
pnpm test:unit syntax-adapter

# Check for TypeScript errors
pnpm check:fast

# See if seed questions exist
echo "SELECT COUNT(*) FROM questions WHERE is_seed = true;" | pnpm supabase db query
```

### Execute Project 2
```bash
# Step 1: Delete seeds (after backup)
pnpm supabase db reset  # or manual SQL deletion

# Step 2: Test converter
pnpm test scripts/tinymce-to-ubumaths-converter.test.js

# Step 3: Test Shared library
pnpm test:unit template-engine
```

### Resume Project 1 (After Project 2)
```bash
# Import Phase 2 questions
node scripts/tinymce-to-ubumaths-converter.js \
  --input data/exports/tinymce_questions_core.json \
  --mode import
```

---

## 🎯 Success Indicators

### Project 2 Complete When:
- [ ] Seed questions deleted
- [ ] Converter outputs `{{variable}}` syntax
- [ ] Shared library uses unified syntax
- [ ] All tests pass

### Project 1 Can Resume When:
- [ ] Project 2 fully complete
- [ ] Converter verified to output correct syntax
- [ ] Test import successful

---

## ⚠️ Common Confusion Points

### DON'T Confuse:
- **Migration converter** (TinyMath→UbuMaths) with **syntax adapter** (temporary bridge)
- **Phase 1 complete** (infrastructure) with **Phase 2 paused** (actual import)
- **Project 1** (migration) with **Project 2** (syntax unification)

### DO Remember:
- Project 2 is a prerequisite for Project 1 Phase 2
- We're fixing the root cause, not adding workarounds
- The optimized plan skips database migration (no production data)

---

## 📞 If You're Lost

1. **First**: Read `.claude/PROJECT-OVERVIEW-2025-11-17.md`
2. **Then**: Check `.claude/TIMELINE-BOTH-PROJECTS.md` for visual guide
3. **Finally**: Look at this section:

### Where We Are Now
- **Active Project**: 2 (Template Syntax Unification)
- **Current Step**: About to delete seed questions
- **Next Step**: Fix converter script
- **Time Remaining**: ~1.5 hours for Project 2

### What Happens Next
1. Complete Project 2 (1-2 hours)
2. Resume Project 1 Phase 2
3. Import 2,238 questions with correct syntax
4. Continue through Phases 3-4

---

**Remember**: This interruption is SHORT (1-2 hours) but CRITICAL for clean migration.