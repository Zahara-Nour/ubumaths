# Where to Find MathGraph32 Examples

This document explains where to find examples and documentation for using the MathGraph32 wrapper in the UbuMaths geometry system.

---

## 🎮 Interactive Live Examples

### Admin Debug Dashboard - MathGraph32 Tab

**Location:** `/dashboard/admin/debug/mathgraph`

**Access:** Admin users only

**Features:**
- ✅ **Live interactive examples** - Click buttons to create figures in real-time
- ✅ **Copy-paste ready code** - All examples show the actual TypeScript code used
- ✅ **3 tabbed sections:**
  - **Live Examples:** Create triangle, circle, perpendicular bisector, export figures
  - **Validation:** Complete validation example with 30+ validators listed
  - **Advanced:** Randomization examples and resources

**Examples Available:**
1. **Create Triangle** - Basic triangle with 3 points and segments (**with fullscreen support** 🆕)
2. **Create Circle** - Circle with center and radius point (**with fullscreen support** 🆕)
3. **Perpendicular Bisector** - Classic construction exercise (**with fullscreen support** 🆕)
4. **Export Figure** - How to save/load figures from database
5. **Validation** - Complete validation workflow
6. **Randomization** - Random figure generation

**🖥️ New Feature: Fullscreen Mode** 🆕
All interactive examples now support fullscreen viewing! Use the fullscreen button in the top-right corner or press **F** to toggle fullscreen mode.

**How to Access:**
1. Log in as admin user
2. Go to Dashboard
3. Navigate to Admin Debug section
4. Click on "MathGraph32" tab

---

## 📚 Documentation Files

### 1. MATHGRAPH32_API_GUIDE.md (~1,000 lines)

**Location:** `/MATHGRAPH32_API_GUIDE.md`

**Best for:** Understanding the MathGraph32 API fundamentals

**Contents:**
- CDN loading with singleton pattern
- Player vs Editor modes
- Object creation API (points, lines, circles, etc.)
- Coordinate systems and conversions
- Event handling and lifecycle
- **7 common pitfalls with solutions**
- **6 complete code examples**

**Key Sections:**
```markdown
1. Introduction
2. Getting Started
3. Loading MathGraph32
4. Creating Figures
5. Object Types
6. Validation
7. Common Pitfalls
8. Complete Examples
```

---

### 2. GEOMETRY_API_DOCS.md (~2,000 lines)

**Location:** `/GEOMETRY_API_DOCS.md`

**Best for:** Complete technical reference

**Contents:**
- Database schema (6 tables with full SQL)
- TypeScript interfaces and types
- **30+ validators documented** with function signatures
- Figure generator API
- Grading system internals
- Integration examples

**MathGraph32-Specific Sections:**
- Validation engine (uses MathGraph32 app instance)
- Figure generator (creates MathGraph32 figures programmatically)
- Service APIs (mathgraph-api.ts wrapper)

---

### 3. GEOMETRY_TEACHER_GUIDE.md (~1,500 lines, French)

**Location:** `/GEOMETRY_TEACHER_GUIDE.md`

**Best for:** Practical, ready-to-use examples for teachers

**New Section Added:** "Exemples Complets d'Exercices"

**6 Complete Examples:**
1. **Construction - Médiatrice** (Facile)
   - Complete SQL with validation config
   - 3-level hints system
   - Full MathGraph32 figure setup

2. **Mesure - Triangle rectangle** (Facile)
   - Angle measurement exercise
   - Sum validation

3. **Exploration - Cercle circonscrit** (Facile)
   - Interactive observation
   - Self-check mode

4. **Démonstration - Angles opposés** (Moyen)
   - 6-step proof validation

5. **Construction - Triangle isocèle** (Moyen)
   - **With randomization!**
   - Random positions and radius

6. **Construction - Cercle inscrit** (Difficile)
   - **5-step validation workflow**
   - Complete bissectrice construction

Each example includes:
- ✅ Student instructions (French)
- ✅ Complete SQL INSERT statements
- ✅ Validation configuration
- ✅ Hints at 3 levels
- ✅ Expected outcomes

---

### 4. GEOMETRY_EXAMPLES.md (~1,200 lines)

**Location:** `/GEOMETRY_EXAMPLES.md`

**Best for:** 12 complete exercise examples with full code

**Structure:** 3 examples per difficulty × 4 exercise types

**Each Example Includes:**
- Full JSON configuration
- TypeScript component usage code
- **MathGraph32 figure generation code**
- Validation logic explanation
- Grading rubric
- Expected student workflow

**Examples:**
- Easy: Triangle basics, circle basics, simple constructions
- Medium: Angle bisector, Thales theorem, inscribed circle
- Hard: Geometric locus, complex proofs, multi-step constructions

---

## 🎨 Demo Page

**Location:** `/demo/geometry`

**Access:** Public (no authentication required)

**Features:**
- 5 tabbed sections (Overview, Features, Examples, Grading, Documentation)
- All 12 exercise examples listed
- Links to all documentation
- Complete system showcase

**MathGraph32 References:**
- Overview tab mentions MathGraph32
- Features tab shows 10 construction tools
- Examples tab shows 12 exercises
- Documentation tab links to MATHGRAPH32_API_GUIDE.md

---

## 🔧 Code Files with Examples

### Service File: mathgraph-api.ts

