# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**InstrumenPoche** is a JavaScript/SVG-based educational geometry animation player developed by Sésamath. It renders and animates interactive geometry constructions (XML-based scripts) in web browsers, featuring virtual geometry tools (compass, ruler, protractor, set square).

**Language**: Code is in ES6 JavaScript. Comments and documentation are in French.

**License**: AGPL-3.0-or-later

## Development Commands

```bash
pnpm start              # Start dev server on http://localhost:8081 (with hot reload)
pnpm build              # Build production bundles (minified, with source maps)
pnpm build-dev          # Build development bundles (non-minified, verbose)
pnpm lint               # Check code with ESLint
pnpm lint:fix           # Auto-fix ESLint issues
pnpm doc                # Generate JSDoc documentation (base)
pnpm doc:all            # Generate comprehensive JSDoc documentation
pnpm build-element      # Build custom web component version
```

### Dev Server Options

```bash
# Custom host/port
pnpm start -- --host=0.0.0.0 --port=3000

# Non-minified debug build
pnpm build -- --debug
```

## Build System Architecture

### Webpack Dual Compilation

The build produces **two versions** of the loader:

1. **ES5 Version** (`iepLoad.es5.js` / `.min.js`)
   - Transpiled with Babel for IE11+ compatibility
   - Includes core-js polyfills
   - Target: All browsers including legacy

2. **ES Module Version** (`iepLoad.module.js` / `.min.js`)
   - Modern ES6+ syntax preserved
   - Smaller bundle size
   - Target: Browsers with native ES module support

### Build Output (`build/`)

- `iepLoad.js` / `.min.js` - Pre-loader script (copied from `src/iepLoad.js`)
- `iepLoad.es5.js` / `.min.js` - ES5 bundle (entry: `src/iepLoad.es5.js`)
- `iepLoad.module.js` / `.min.js` - ES module bundle (entry: `src/iepLoad.module.js`)
- `*.map` - Source maps for all bundles

**Note**: The `build/` directory is automatically cleaned before each build.

## Code Architecture

### Entry Points

**For browser embedding** (cross-domain loading):
```html
<script src="https://instrumenpoche.sesamath.net/iep/js/iepLoad.min.js"></script>
<script>
  iepLoad('containerId', 'https://example.com/animation.xml', callback);
</script>
```

**For npm/module usage**:
```javascript
import iepLoadPromise from 'instrumenpoche'

const iepApp = await iepLoadPromise(container, xml, options)
```

### Core Components

#### `src/iepLoadPromise.js`
Main module entry point. Returns a Promise that resolves to an `IepApp` instance.

**Key responsibilities**:
- Creates the SVG container
- Fetches and parses XML scripts
- Initializes the IepApp with options
- Returns promise-based API

**Options**:
- `autostart` (default: true) - Auto-play animation on load
- `debug` (default: false) - Enable console logging
- `zoom` (default: false) - Add zoom controls

#### `src/app/IepApp.js`
Application controller managing multiple IepDoc instances.

**Key responsibilities**:
- Manages multiple geometry figures/documents
- Handles popup windows for XML code display
- Provides global debug mode

#### `src/app/IepDoc.js`
Document controller for a single geometry animation.

**Key responsibilities**:
- Parses XML script into objects and actions
- Manages SVG rendering and viewBox
- Controls animation timeline (play/pause/reset)
- Instantiates instruments and geometric objects
- Executes action sequences

**Important XML parsing**:
- Instruments: `<compas>`, `<regle>`, `<equerre>`, `<rapporteur>`, `<requerre>`, `<crayon>`
- Objects: `<point>`, `<segment>`, `<cercle>`, `<arc>`, `<angle>`, `<texte>`, etc.
- Actions: `<glisser>`, `<creation>`, `<translation>`, `<rotation>`, `<zoom>`, `<pause>`, etc.

### Directory Structure

```
src/
├── iepLoad.js              # Browser pre-loader (ES5, timestamp injection)
├── iepLoad.es5.js          # ES5 bundle entry point
├── iepLoad.module.js       # ES module bundle entry point
├── iepLoadPromise.js       # Main module (Promise API)
├── iepElement.js           # Custom web element version
├── loadMathJax.js          # MathJax loading utility
├── app/
│   ├── IepApp.js          # Application controller
│   └── IepDoc.js          # Document/animation controller
├── instruments/
│   ├── InstrumentAncetre.js  # Base class for all instruments
│   ├── Compas.js           # Compass tool
│   ├── Regle.js            # Ruler tool
│   ├── Equerre.js          # Set square tool
│   ├── Rapporteur.js       # Protractor tool
│   ├── Requerre.js         # Combined ruler-set-square
│   └── Crayon.js           # Pencil/drawing tool
├── objets/
│   ├── Point.js            # Point object
│   ├── Segment.js          # Line segment
│   ├── Cercle.js           # Circle
│   ├── Arc.js              # Arc
│   ├── Angle.js            # Angle
│   ├── Texte.js            # Text label
│   └── [22+ other objects] # Polygons, vectors, etc.
├── actions/
│   ├── ActionAncetre.js    # Base class for all actions
│   ├── ActionGlisser.js    # Drag/move action
│   ├── ActionRotation*.js  # Rotation actions
│   ├── ActionTranslation*.js # Translation actions
│   ├── ActionCreation.js   # Object creation
│   └── [20+ other actions] # Show/hide, zoom, pause, etc.
├── global/
│   ├── constantes.js       # SVG namespace, constants
│   └── [utility functions] # XML parsing, color utils
└── types/
    └── Vect.js             # 2D vector class
```

