# MathGraph32 API - Complete Developer Guide

**Version:** 9.7.2
**Last Updated:** 2025-01-16 *(Major Update with Official API)*
**Language:** English (for developers)
**Official API Documentation:** https://www.mathgraph32.org/documentation/full/MtgApi.html

⚠️ **IMPORTANT UPDATE (2025-01-16):** This guide has been updated with the **official MathGraph32 API** method names and signatures. Some commonly used method names in previous versions were incorrect. See [Pitfall 1](#pitfall-1-using-incorrect-method-names--critical) for critical name changes.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [CDN Loading & Initialization](#cdn-loading--initialization)
5. [Player vs Editor Modes](#player-vs-editor-modes)
6. [Object Creation API](#object-creation-api)
7. [Object Properties & Methods](#object-properties--methods)
8. [Coordinate Systems](#coordinate-systems)
9. [Event Handling](#event-handling)
10. [Advanced Techniques](#advanced-techniques)
    - Export/Import Figures
    - Clone and Modify Figures
    - Dynamic Object Colors
    - Programmatic Animations
    - Batch Object Creation
    - **Fullscreen Mode** 🆕
11. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
12. [Complete Code Examples](#complete-code-examples)

---

## Introduction

**MathGraph32** is a free, powerful JavaScript library for creating interactive geometric constructions. Created by Yves Biton, it's widely used in French mathematics education.

### Key Features

- ✅ **100+ geometric objects** (points, lines, circles, polygons, etc.)
- ✅ **Interactive constructions** (drag points, observe relationships)
- ✅ **Programmatic API** for dynamic figure generation
- ✅ **Export/Import** figures as base64 strings
- ✅ **Mobile support** with touch events
- ✅ **No dependencies** - pure JavaScript

### Official Resources

- **Official Website:** https://www.mathgraph32.org/
- **CDN:** `https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js`
- **Development CDN:** `https://dev.mathgraph32.org/js/mtgLoad/mtgLoad.min.js`
- **Documentation (French):** https://www.mathgraph32.org/spip.php?article9

---

## Getting Started

### Basic HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MathGraph32 Example</title>
</head>
<body>
    <!-- Container for the figure -->
    <div id="mathgraph-container" style="width: 800px; height: 600px;"></div>

    <!-- Load MathGraph32 from CDN -->
    <script src="https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js"></script>

    <script>
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('mathgraph-container');

            // Initialize MathGraph32
            window.mtgLoad(
                container,
                { width: 800, height: 600 }, // SVG options
                { loadApi: true },           // Enable JavaScript API
                (error, app) => {
                    if (error) {
                        console.error('MathGraph32 load error:', error);
                        return;
                    }

                    console.log('MathGraph32 loaded successfully!');
                    console.log('App object:', app);

                    // Now you can use the API
                    createSimpleFigure(app);
                }
            );
        });

        function createSimpleFigure(app) {
            // Example: Create a simple point
            app.addPointXY({
                tag: 'A',
                name: 'A',
                x: 100,
                y: 100,
                visible: true,
                labelVisible: true
            });
        }
    </script>
</body>
</html>
```

### Svelte/TypeScript Setup (Used in UbuMaths)

```typescript
// src/lib/services/mathgraph-api.ts
export class MathGraphService {
    private static instance: MathGraphService;
    private loadingPromise: Promise<void> | null = null;

    static getInstance(): MathGraphService {
        if (!MathGraphService.instance) {
            MathGraphService.instance = new MathGraphService();
        }
        return MathGraphService.instance;
    }

    async loadMathGraph(useDevelopmentCDN = false): Promise<void> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('MathGraph32 can only be loaded in browser'));
                return;
            }

            if (window.mtgLoad) {
                resolve();
                return;
            }

            const cdnBase = useDevelopmentCDN
                ? 'https://dev.mathgraph32.org/js/mtgLoad/'
                : 'https://www.mathgraph32.org/js/mtgLoad/';

            const script = document.createElement('script');
            script.src = `${cdnBase}mtgLoad.min.js`;
            script.async = true;

            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load MathGraph32'));

            document.head.appendChild(script);
        });

        return this.loadingPromise;
    }

    async initializePlayer(
        container: HTMLElement,
        options: PlayerOptions
    ): Promise<MathGraphApp> {
        await this.loadMathGraph();

        return new Promise((resolve, reject) => {
            const svgOptions = {
                width: options.width,
                height: options.height,
                svgId: options.svgId || 'mtg-svg'
            };

            const mtgOptions = {
                fig: options.figure,
                level: options.level || 3,
                interactif: options.interactive ?? true,
                repereAff: options.displayAxes ?? false,
                displayMeasures: options.displayMeasures ?? false
            };

            window.mtgLoad!(container, svgOptions, mtgOptions, (error, app) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(app);
                }
            });
        });
    }
}
```

---

## Core Concepts

### 1. The MathGraph App Object

When MathGraph32 initializes, it returns an `app` object. This object is your main interface to the API.

```typescript
interface MathGraphApp {
    // Core APIs
    listApi: MathGraphObjectList;  // Access to all objects in the figure
    svgApi: SVGElement;             // The SVG element (for DOM manipulation)

    // Figure management
    getFig(): Promise<string>;      // Export figure as base64 string
    setFig(options: { fig: string }): Promise<void>;  // Load figure from base64
    updateFigDisplay(): void;       // Redraw the figure

    // Object creation (100+ methods)
    addPoint(...): MathGraphPoint | Promise<void>;
    addLine(...): MathGraphLine | Promise<void>;
    addCircle(...): MathGraphCircle | Promise<void>;
    // ... many more
}
```

### 2. The Object List API

Every object created in MathGraph32 is stored in the `listApi`.

```typescript
interface MathGraphObjectList {
    longueur(): number;              // Number of objects in the list
    get(index: number): any;         // Get object by index (0-based)
}
```

### 3. Tags vs Names

**Important distinction:**
- **Tag:** Internal unique identifier (used in API calls)
- **Name:** Display label shown on the figure

```javascript
app.addPointXY({
    tag: 'point_A',      // Used in code: app.getObjectByTag('point_A')
    name: 'A',           // Displayed on figure as "A"
    x: 100,
    y: 100
});
```

**Best Practice:** Use descriptive tags in English (e.g., `'center_circle'`) and short names for display (e.g., `'O'`).

### 4. Object Types

MathGraph32 has many object types. Here are the most common:

| Type | Description | Example |
|------|-------------|---------|
| `point` | Free point, point on object, midpoint, etc. | Point A at (100, 100) |
| `line` | Line, ray, segment, parallel, perpendicular | Line AB |
| `circle` | Circle by center and radius point | Circle with center O and radius A |
| `polygon` | Triangle, rectangle, regular polygon | Triangle ABC |
| `angle` | Angle mark with arc | Angle ABC |
| `measure` | Length, angle measure, calculation | Length of AB |
| `text` | Label or comment | "This is a triangle" |
| `vector` | Directed segment | Vector from A to B |
| `transformation` | Translation, rotation, reflection, etc. | Rotation of 90° |

---

## CDN Loading & Initialization

### Problem: Asynchronous Loading

**Challenge:** MathGraph32 must be loaded from CDN before you can use it.

**Solution:** Use a singleton pattern with promise-based loading.

```typescript
// Singleton service
export class MathGraphService {
    private static instance: MathGraphService;
    private loadingPromise: Promise<void> | null = null;