**Location:** `/src/lib/services/mathgraph-api.ts`

**Contents:**
- Singleton pattern implementation
- CDN loading logic
- Helper functions
- **JSDoc with usage examples**

**Example from JSDoc:**
```typescript
/**
 * @example Loading MathGraph32
 * ```typescript
 * import { MathGraphService } from '$lib/services/mathgraph-api';
 *
 * const service = MathGraphService.getInstance();
 * await service.loadMathGraph();
 *
 * const app = window.mtgLoad.mtgApp('canvas-id', {
 *   width: 600,
 *   height: 400,
 *   toolbar: true
 * });
 * ```
 */
```

---

## 📖 Quick Reference Guide

### For Developers:

1. **Start with:** MATHGRAPH32_API_GUIDE.md
2. **Reference:** GEOMETRY_API_DOCS.md
3. **See live examples:** `/dashboard/admin/debug/mathgraph`
4. **Copy real code:** GEOMETRY_EXAMPLES.md

### For Teachers:

1. **Start with:** GEOMETRY_TEACHER_GUIDE.md (now has 6 complete examples!)
2. **Browse examples:** GEOMETRY_EXAMPLES.md
3. **Visual demo:** `/demo/geometry`

### For Students:

1. **Learn tools:** GEOMETRY_STUDENT_GUIDE.md
2. **Try interactive demo:** `/demo/geometry`

---

## 🎯 Example Use Cases

### "I want to create a simple triangle exercise"
→ Go to: **GEOMETRY_TEACHER_GUIDE.md** → "Exemples Complets" → Example 2 (Triangle rectangle)

### "I need to understand the MathGraph32 API"
→ Go to: **MATHGRAPH32_API_GUIDE.md** → Complete guide with pitfalls

### "I want to see working code I can run"
→ Go to: **`/dashboard/admin/debug/mathgraph`** → Live interactive examples

### "I need validation examples"
→ Go to: **`/dashboard/admin/debug/mathgraph`** → Validation tab

### "I want to implement randomization"
→ Go to: **GEOMETRY_TEACHER_GUIDE.md** → Example 5 (Triangle isocèle)
→ Or: **`/dashboard/admin/debug/mathgraph`** → Advanced tab

### "I need all 30+ validators documented"
→ Go to: **GEOMETRY_API_DOCS.md** → Validation section

---

## 🚀 Quick Start

**For a teacher creating their first exercise:**

1. Read **GEOMETRY_TEACHER_GUIDE.md** → "Exemples Complets" → Example 1 (Médiatrice)
2. Copy the SQL INSERT statement
3. Replace `[VOTRE_FIGURE_BASE64_ICI]` with your MathGraph32 figure
4. Create your figure at https://www.mathgraph32.org/
5. Export as base64 and paste into SQL

**For a developer integrating MathGraph32:**

1. Read **MATHGRAPH32_API_GUIDE.md** → "Getting Started"
2. Visit **`/dashboard/admin/debug/mathgraph`** → Click "Create Triangle"
3. Copy the code shown in the output
4. Adapt for your use case
5. Reference **GEOMETRY_API_DOCS.md** for validators

---

## 📊 Summary Table

| Resource | Type | Audience | MathGraph32 Content | Best For |
|----------|------|----------|---------------------|----------|
| `/dashboard/admin/debug/mathgraph` | Interactive | Developers | 6 live examples | Testing code |
| MATHGRAPH32_API_GUIDE.md | Documentation | Developers | Complete API guide | Learning API |
| GEOMETRY_API_DOCS.md | Documentation | Developers | Full reference | Technical details |
| GEOMETRY_TEACHER_GUIDE.md | Documentation | Teachers | 6 SQL examples | Creating exercises |
| GEOMETRY_EXAMPLES.md | Documentation | All | 12 complete examples | Real-world usage |
| `/demo/geometry` | Interactive | All | System showcase | Understanding system |
| mathgraph-api.ts | Code | Developers | Implementation | Understanding internals |

---

## 🆕 What's New (October 2025)

1. ✅ **New Admin Debug Page:** Interactive MathGraph32 examples at `/dashboard/admin/debug/mathgraph`
2. ✅ **Teacher Guide Enhanced:** 6 complete examples added to GEOMETRY_TEACHER_GUIDE.md
3. ✅ **All Services Documented:** JSDoc added to all 6 geometry services
4. ✅ **Complete Documentation:** ~6,500 lines across 5 files
5. ✅ **Demo Page Created:** Public showcase at `/demo/geometry`
6. ✅ **Fullscreen Mode Added:** 🆕 All MathGraph32 figures now support fullscreen viewing
   - **New Component:** `MathGraphFullscreen.svelte` wrapper component
   - **New Service Methods:** `requestFullscreen()`, `exitFullscreen()`, `toggleFullscreen()`, `isFullscreen()`
   - **Keyboard Shortcuts:** Press `F` or `F11` to toggle, `Escape` to exit
   - **Auto-Resize:** Canvas automatically adapts to fullscreen dimensions
   - **Integrated in:**
     - Demo page (`/demo/geometry`) - Triangle and Circle examples
     - Admin debug page (`/dashboard/admin/debug/mathgraph`) - All interactive figures
   - **Documentation:** Complete fullscreen guide in MATHGRAPH32_API_GUIDE.md

---

**Last Updated:** October 16, 2025
**Status:** Complete ✅
