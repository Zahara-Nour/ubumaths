# MathGraph32 API Documentation Update Summary

**Date:** 2025-01-16
**Updated by:** Claude Code
**Source:** Official API Documentation at https://www.mathgraph32.org/documentation/full/MtgApi.html

---

## Overview

The MathGraph32 API documentation has been **completely updated** based on the official API reference. Previous documentation contained several method names that were **incorrect or non-existent** in the actual API.

## Critical Changes

### Method Name Corrections

The following methods were documented incorrectly and have been fixed:

| ❌ Previous (Incorrect) | ✅ Correct (Official API) | Usage |
|------------------------|--------------------------|-------|
| `addPerpBisector()` | `addLineMedAB()` | Perpendicular bisector (médiatrice) |
| `addCircle()` | `addCircleOA()` | Circle by center point and radius point |
| `addCircleRadius()` | `addCircleOr()` | Circle by center and radius value |
| `addIntersectionLL()` | `addIntLineLine()` | Intersection of two lines |
| `addIntersectionLC()` | `addIntLineCircle()` | Intersection of line and circle |
| `addIntersectionCC()` | `addIntCircleCircle()` | Intersection of two circles |
| `getObjectByTag()` | `getElement()` | Get object by tag identifier |
| `getPointByName()` | `getElement()` | Get object by tag identifier |
| `getFig()` | `getBase64Code()` | Export figure as base64 |
| `updateFigDisplay()` | `reDisplay()` | Refresh figure display |

### Parameter Structure Changes

Some methods use different parameter names:

**Perpendicular Bisector:**
```javascript
// ❌ Old (incorrect)
app.addPerpBisector({
    tag: 'bisector',
    tagPoint1: 'A',
    tagPoint2: 'B'
});

// ✅ New (correct)
app.addLineMedAB({
    a: 'A',          // Note: 'a' and 'b', not 'tagPoint1/tagPoint2'
    b: 'B',
    name: 'd',
    tag: 'bisector'
});
```

**Circles:**
```javascript
// ❌ Old (incorrect)
app.addCircle({
    tag: 'circle_O',
    tagCenter: 'O',
    tagRadius: 'A'
});

// ✅ New (correct)
app.addCircleOA({
    o: 'O',          // Note: 'o' and 'a', not 'tagCenter/tagRadius'
    a: 'A',
    name: 'c',
    tag: 'circle_O'
});
```

**Intersections:**
```javascript
// ❌ Old (incorrect)
app.addIntersectionLC({
    tag: 'I',
    tagLine: 'line_AB',
    tagCircle: 'circle_O',
    which: 1
});

// ✅ New (correct)
// Note: Creates BOTH intersection points automatically
app.addIntLineCircle({
    d: 'line_AB',     // Note: 'd' and 'c', not 'tagLine/tagCircle'
    c: 'circle_O',
    name: 'I1',       // First point
    name2: 'I2',      // Second point
    tag: 'int1',
    tag2: 'int2'
});
```

## New Methods Documented

The update added **60+ methods** that were previously undocumented:

### Arcs (6 methods)
- `addArcOAB()` - Arc from point A to B
- `addArcOAx()` - Arc with angular opening
- `addArcDirectOAB()` - Direct arc
- `addArcIndirectOAB()` - Indirect arc
- `addArcMajorOAB()` - Major arc
- `addArcMajorOAx()` - Major arc with angle

### Advanced Lines (4 methods)
- `addLineBisAOB()` - Angle bisector
- `addLineHor()` - Horizontal line
- `addLineVer()` - Vertical line
- `addLineAx()` - Line with specific angle
- `addBrokenLine()` - Polyline

### Transformations (7 methods)
- `addRotation()` - Rotation transformation
- `addDilation()` - Dilation/Homothety
- `addTranslation()` - Translation by vector
- `addTranslationxy()` - Translation by coordinates
- `addSymAx()` - Axial symmetry
- `addSymCent()` - Central symmetry
- `addSimilitude()` - Similarity transformation

### Transformed Points (6 methods)
- `addImPointRotation()` - Point image by rotation
- `addImPointDilation()` - Point image by dilation
- `addImPointTranslation()` - Point image by translation
- `addImPointTranslationxy()` - Point image by xy translation
- `addImPointSymAx()` - Point image by axial symmetry
- `addImPointSymCent()` - Point image by central symmetry

### Transformed Objects (2 methods)
- `addLineIm()` - Line image by transformation
- `addCircleIm()` - Circle image by transformation