    static getInstance(): MathGraphService {
        if (!MathGraphService.instance) {
            MathGraphService.instance = new MathGraphService();
        }
        return MathGraphService.instance;
    }

    async loadMathGraph(): Promise<void> {
        // Return existing promise if already loading
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // Check if already loaded
        if (typeof window !== 'undefined' && window.mtgLoad) {
            return Promise.resolve();
        }

        // Create new loading promise
        this.loadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load MathGraph32'));
            document.head.appendChild(script);
        });

        return this.loadingPromise;
    }
}

// Usage
const service = MathGraphService.getInstance();
await service.loadMathGraph();  // Safe to call multiple times
```

### Initialization Callback Pattern

MathGraph32 uses an **error-first callback** pattern:

```javascript
window.mtgLoad(container, svgOptions, mtgOptions, (error, app) => {
    if (error) {
        console.error('Initialization failed:', error);
        return;
    }

    // Success! Use app object
    console.log('MathGraph32 ready:', app);
});
```

**Convert to Promise** for cleaner async/await:

```typescript
function initializePlayer(container: HTMLElement): Promise<MathGraphApp> {
    return new Promise((resolve, reject) => {
        window.mtgLoad(container, svgOptions, mtgOptions, (error, app) => {
            if (error) {
                reject(error);
            } else {
                resolve(app);
            }
        });
    });
}

// Usage with async/await
try {
    const app = await initializePlayer(container);
    // Use app
} catch (error) {
    console.error('Failed to initialize:', error);
}
```

---

## Player vs Editor Modes

MathGraph32 can run in two modes:

### Player Mode (Read-Only)

**Use case:** Display pre-made figures, allow dragging but no creation/deletion.

```javascript
const mtgOptions = {
    fig: base64FigureString,     // Pre-made figure
    level: 3,                    // Display level (0-4)
    interactif: true,            // Allow dragging
    repereAff: false,            // Hide axes
    displayMeasures: false,      // Hide measurements
    loadApi: false               // No API access needed (lighter)
};
```

**Characteristics:**
- ✅ Faster loading (no API overhead)
- ✅ Smaller memory footprint
- ✅ Perfect for exploration exercises
- ❌ Cannot create new objects
- ❌ Cannot access object properties

### Editor Mode (Full API)

**Use case:** Programmatic figure creation, construction exercises.

```javascript
const mtgOptions = {
    fig: '',                     // Start with empty figure (or base template)
    level: 3,
    interactif: true,
    repereAff: true,            // Show axes for construction
    displayMeasures: true,      // Show measurements
    loadApi: true               // ⭐ Enable full JavaScript API
};
```

**Characteristics:**
- ✅ Full programmatic control
- ✅ Create/modify/delete objects
- ✅ Access object properties
- ✅ Export/import figures
- ⚠️ Slightly slower loading
- ⚠️ More memory usage

**Important:** Set `loadApi: true` to access the JavaScript API!

---

## Object Creation API

### Points

#### 1. Free Point (by coordinates)

```javascript
app.addPointXY({
    tag: 'A',              // Unique identifier
    name: 'A',             // Display name
    x: 100,                // X coordinate (pixels)
    y: 150,                // Y coordinate (pixels)
    visible: true,         // Show the point
    labelVisible: true,    // Show the label "A"
    color: 'red',          // Optional: color (default: black)
    pointSize: 2           // Optional: size (1-5, default: 2)
});
```

#### 2. Point on Line

```javascript
app.addPointOnLine({
    tag: 'M',
    name: 'M',
    tagLine: 'line_AB',    // Tag of the line
    abscissa: 0.5,         // Position on line (0-1 for segments)
    visible: true,
    labelVisible: true
});
```

#### 3. Midpoint

```javascript
app.addMidpoint({
    tag: 'M',
    name: 'M',
    tagPoint1: 'A',        // First point
    tagPoint2: 'B',        // Second point
    visible: true,
    labelVisible: true
});
```

#### 4. Intersection of Two Lines

```javascript
// OFFICIAL API METHOD: addIntLineLine (not addIntersectionLL)
app.addIntLineLine({
    d: 'line1',           // First line (tag or object)
    dd: 'line2',          // Second line (tag or object)
    name: 'I',            // Optional: name for display
    color: 'black',
    pointStyle: 1,
    tag: 'intersection_I' // Optional: tag for identification
});

// Alternative syntaxes:
// app.addIntLineLine('line1', 'line2')
// app.addIntLineLine('line1', 'line2', 'I')
// app.addIntLineLine('line1', 'line2', 'I', 'black')
```

#### 5. Intersection of Line and Circle

```javascript
// OFFICIAL API METHOD: addIntLineCircle (not addIntersectionLC)
// Returns array of TWO points [point1, point2]
app.addIntLineCircle({
    d: 'line_AB',         // Line (tag or object)
    c: 'circle_O',        // Circle (tag or object)
    name: 'I1',           // Name for first intersection point
    name2: 'I2',          // Name for second intersection point
    color: 'red',
    pointStyle: 1,
    tag: 'int1',          // Optional: tag for first point
    tag2: 'int2'          // Optional: tag for second point
});

// Alternative syntaxes:
// app.addIntLineCircle('line_AB', 'circle_O')
// app.addIntLineCircle('line_AB', 'circle_O', 'I1')
// app.addIntLineCircle('line_AB', 'circle_O', 'I1', 'I2')
// app.addIntLineCircle('line_AB', 'circle_O', 'I1', 'I2', 'red')

// Note: Creates BOTH intersection points automatically
```

### Lines

#### 1. Line through Two Points

```javascript
app.addLineAB({
    tag: 'line_AB',
    tagPoint1: 'A',
    tagPoint2: 'B',
    visible: true,
    color: 'blue',
    lineStyle: 'solid'     // 'solid', 'dashed', 'dotted'
});
```

#### 2. Segment

```javascript
app.addSegment({
    tag: 'seg_AB',
    tagPoint1: 'A',
    tagPoint2: 'B',
    visible: true,
    color: 'green'
});
```

#### 3. Ray

```javascript
app.addRay({
    tag: 'ray_AB',
    tagOrigin: 'A',        // Starting point
    tagPoint: 'B',         // Point on the ray
    visible: true
});
```

#### 4. Parallel Line

```javascript
app.addLinePar({
    tag: 'parallel',
    tagLine: 'line_AB',    // Line to be parallel to
    tagPoint: 'C',         // Point through which parallel passes
    visible: true,
    color: 'purple'
});
```

#### 5. Perpendicular Line

```javascript
// OFFICIAL API METHOD: addLinePerp
app.addLinePerp({
    tag: 'perpendicular',
    a: 'C',                // Point through which perpendicular passes
    d: 'line_AB',          // Line to be perpendicular to
    visible: true,
    color: 'orange'
});