### Inheritance Hierarchy

**Instruments**: All inherit from `InstrumentAncetre`
- Common: SVG rendering, drag/drop, rotation, zoom, show/hide

**Objects**: Various base classes depending on geometry type
- All render to SVG elements
- Support styling, transformations, visibility

**Actions**: All inherit from `ActionAncetre`
- Execute animations with start/end states
- Support easing and duration

## Key Architectural Patterns

### 1. Class-Based ES6
All components use ES6 classes with constructor functions exported as default.

```javascript
export default Regle

function Regle(doc, ...) {
  InstrumentAncetre.call(this, doc, ...)
  // ...
}
Regle.prototype = Object.create(InstrumentAncetre.prototype)
```

### 2. SVG Direct Manipulation
Heavy use of SVG namespace and DOM methods:
```javascript
import { svgns } from '../global/constantes'
const circle = document.createElementNS(svgns, 'circle')
```

### 3. XML-Driven Animations
All animations are defined in XML scripts with declarative syntax:
- Instruments defined with positions, rotations, visibility
- Actions define timeline with durations and easings
- Objects defined with geometric properties

### 4. Singleton Pattern
`iepLoadPromise` maintains a singleton `iepApp` instance to avoid duplicate initializations.

### 5. Promise-Based API
Modern API uses async/await pattern, while maintaining callback compatibility for legacy usage.

## Browser Compatibility

**Target Browsers**:
- Modern browsers (ES module version)
- IE11+ (ES5 version with polyfills)

**Polyfills included** (via core-js):
- Promise
- fetch (via whatwg-fetch)
- Various ES6+ features

## Development Workflow

### Adding New Instruments

1. Create new class in `src/instruments/` inheriting from `InstrumentAncetre`
2. Implement required methods: constructor, rendering, interaction handlers
3. Register in `IepDoc.js` XML parser (import and add to switch statement)
4. Add fixture in `devServer/fixtures/` for testing
5. Update `devServer/index.js` to include new example

### Adding New Actions

1. Create new class in `src/actions/` inheriting from `ActionAncetre`
2. Implement `execute()` method with animation logic
3. Register in `IepDoc.js` action parser
4. Test with XML script examples

### Testing Changes

1. Run `pnpm start` to launch dev server
2. Navigate to http://localhost:8081/
3. Select examples from the menu (index 0-10+)
4. Add custom fixtures in `devServer/fixtures/` with numbered XML files
5. Increment `maxIndex` in `devServer/index.js` to include new fixtures

### Production Builds

1. Run `pnpm build` to generate minified bundles
2. Check `build/` directory for output files
3. Verify source maps are generated (`.map` files)
4. Test both ES5 and module versions in target browsers

## Important Notes

### MathJax Integration
The project can load MathJax dynamically for mathematical text rendering. See `src/loadMathJax.js` for implementation.

### Cross-Domain Loading
The ES5 loader (`iepLoad.js`) is designed for cross-domain script loading with proper CORS handling.

### Timestamp Injection
During build, `webpack.config.js` injects a Unix timestamp into `iepLoad.js` for cache-busting.

### ESLint Configuration
- Standard JS style enforced
- Special rules for `src/iepLoad.js` (ES5 compatibility, allows `var`)
- Camelcase rules disabled (code uses snake_case in some places)

### Dependencies
- **sesajstools**: Sesamath's utility library (DOM helpers, vector math)
- **core-js**: ES6+ polyfills
- **whatwg-fetch**: Fetch API polyfill

### Git Hooks
Husky is configured (`.husky/`) for pre-commit linting.

## API Reference

### iepLoadPromise(container, xml, options)

**Parameters**:
- `container` (HTMLElement | string) - Container element or ID
- `xml` (string) - XML script content or URL (absolute)
- `options` (Object)
  - `autostart` (boolean) - Default: true
  - `debug` (boolean) - Default: false
  - `zoom` (boolean) - Default: false

**Returns**: Promise<IepApp>

### IepApp API

```javascript
const iepApp = await iepLoadPromise(container, xml)

// Access documents (usually only one)
const doc = iepApp.docs[0]

// Control animation
doc.play()
doc.pause()
doc.reset()
```

## JSDoc Documentation

Generate full API documentation:
```bash
pnpm doc        # Base documentation
pnpm doc:all    # Include private/internal methods
```

Documentation is generated in `jsdoc/out/` directory using the docdash template.