### Points on Objects (2 methods)
- `addLinkedPointLine()` - Point linked to line
- `addLinkedPointCircle()` - Point linked to circle

### Surfaces (3 methods)
- `addSurface()` - Generic surface
- `addSurfacePoly()` - Filled polygon
- `addSurfaceCircle()` - Filled circle

### Measurements (9 methods)
- `addLengthMeasure()` - Length measurement
- `addXMeasure()` - X coordinate measure
- `addYMeasure()` - Y coordinate measure
- `addZMeasure()` - Complex affix measure
- `addAbsMeasure()` - Abscissa measure
- `addCalc()` - Calculation
- `addCalcComp()` - Complex calculation
- `addFunc()` - Function
- `addDerivative()` - Derivative

### Text & Labels (4 methods)
- `addText()` - Static text
- `addLinkedText()` - Text linked to object
- `addLatex()` - LaTeX formula
- `addLinkedLatex()` - LaTeX linked to object

### Interactive Elements (3 methods)
- `addActionButton()` - Action button
- `addTimerButton()` - Timer button
- `addZoomButtons()` - Zoom controls

### Utility Methods (14 methods)
- `getBase64Code()` - Export figure
- `getFigDim()` - Get dimensions
- `getValue()` - Get calculation value
- `getPointPosition()` - Get point coordinates
- `fixPoint()` - Make point immovable
- `deleteElt()` - Delete element
- `deleteObj()` - Delete object
- `deleteAfter()` - Delete after object
- `displayOnTop()` - Display on top layer
- `reDisplay()` - Refresh display
- `recalculate()` - Recalculate all
- `reclassAfter()` - Reclassify order
- `activateTraceMode()` - Activate trace
- `giveFormulaTo()` - Give formula to object

### Event Listeners (2 methods)
- `addEltListener()` - Element event listener
- `addSvgListener()` - SVG document listener

## Impact on Existing Code

### High Impact Changes
Code using these methods **will break** and must be updated:
- `addPerpBisector()` → `addLineMedAB()`
- `addCircle()` / `addCircleRadius()` → `addCircleOA()` / `addCircleOr()`
- `addIntersectionLL()` / `addIntersectionLC()` → `addIntLineLine()` / `addIntLineCircle()`
- `getObjectByTag()` → `getElement()`

### Medium Impact Changes
Code may work but should be updated for consistency:
- `getFig()` → `getBase64Code()`
- `updateFigDisplay()` → `reDisplay()`

### Files to Check
Search the codebase for these patterns:
```bash
# Find old method names
grep -r "addPerpBisector\|addCircleRadius\|addIntersectionLL\|addIntersectionLC\|getObjectByTag" src/
```

## Migration Guide

### Step 1: Update Method Names
Replace all incorrect method names with correct ones.

### Step 2: Update Parameter Names
Change parameter names to match official API (e.g., `tagCenter` → `o`, `tagLine` → `d`).

### Step 3: Handle Return Values
Some methods return different types:
- `addIntLineCircle()` returns **array of 2 points** (not single point with `which` parameter)

### Step 4: Test Thoroughly
All geometric construction code should be tested after migration.

## Updated Documentation Files

1. **MATHGRAPH32_API_GUIDE.md** ✅
   - Corrected all method names
   - Added 60+ new methods
   - Added critical warnings in "Common Pitfalls" section
   - Updated all code examples

2. **GEOMETRY_API_DOCS.md** ⏳ (May need updates)
   - Validation code may use incorrect method names
   - Figure generator may use incorrect methods

## Next Steps

1. ✅ Update MATHGRAPH32_API_GUIDE.md (DONE)
2. ⏳ Search codebase for incorrect method usage
3. ⏳ Update geometry validator if needed
4. ⏳ Update figure generator if needed
5. ⏳ Update any example code
6. ⏳ Test all geometry exercises

## Testing Checklist

After migration, test:
- [ ] Point creation (all types)
- [ ] Line creation (all types including perpendicular bisector)
- [ ] Circle creation (both methods)
- [ ] Intersection calculations (lines, circles)
- [ ] Object retrieval by tag
- [ ] Figure export/import
- [ ] Display refresh
- [ ] Validation system
- [ ] Figure generation

## References

- **Official API Docs:** https://www.mathgraph32.org/documentation/full/MtgApi.html
- **Updated Guide:** `MATHGRAPH32_API_GUIDE.md`
- **Method Count:** 95+ methods total
- **Update Date:** 2025-01-16

---

**Status:** Documentation update complete ✅
**Action Required:** Code migration needed ⚠️