// Alternative syntaxes:
// app.addLinePerp({ a: 'C', d: 'line_AB' })
// app.addLinePerp('C', 'line_AB')
// app.addLinePerp('C', 'line_AB', 'perp', 'orange')
```

#### 6. Perpendicular Bisector (Médiatrice)

```javascript
// OFFICIAL API METHOD: addLineMedAB (not addPerpBisector)
app.addLineMedAB({
    a: 'A',              // First point (or use tag: 'A')
    b: 'B',              // Second point (or use tag: 'B')
    name: 'd',           // Optional: name for display
    color: 'cyan',
    lineStyle: 'solid',
    thickness: 1,
    tag: 'bisector'      // Optional: tag for identification
});

// Alternative syntaxes also supported:
// app.addLineMedAB('A', 'B')
// app.addLineMedAB('A', 'B', 'd')
// app.addLineMedAB('A', 'B', 'd', 'cyan')
```

### Circles

#### 1. Circle by Center and Radius Point

```javascript
// OFFICIAL API METHOD: addCircleOA (not addCircle)
app.addCircleOA({
    o: 'O',              // Center point (tag or object)
    a: 'A',              // Point on circle that defines radius
    name: 'c',           // Optional: name for display
    color: 'red',
    lineStyle: 'solid',
    thickness: 1,
    opacity: 1,
    hidden: false,
    tag: 'circle_O'      // Optional: tag for identification
});

// Alternative syntaxes:
// app.addCircleOA('O', 'A')
// app.addCircleOA('O', 'A', 'c')
// app.addCircleOA('O', 'A', 'c', 'red')
```

#### 2. Circle by Center and Radius Value

```javascript
// OFFICIAL API METHOD: addCircleOr (not addCircleRadius)
app.addCircleOr({
    o: 'O',              // Center point (tag or object)
    r: 50,               // Radius value (number or calculation object)
    name: 'c',           // Optional: name for display
    color: 'blue',
    lineStyle: 'solid',
    thickness: 1,
    tag: 'circle_fixed'  // Optional: tag for identification
});

// Alternative syntaxes:
// app.addCircleOr('O', 50)
// app.addCircleOr('O', 50, 'c')
// app.addCircleOr('O', 50, 'c', 'blue')
```

#### 3. Circle through Three Points

```javascript
app.addCircle3Points({
    tag: 'circumcircle',
    tagPoint1: 'A',
    tagPoint2: 'B',
    tagPoint3: 'C',
    visible: true,
    color: 'blue'
});
```

### Polygons

#### 1. Triangle

```javascript
app.addPolygon({
    tag: 'triangle_ABC',
    tagPoints: ['A', 'B', 'C'],
    visible: true,
    color: 'green',
    fillColor: 'rgba(0, 255, 0, 0.2)',
    filled: true
});
```

#### 2. Regular Polygon

```javascript
app.addRegularPolygon({
    tag: 'hexagon',
    tagCenter: 'O',
    tagFirstVertex: 'A',
    sides: 6,              // Number of sides
    visible: true,
    color: 'purple'
});
```

### Angle Marks

#### 1. Angle Mark

```javascript
// OFFICIAL API METHOD: addAngleMark
app.addAngleMark({
    tag: 'angle_ABC',
    a: 'A',                // First ray point
    o: 'B',                // Vertex
    b: 'C',                // Second ray point
    visible: true,
    color: 'red',
    r: 20,                 // Arc radius in pixels
    markType: 'arc'        // 'arc', 'rightAngle', 'double', 'triple'
});

// Alternative syntaxes:
// app.addAngleMark({ o: 'B', a: 'A', b: 'C', r: 20 })
// app.addAngleMark('B', 'A', 'C', 20)
```

#### 2. Right Angle Mark

```javascript
app.addAngleMark({
    tag: 'right_angle',
    a: 'A',                // First ray point
    o: 'B',                // Vertex
    b: 'C',                // Second ray point
    visible: true,
    markType: 'rightAngle',
    r: 15                  // Arc radius in pixels
});
```

### Measurements

#### 1. Distance Calculation

```javascript
app.addCalculation({
    tag: 'dist_AB',
    name: 'd',
    formula: 'distance(A, B)',  // Built-in distance function
    visible: true,
    x: 200,                     // Label position
    y: 50,
    decimals: 2                 // Number of decimal places
});
```

#### 2. Angle Measurement

```javascript
app.addCalculation({
    tag: 'angle_measure',
    name: 'α',
    formula: 'angle(A, B, C)',  // Returns angle in degrees
    visible: true,
    x: 150,
    y: 100,
    decimals: 1
});
```

### Additional Official API Methods

The official MathGraph32 API includes **95+ methods**. Below are additional methods not covered above:

#### Arcs

```javascript
// Arc from point A to B, center O
app.addArcOAB({
    o: 'O',              // Center
    a: 'A',              // Start point
    b: 'B',              // End point
    name: 'arc1',
    color: 'blue',
    lineStyle: 'solid',
    thickness: 1
});

// Arc with angular opening x
app.addArcOAx({
    o: 'O',              // Center
    a: 'A',              // Start point
    x: Math.PI/2,        // Angular opening (radians)
    name: 'arc2'
});

// Direct/Indirect arcs
app.addArcDirectOAB(options);    // Direct arc (shorter)
app.addArcIndirectOAB(options);  // Indirect arc (longer)
app.addArcMajorOAB(options);     // Major arc (>180°)
```

#### Advanced Lines

```javascript
// Angle bisector (bissectrice)
app.addLineBisAOB({
    a: 'A',              // First point
    o: 'O',              // Vertex
    b: 'B',              // Second point
    name: 'bis',
    color: 'purple'
});

// Horizontal/Vertical lines
app.addLineHor({ y: 100, name: 'h1' });
app.addLineVer({ x: 200, name: 'v1' });

// Line with specific angle
app.addLineAx({
    a: 'A',              // Point on line
    x: Math.PI/4,        // Angle (radians)
    name: 'd'
});

// Broken line (polyline)
app.addBrokenLine({
    points: ['A', 'B', 'C', 'D'],  // Array of point tags
    color: 'green',
    lineStyle: 'solid'
});
```

#### Transformations

```javascript
// Create transformation objects
const rotation = app.addRotation({
    o: 'O',              // Center of rotation
    x: Math.PI/2         // Angle (radians)
});

const dilation = app.addDilation({
    o: 'O',              // Center of dilation
    x: 2                 // Ratio
});

const translation = app.addTranslation({
    u: 'vec_AB'          // Translation vector
});

// Or translation by coordinates
const translationXY = app.addTranslationxy({
    x: 50,
    y: 30
});

// Symmetries
const symAx = app.addSymAx({ d: 'line_d' });     // Axial symmetry
const symCent = app.addSymCent({ o: 'O' });      // Central symmetry

// Similarity transformation
const similitude = app.addSimilitude({
    o: 'O',              // Center
    x: 1.5,              // Ratio
    y: Math.PI/6         // Angle
});
```

#### Transformed Objects

```javascript
// Image of point by transformations
app.addImPointRotation({
    m: 'A',              // Original point
    transf: rotation,    // Transformation object
    name: 'A\'',
    color: 'red'
});

app.addImPointDilation({ m: 'A', transf: dilation, name: 'A\'' });
app.addImPointTranslation({ m: 'A', transf: translation, name: 'A\'' });
app.addImPointTranslationxy({ m: 'A', x: 50, y: 30, name: 'A\'' });
app.addImPointSymAx({ m: 'A', d: 'line_d', name: 'A\'' });
app.addImPointSymCent({ m: 'A', o: 'O', name: 'A\'' });

// Image of entire objects
app.addLineIm({ d: 'line', transf: rotation });
app.addCircleIm({ c: 'circle', transf: dilation });
```

#### Intersection of Circles

```javascript
// Intersection of two circles (creates 2 points)
app.addIntCircleCircle({
    c: 'circle1',        // First circle
    cc: 'circle2',       // Second circle
    name: 'I1',          // First intersection point
    name2: 'I2',         // Second intersection point
    color: 'orange'
});
```

#### Points on Objects

```javascript
// Point linked to a line
app.addLinkedPointLine({
    d: 'line_AB',        // Line
    x: 0.5,              // Parameter (0-1 for segment)
    name: 'M',
    color: 'blue'
});

// Point linked to a circle
app.addLinkedPointCircle({
    c: 'circle_O',       // Circle
    x: Math.PI/4,        // Angle parameter (radians)
    name: 'M',
    color: 'blue'
});
```

#### Surfaces (Filled Shapes)

```javascript
// Filled polygon
app.addSurfacePoly({
    points: ['A', 'B', 'C'],
    color: 'rgba(255, 0, 0, 0.3)',
    opacity: 0.3
});

// Filled circle
app.addSurfaceCircle({
    c: 'circle_O',
    color: 'rgba(0, 0, 255, 0.2)',
    opacity: 0.2
});
```

#### Advanced Calculations

```javascript
// Length measurement
app.addLengthMeasure({
    a: 'A',
    b: 'B',
    nameCalc: 'length_AB'
});

// Coordinate measurements
app.addXMeasure({ m: 'A', nameCalc: 'x_A' });
app.addYMeasure({ m: 'A', nameCalc: 'y_A' });
app.addAbsMeasure({ b: 'B', o: 'O', a: 'A', nameCalc: 'abs' });

// Complex calculations
app.addCalc({
    formula: 'sqrt(x_A^2 + y_A^2)',
    nameCalc: 'distance'
});

// Function
app.addFunc({
    formula: 'x^2 + 2*x + 1',
    nameCalc: 'f'
});

// Derivative
app.addDerivative({
    func: 'f',
    nameCalc: 'f_prime'
});
```

#### Text & Labels

```javascript
// Static text
app.addText({
    text: 'This is a triangle',
    x: 100,
    y: 50,
    color: 'black',
    fontSize: 14
});

// Text linked to object
app.addLinkedText({
    elt: 'point_A',
    text: 'Point A',
    offsetX: 10,
    offsetY: -10
});

// LaTeX formula
app.addLatex({
    latex: '\\frac{a}{b} = \\frac{c}{d}',
    x: 200,
    y: 100
});

// Linked LaTeX
app.addLinkedLatex({
    elt: 'calc_result',
    latex: 'Result = {val}',
    offsetX: 0,
    offsetY: 20
});
```

#### Interactive Elements

```javascript
// Action button
app.addActionButton({
    x: 10,
    y: 10,
    width: 80,
    height: 30,
    label: 'Reset',
    action: 'resetFigure()'  // JavaScript action
});

// Timer button
app.addTimerButton({
    x: 100,
    y: 10,
    width: 60,
    height: 30
});

// Zoom buttons
app.addZoomButtons({
    x: 10,
    y: 50
});
```

#### Utility Methods

```javascript
// Export figure to base64
const figureData = app.getBase64Code();

// Get figure dimensions
const dimensions = app.getFigDim();  // Returns {width, height}

// Get value of calculation
const value = app.getValue('calc_name');

// Get point position
const pos = app.getPointPosition({ m: 'A' });  // Returns {x, y}

// Fix point (make immovable)
app.fixPoint({ m: 'A', fixed: true });

// Delete object
app.deleteElt(objectReference);
app.deleteObj({ tag: 'object_tag' });

// Display object on top layer
app.displayOnTop({ elt: 'circle_O' });

// Refresh display
app.reDisplay();

// Recalculate all calculations
app.recalculate();

// Activate trace mode
app.activateTraceMode(true);  // or false to deactivate
```

#### Event Listeners

```javascript
// Listen to element events
app.addEltListener({
    elt: 'point_A',
    eventType: 'mousedown',  // or 'mouseup', 'mousemove', etc.
    action: 'handlePointClick()'
});

// Listen to SVG document events
app.addSvgListener({
    eventType: 'mousedown',
    action: 'handleBackgroundClick()'
});
```

**Complete Method List:** See https://www.mathgraph32.org/documentation/full/MtgApi.html for full documentation of all 95+ methods.

---

## Object Properties & Methods

### Accessing Objects

```javascript
// OFFICIAL API METHOD: getElement (not getObjectByTag)
const point = app.getElement('A');  // Get by tag

// Alternative syntax (string parameter):
// const point = app.getElement(elementTag);

// By index in list (if listApi is available)
const firstObject = app.listApi.get(0);

// Get total number of objects
const count = app.listApi.longueur();

// Note: getObjectByTag and getPointByName may not exist in official API
// Use getElement(tag) instead
```

### Point Properties

```javascript
const point = app.getObjectByTag('A');

// Properties
console.log(point.x);         // X coordinate (pixels)
console.log(point.y);         // Y coordinate (pixels)
console.log(point.nom);       // Name ('A')
console.log(point.existe);    // true if point exists, false if deleted
console.log(point.visible);   // true if visible
console.log(point.marque);    // Point mark style
console.log(point.couleur);   // Color

// Methods
point.setCoordinates(newX, newY);  // Move point
point.setVisible(true/false);      // Show/hide
```

### Line Properties

```javascript
const line = app.getObjectByTag('line_AB');

// Properties
console.log(line.point1);     // First point object
console.log(line.point2);     // Second point object
console.log(line.visible);    // Visibility
console.log(line.couleur);    // Color
console.log(line.style);      // Line style ('solid', 'dashed', 'dotted')
```

### Circle Properties

```javascript
const circle = app.getObjectByTag('circle_O');

// Properties
console.log(circle.centre);   // Center point object
console.log(circle.rayon);    // Radius (number or point object)
console.log(circle.visible);  // Visibility
console.log(circle.couleur);  // Color
```

---

## Coordinate Systems

### Understanding MathGraph32 Coordinates

MathGraph32 uses **its own coordinate system** which typically ranges from approximately **-10 to +10** for both X and Y axes (centered at origin):

- **Origin:** Center of the canvas (0, 0)
- **X-axis:** Increases to the right (-10 to +10)
- **Y-axis:** Increases **upward** (standard mathematical convention)
- **Typical Range:** -10 to +10 for both axes
- **Important:** The actual viewport size depends on the canvas dimensions and zoom level

```
     Y
     ▲
     │
-10  │  10
─────┼─────> X
     │
     │
     ▼
```

**Best Practice for Visible Coordinates:**
When creating geometric objects, use coordinates in the **2 to 8 range** to ensure they are centered and visible:

```javascript
// ✅ GOOD - Coordinates centered and visible
app.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2, visible: true });
app.addPointXY({ tag: 'B', name: 'B', x: 8, y: 2, visible: true });
app.addPointXY({ tag: 'C', name: 'C', x: 5, y: 7, visible: true });

// ❌ BAD - Coordinates may be outside visible viewport
app.addPointXY({ tag: 'A', name: 'A', x: 100, y: 100, visible: true });
app.addPointXY({ tag: 'B', name: 'B', x: 500, y: 100, visible: true });
```

**Note:** If coordinates are too far from the center (e.g., 100-500 range), objects may appear outside the visible viewport even though they are created successfully.

### Global Namespace for Object Names

⚠️ **Important:** MathGraph32 maintains a **global namespace** for all object names across all instances.

**Problem:** If you have multiple MathGraph32 instances on the same page, point names must be unique across ALL instances:

```javascript
// Instance 1: Triangle example
app1.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2 });

// Instance 2: Circle example
app2.addPointXY({ tag: 'O', name: 'O', x: 5, y: 5 });  // ✅ OK - different name
app2.addPointXY({ tag: 'A2', name: 'A', x: 6, y: 6 }); // ❌ ERROR - "the name A is already used"
```

**Solution:** Use unique names for each example/instance:

```javascript
// Triangle example
app1.addPointXY({ tag: 'triangleA', name: 'A', x: 2, y: 2 });
app1.addPointXY({ tag: 'triangleB', name: 'B', x: 8, y: 2 });
app1.addPointXY({ tag: 'triangleC', name: 'C', x: 5, y: 7 });

// Circle example
app2.addPointXY({ tag: 'circleO', name: 'O₁', x: 5, y: 5 });  // Use O₁ instead of O
app2.addPointXY({ tag: 'circleP', name: 'P', x: 7, y: 5 });

// Bisector example
app3.addPointXY({ tag: 'bisectorD', name: 'D', x: 2, y: 5 });
app3.addPointXY({ tag: 'bisectorE', name: 'E', x: 8, y: 5 });
app3.addPointXY({ tag: 'bisectorM', name: 'M₁', x: 5, y: 5 });  // Use M₁ instead of M
```

**Best Practice:** When creating multiple geometry examples on the same page:
- Use **distinct display names** (A, B, C for triangle; O₁, P for circle; D, E, M₁ for bisector)
- Use **prefixed tags** (`triangleA`, `circleO`, `bisectorD`) for programmatic access

### Axes and Grid

Enable axes to show a mathematical coordinate system:

```javascript
const mtgOptions = {
    repereAff: true,       // Show axes
    // ... other options
};
```

When axes are enabled:
- Origin is at a defined point (usually center of canvas)
- Units can be configured
- Grid lines show unit divisions

---

## Event Handling

### Detecting User Interactions

MathGraph32 doesn't have built-in event callbacks, but you can use standard DOM events:

```javascript
const app = await initializePlayer(container);

// Listen for mouse events on the SVG
app.svgApi.addEventListener('mousedown', (e) => {
    console.log('Mouse down at:', e.clientX, e.clientY);
});

app.svgApi.addEventListener('mouseup', (e) => {
    console.log('Mouse up');
});

app.svgApi.addEventListener('mousemove', (e) => {
    console.log('Mouse move');
});

// Touch events for mobile
app.svgApi.addEventListener('touchstart', (e) => {
    console.log('Touch start');
});

app.svgApi.addEventListener('touchend', (e) => {
    console.log('Touch end');
});
```

### Change Detection

To detect when a figure changes (e.g., user drags a point):

```typescript
let lastObjectCount = app.listApi.longueur();

const changeDetectionInterval = setInterval(() => {
    const currentObjectCount = app.listApi.longueur();

    if (currentObjectCount !== lastObjectCount) {
        console.log('Figure changed! Objects:', currentObjectCount);
        lastObjectCount = currentObjectCount;
        onFigureChange();  // Your callback
    }
}, 500);  // Check every 500ms

// Clean up
// clearInterval(changeDetectionInterval);
```

**Better approach for position changes:**

Track specific object positions:

```typescript
let lastPositions = new Map();

function trackPointPositions() {
    const count = app.listApi.longueur();

    for (let i = 0; i < count; i++) {
        const obj = app.listApi.get(i);

        if (obj.type === 'point') {
            const key = obj.tag || `point_${i}`;
            const currentPos = { x: obj.x, y: obj.y };
            const lastPos = lastPositions.get(key);

            if (!lastPos || lastPos.x !== currentPos.x || lastPos.y !== currentPos.y) {
                console.log(`Point ${key} moved to:`, currentPos);
                lastPositions.set(key, currentPos);
                onPointMoved(obj);  // Your callback
            }
        }
    }
}

// Poll for changes
setInterval(trackPointPositions, 200);  // Every 200ms
```

---

## Advanced Techniques

### 1. Export/Import Figures

```javascript
// Export figure to base64 string
const figureBase64 = await app.getFig();
console.log('Figure:', figureBase64);

// Save to localStorage
localStorage.setItem('myFigure', figureBase64);

// Load figure from base64
const savedFigure = localStorage.getItem('myFigure');
await app.setFig({ fig: savedFigure });

// Refresh display
app.updateFigDisplay();
```

### 2. Clone and Modify Figures

```javascript
// Get current figure
const originalFigure = await app.getFig();

// Modify figure programmatically
// (Create new app instance with the figure, then add objects)

const newContainer = document.getElementById('modified-figure');
const newApp = await initializeEditor(newContainer, {
    figure: originalFigure,
    width: 800,
    height: 600
});

// Add new objects to the cloned figure
newApp.addPointXY({
    tag: 'newPoint',
    name: 'P',
    x: 200,
    y: 200,
    visible: true
});

// Export modified figure
const modifiedFigure = await newApp.getFig();
```

### 3. Dynamic Object Colors

```javascript
// Change color based on condition
function updatePointColor(app, pointTag, condition) {
    const point = app.getObjectByTag(pointTag);

    if (point) {
        point.couleur = condition ? 'green' : 'red';
        app.updateFigDisplay();  // Redraw to show color change
    }
}

// Usage
const isCorrect = validateConstruction(app);
updatePointColor(app, 'studentPoint', isCorrect);
```

### 4. Programmatic Animations

```javascript
function animatePointAlongLine(app, pointTag, startX, endX, duration) {
    const point = app.getObjectByTag(pointTag);
    if (!point) return;

    const startTime = Date.now();
    const deltaX = endX - startX;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentX = startX + deltaX * progress;
        point.setCoordinates(currentX, point.y);
        app.updateFigDisplay();

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// Usage: Move point from x=100 to x=300 over 2 seconds
animatePointAlongLine(app, 'P', 100, 300, 2000);
```

### 5. Batch Object Creation

```javascript
function createRegularPolygon(app, centerX, centerY, radius, sides) {
    const angleStep = (2 * Math.PI) / sides;
    const pointTags = [];

    // Create vertices
    for (let i = 0; i < sides; i++) {
        const angle = i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const tag = `vertex_${i}`;
        app.addPointXY({
            tag,
            name: String.fromCharCode(65 + i),  // A, B, C, ...
            x,
            y,
            visible: true,
            labelVisible: true
        });

        pointTags.push(tag);
    }

    // Create polygon
    app.addPolygon({
        tag: 'polygon',
        tagPoints: pointTags,
        visible: true,
        color: 'blue',
        fillColor: 'rgba(0, 0, 255, 0.2)',
        filled: true
    });

    // Create sides
    for (let i = 0; i < sides; i++) {
        const nextIndex = (i + 1) % sides;
        app.addSegment({
            tag: `side_${i}`,
            tagPoint1: pointTags[i],
            tagPoint2: pointTags[nextIndex],
            visible: true,
            color: 'blue'
        });
    }
}

// Usage: Create hexagon
createRegularPolygon(app, 400, 300, 100, 6);
```

### 6. Fullscreen Mode

MathGraph32 figures can be displayed in fullscreen mode using the **Browser Fullscreen API** combined with our `MathGraphService` wrapper or the `MathGraphFullscreen` component.

#### Method 1: Using MathGraphService (Programmatic)

```typescript
import { MathGraphService } from '$lib/services/mathgraph-api';

const service = MathGraphService.getInstance();
const container = document.getElementById('mathgraph-container');

// Enter fullscreen
await service.requestFullscreen(container, (width, height) => {
  console.log(`Canvas resized to: ${width}x${height}`);
});

// Exit fullscreen
await service.exitFullscreen();

// Toggle fullscreen
await service.toggleFullscreen(container);

// Check if fullscreen
const isFullscreen = service.isFullscreen(container);
```

#### Method 2: Using MathGraphFullscreen Component (Svelte)

```svelte
<script lang="ts">
  import MathGraphFullscreen from '$lib/components/MathGraphFullscreen.svelte';
  import { MathGraphService } from '$lib/services/mathgraph-api';

  let canvasContainer: HTMLElement;
  let app;

  async function createFigure() {
    const service = MathGraphService.getInstance();
    app = await service.initializeEditor(canvasContainer, {
      width: 800,
      height: 600,
      level: 1
    });

    // Create your figure using English API
    app.addPointXY({
      tag: 'pointA', name: 'A',
      x: 100, y: 100,
      visible: true, labelVisible: true
    });

    app.addPointXY({
      tag: 'pointB', name: 'B',
      x: 500, y: 100,
      visible: true, labelVisible: true
    });

    app.addSegment({
      tag: 'segAB',
      tagPoint1: 'pointA',
      tagPoint2: 'pointB',
      visible: true,
      color: 'blue'
    });

    app.updateFigDisplay();
  }
</script>

<MathGraphFullscreen
  bind:container={canvasContainer}
  onFullscreenChange={(isFullscreen) => {
    console.log('Fullscreen:', isFullscreen);
  }}
>
  <Button onclick={createFigure}>Create Figure</Button>
</MathGraphFullscreen>
```

**Features:**
- ✅ **Fullscreen toggle button** with icon (Maximize/Minimize)
- ✅ **Keyboard shortcuts** - Press `F` or `F11` to toggle fullscreen
- ✅ **Escape to exit** - Press `Escape` to exit fullscreen mode
- ✅ **Automatic canvas resizing** - Figure adapts to full screen resolution
- ✅ **Maintains state** - Figure remains intact during fullscreen transitions

**Props:**
- `container` (bindable) - HTMLElement reference for the canvas
- `showButton` (optional) - Show/hide fullscreen button (default: `true`)
- `buttonPosition` (optional) - Position: `'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'` (default: `'bottom-right'`)
- `onFullscreenChange` (optional) - Callback when fullscreen state changes

**Keyboard Shortcuts:**
- `F` or `F11` - Toggle fullscreen
- `Escape` - Exit fullscreen

**Example: Dynamic Resize on Fullscreen**

```typescript
const service = MathGraphService.getInstance();

// Request fullscreen with resize callback
await service.requestFullscreen(container, (width, height) => {
  // Reinitialize canvas with new dimensions
  console.log(`Fullscreen dimensions: ${width}x${height}`);

  // Optionally recreate figure at new size
  // Note: MathGraph32 handles scaling automatically in most cases
});

// Listen for fullscreen changes manually
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    console.log('Entered fullscreen');
  } else {
    console.log('Exited fullscreen');
  }
});
```

**Browser Compatibility:**
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ Requires HTTPS or localhost for security

---

## Common Pitfalls & Solutions

### Pitfall 1: Using Incorrect Method Names ⚠️ **CRITICAL**

**Problem:**
Using non-existent method names based on assumptions instead of official API.

```javascript
// ❌ WRONG - These methods DO NOT exist in official API
app.addPerpBisector({ ... });          // Does not exist!
app.addCircle({ ... });                 // Does not exist!
app.addCircleRadius({ ... });           // Does not exist!
app.addIntersectionLL({ ... });         // Does not exist!
app.addIntersectionLC({ ... });         // Does not exist!
app.getObjectByTag('A');                // May not exist!
```

**Solution:**
Use the correct official API method names:

```javascript
// ✅ CORRECT - Official API methods
app.addLineMedAB({ a: 'A', b: 'B' });          // Perpendicular bisector
app.addCircleOA({ o: 'O', a: 'A' });           // Circle by center and point
app.addCircleOr({ o: 'O', r: 50 });            // Circle by center and radius
app.addIntLineLine({ d: 'line1', dd: 'line2' }); // Line-line intersection
app.addIntLineCircle({ d: 'line', c: 'circle' }); // Line-circle intersection
app.getElement('A');                            // Get object by tag
```

**Key Name Changes:**
| ❌ Wrong (Non-existent) | ✅ Correct (Official API) |
|------------------------|--------------------------|
| `addPerpBisector` | `addLineMedAB` |
| `addCircle` | `addCircleOA` |
| `addCircleRadius` | `addCircleOr` |
| `addIntersectionLL` | `addIntLineLine` |
| `addIntersectionLC` | `addIntLineCircle` |
| `addIntersectionCC` | `addIntCircleCircle` |
| `getObjectByTag` | `getElement` |
| `getPointByName` | `getElement` |
| `getFig` | `getBase64Code` |

**Reference:** Always check https://www.mathgraph32.org/documentation/full/MtgApi.html for official method names.

### Pitfall 2: Accessing API Before loadApi: true

**Problem:**
```javascript
const mtgOptions = {
    loadApi: false  // ❌ API disabled
};

window.mtgLoad(container, svgOptions, mtgOptions, (error, app) => {
    app.addPointXY(...);  // ❌ Error: addPointXY is not a function
});
```

**Solution:**
```javascript
const mtgOptions = {
    loadApi: true  // ✅ Enable API
};
```

### Pitfall 2: Using Names Instead of Tags

**Problem:**
```javascript
app.addPointXY({ tag: 'point1', name: 'A', x: 100, y: 100 });
app.addPointXY({ tag: 'point2', name: 'A', x: 200, y: 200 });

const point = app.getPointByName('A');  // ❌ Which A? Ambiguous!
```

**Solution:**
```javascript
// Use unique tags
const point1 = app.getObjectByTag('point1');  // ✅ Unambiguous
const point2 = app.getObjectByTag('point2');  // ✅ Clear
```

### Pitfall 3: Not Awaiting Async Methods

**Problem:**
```javascript
app.setFig({ fig: newFigure });
app.addPointXY(...);  // ❌ May execute before setFig completes!
```

**Solution:**
```javascript
await app.setFig({ fig: newFigure });
app.addPointXY(...);  // ✅ Waits for setFig to finish
```

### Pitfall 4: Forgetting to Refresh After Changes

**Problem:**
```javascript
const point = app.getObjectByTag('A');
point.couleur = 'red';  // Change color
// ❌ Screen doesn't update!
```

**Solution:**
```javascript
const point = app.getObjectByTag('A');
point.couleur = 'red';
app.updateFigDisplay();  // ✅ Redraw to show changes
```

### Pitfall 5: Creating Dependent Objects Before Dependencies

**Problem:**
```javascript
// ❌ Line created before points exist
app.addLineAB({ tag: 'line', tagPoint1: 'A', tagPoint2: 'B' });
app.addPointXY({ tag: 'A', ... });
app.addPointXY({ tag: 'B', ... });
```

**Solution:**
```javascript
// ✅ Create dependencies first
app.addPointXY({ tag: 'A', name: 'A', x: 100, y: 100 });
app.addPointXY({ tag: 'B', name: 'B', x: 200, y: 200 });
app.addLineAB({ tag: 'line', tagPoint1: 'A', tagPoint2: 'B' });
```

### Pitfall 6: Coordinate System Confusion

**Problem:**
```javascript
// Using pixel coordinates instead of MathGraph32's coordinate system
app.addPointXY({ tag: 'A', name: 'A', x: 100, y: 100, visible: true });
app.addPointXY({ tag: 'B', name: 'B', x: 500, y: 100, visible: true });
// ❌ Points may be outside visible viewport! MathGraph32 uses -10 to +10 range, not pixels
```

**Solution:**
```javascript
// Use MathGraph32's coordinate system (typically -10 to +10)
// For centered, visible objects, use 2-8 range
app.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2, visible: true });  // ✅ Visible
app.addPointXY({ tag: 'B', name: 'B', x: 8, y: 2, visible: true });  // ✅ Visible

// Note: Y increases upward in MathGraph32 (mathematical convention)
app.addPointXY({ tag: 'top', name: 'Top', x: 5, y: 7 });      // Higher on screen
app.addPointXY({ tag: 'bottom', name: 'Bottom', x: 5, y: 2 }); // Lower on screen
```

### Pitfall 7: Name Conflicts Across Instances

**Problem:**
```javascript
// Creating multiple instances with duplicate point names
// Instance 1: Triangle
app1.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2 });

// Instance 2: Circle
app2.addPointXY({ tag: 'O', name: 'O', x: 5, y: 5 });  // ✅ OK
app2.addPointXY({ tag: 'A_circle', name: 'A', x: 7, y: 5 });  // ❌ Error: "the name A is already used"
```

**Solution:**
```javascript
// Use unique display names across all instances on the same page
// Triangle example
app1.addPointXY({ tag: 'triangleA', name: 'A', x: 2, y: 2 });
app1.addPointXY({ tag: 'triangleB', name: 'B', x: 8, y: 2 });
app1.addPointXY({ tag: 'triangleC', name: 'C', x: 5, y: 7 });

// Circle example - use subscript numbers to differentiate
app2.addPointXY({ tag: 'circleO', name: 'O₁', x: 5, y: 5 });  // ✅ Unique name
app2.addPointXY({ tag: 'circleP', name: 'P', x: 7, y: 5 });

// Bisector example
app3.addPointXY({ tag: 'bisectorD', name: 'D', x: 2, y: 5 });
app3.addPointXY({ tag: 'bisectorE', name: 'E', x: 8, y: 5 });
app3.addPointXY({ tag: 'bisectorM', name: 'M₁', x: 5, y: 5 });  // ✅ Unique name
```

**Key Insight:** MathGraph32 maintains a global namespace for point names across ALL instances. Always use unique display names when you have multiple MathGraph32 canvases on the same page.

### Pitfall 8: Memory Leaks with Multiple Instances

**Problem:**
```javascript
// Creating multiple instances without cleanup
for (let i = 0; i < 10; i++) {
    const container = document.getElementById(`container-${i}`);
    window.mtgLoad(container, ...);  // ❌ Creates 10 instances, never cleaned up
}
```

**Solution:**
```javascript
// Track and clean up instances
const instances = [];

function createInstance(container) {
    return new Promise((resolve) => {
        window.mtgLoad(container, svgOptions, mtgOptions, (error, app) => {
            instances.push(app);
            resolve(app);
        });
    });
}

function cleanupInstances() {
    instances.forEach(app => {
        // Remove SVG from DOM
        if (app.svgApi && app.svgApi.parentNode) {
            app.svgApi.parentNode.removeChild(app.svgApi);
        }
    });
    instances.length = 0;
}

// Clean up when done
onDestroy(() => {
    cleanupInstances();
});
```

---

## Complete Code Examples

### Example 1: Simple Triangle

```javascript
async function createTriangle(app) {
    // Create three points using MathGraph32 coordinate system (2-8 range)
    app.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'B', name: 'B', x: 8, y: 2, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'C', name: 'C', x: 5, y: 7, visible: true, nameVisible: true });

    // Create sides
    app.addSegment({ tag: 'AB', tagPoint1: 'A', tagPoint2: 'B', visible: true, color: 'blue' });
    app.addSegment({ tag: 'BC', tagPoint1: 'B', tagPoint2: 'C', visible: true, color: 'blue' });
    app.addSegment({ tag: 'CA', tagPoint1: 'C', tagPoint2: 'A', visible: true, color: 'blue' });

    // Create polygon (for fill)
    app.addPolygon({
        tag: 'triangle',
        tagPoints: ['A', 'B', 'C'],
        visible: true,
        fillColor: 'rgba(0, 0, 255, 0.1)',
        filled: true
    });

    app.reDisplay();  // Use official method reDisplay()
}
```

### Example 2: Circle with Circumcircle of Triangle

```javascript
async function createTriangleWithCircumcircle(app) {
    // Create triangle using correct coordinate system
    app.addPointXY({ tag: 'A', name: 'A', x: 2, y: 2, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'B', name: 'B', x: 8, y: 2, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'C', name: 'C', x: 5, y: 7, visible: true, nameVisible: true });

    app.addSegment({ tag: 'AB', tagPoint1: 'A', tagPoint2: 'B', visible: true });
    app.addSegment({ tag: 'BC', tagPoint1: 'B', tagPoint2: 'C', visible: true });
    app.addSegment({ tag: 'CA', tagPoint1: 'C', tagPoint2: 'A', visible: true });

    // Create circumcircle (circle through three points)
    app.addCircle3Points({
        tag: 'circumcircle',
        tagPoint1: 'A',
        tagPoint2: 'B',
        tagPoint3: 'C',
        visible: true,
        color: 'red'
    });

    app.reDisplay();
}
```

### Example 3: Perpendicular Bisector Construction

```javascript
async function createPerpendicularBisector(app) {
    // Create segment DE using correct coordinate system
    app.addPointXY({ tag: 'D', name: 'D', x: 2, y: 5, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'E', name: 'E', x: 8, y: 5, visible: true, nameVisible: true });
    app.addSegment({ tag: 'segDE', tagPoint1: 'D', tagPoint2: 'E', visible: true, color: 'blue' });

    // Create midpoint
    app.addMidpoint({ a: 'D', b: 'E', name: 'M', color: 'black', tag: 'midpointM' });

    // Create perpendicular bisector (médiatrice)
    // OFFICIAL API: addLineMedAB (not addPerpBisector)
    app.addLineMedAB({
        a: 'D',
        b: 'E',
        name: 'd',
        color: 'red',
        lineStyle: 'solid',
        tag: 'bisector'
    });

    // Alternative: Create perpendicular line through midpoint
    // app.addLinePerp({
    //     tag: 'perpendicular',
    //     a: 'midpointM',  // Point the line goes through
    //     d: 'segDE',      // Line to be perpendicular to
    //     color: 'red'
    // });

    app.reDisplay();  // Official method is reDisplay()
}
```

### Example 4: Parallel Lines with Transversal

```javascript
async function createParallelLinesWithTransversal(app) {
    // Create first line (AB) using correct coordinate system
    app.addPointXY({ tag: 'A', name: 'A', x: 1, y: 3, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'B', name: 'B', x: 9, y: 3, visible: true, nameVisible: true });
    app.addLineAB({ tag: 'line1', tagPoint1: 'A', tagPoint2: 'B', visible: true, color: 'blue' });

    // Create point C for parallel line
    app.addPointXY({ tag: 'C', name: 'C', x: 2, y: 7, visible: true, nameVisible: true });

    // Create parallel line through C
    app.addLinePar({ tag: 'line2', tagLine: 'line1', tagPoint: 'C', visible: true, color: 'blue' });

    // Create transversal
    app.addPointXY({ tag: 'D', name: 'D', x: 4, y: 1, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'E', name: 'E', x: 6, y: 9, visible: true, nameVisible: true });
    app.addLineAB({ tag: 'transversal', tagPoint1: 'D', tagPoint2: 'E', visible: true, color: 'red' });

    app.reDisplay();
}
```

### Example 5: Interactive Construction Validation

```javascript
async function validatePerpendicularConstruction(app) {
    // Expected: Student should create a perpendicular line to AB through C

    // Check if perpendicular line exists
    const lineCount = app.listApi.longueur();
    let perpendicularFound = false;

    for (let i = 0; i < lineCount; i++) {
        const obj = app.listApi.get(i);

        if (obj.type === 'line') {
            const line1 = app.getObjectByTag('line_AB');
            const pointC = app.getObjectByTag('C');

            // Check if this line passes through C
            const passesThrough = checkLinePassesThrough(obj, pointC);

            // Check if this line is perpendicular to AB
            const isPerpendicular = checkLinesPerpendicular(obj, line1);

            if (passesThrough && isPerpendicular) {
                perpendicularFound = true;
                break;
            }
        }
    }

    return {
        isValid: perpendicularFound,
        feedback: perpendicularFound
            ? 'Excellent! La perpendiculaire est correcte.'
            : 'La perpendiculaire n\'est pas correcte. Vérifiez qu\'elle passe par C et qu\'elle est bien perpendiculaire à AB.'
    };
}

// Helper functions
function checkLinePassesThrough(line, point, tolerance = 5) {
    // Calculate distance from point to line
    // (Simplified - actual implementation would use proper geometry)
    return true; // Placeholder
}

function checkLinesPerpendicular(line1, line2, angleTolerance = 2) {
    // Calculate angle between lines
    // Check if angle is 90° ± tolerance
    return true; // Placeholder
}
```

### Example 6: Dynamic Figure Generation with Randomization

```javascript
async function generateRandomTriangle(app) {
    // Generate random coordinates within MathGraph32's coordinate system
    // Use 2-8 range for visibility
    const minCoord = 2, maxCoord = 8;

    const randomCoord = () => Math.random() * (maxCoord - minCoord) + minCoord;

    // Create random triangle
    const A = { x: randomCoord(), y: randomCoord() };
    const B = { x: randomCoord(), y: randomCoord() };
    const C = { x: randomCoord(), y: randomCoord() };

    app.addPointXY({ tag: 'A', name: 'A', x: A.x, y: A.y, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'B', name: 'B', x: B.x, y: B.y, visible: true, nameVisible: true });
    app.addPointXY({ tag: 'C', name: 'C', x: C.x, y: C.y, visible: true, nameVisible: true });

    app.addSegment({ tag: 'AB', tagPoint1: 'A', tagPoint2: 'B', visible: true });
    app.addSegment({ tag: 'BC', tagPoint1: 'B', tagPoint2: 'C', visible: true });
    app.addSegment({ tag: 'CA', tagPoint1: 'C', tagPoint2: 'A', visible: true });

    // Calculate and store expected measurements
    const distAB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
    const distBC = Math.sqrt(Math.pow(C.x - B.x, 2) + Math.pow(C.y - B.y, 2));
    const distCA = Math.sqrt(Math.pow(A.x - C.x, 2) + Math.pow(A.y - C.y, 2));

    app.reDisplay();

    return {
        figureBase64: await app.getBase64Code(),  // Official method
        expectedMeasurements: {
            AB: distAB,
            BC: distBC,
            CA: distCA
        }
    };
}
```

---

## Conclusion

MathGraph32 is a powerful tool for creating interactive geometric constructions. The key to success is:

1. ✅ **Always enable `loadApi: true`** when you need programmatic control
2. ✅ **Use correct API method names** - consult https://www.mathgraph32.org/documentation/full/MtgApi.html for official documentation
3. ✅ **Use correct parameter names** - e.g., `a` and `d` for `addLinePerp`, `o` and `a` for `addCircleOA`, `o`, `a`, `b`, `r` for `addAngleMark`
4. ✅ **Use MathGraph32's coordinate system** - typically -10 to +10 range, use 2-8 for centered visible objects
5. ✅ **Use unique point names** across all instances on the same page (global namespace)
6. ✅ **Use tags** (not names) for programmatic object identification
7. ✅ **Create dependencies first** before dependent objects
8. ✅ **Call `app.reDisplay()`** after creating/modifying objects to update display
9. ✅ **Use singleton pattern** for CDN loading

### Additional Resources

- **Official Documentation:** https://www.mathgraph32.org/spip.php?article9 (French)
- **Example Figures:** https://www.mathgraph32.org/?page_id=10
- **UbuMaths Implementation:** See `src/lib/services/mathgraph-api.ts`

### Getting Help

If you encounter issues:
1. Check this guide first (especially Common Pitfalls section)
2. Review the complete code examples
3. Consult the GEOMETRY_API_DOCS.md for integration examples
4. Reach out to Yves Biton via the official website

Happy coding! 🎓✨
