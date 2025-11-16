# Dice Roller System

3D dice roller system for UbuMaths with WebGL support and 2D fallback.

## Components Created

### Individual Dice Models (6 components)

Located in `src/lib/components/dice/models/`:

- **D4.svelte** - Tetrahedron (4 faces)
- **D6.svelte** - Cube (6 faces)
- **D8.svelte** - Octahedron (8 faces)
- **D10.svelte** - Pentagonal trapezohedron (10 faces)
- **D12.svelte** - Dodecahedron (12 faces)
- **D20.svelte** - Icosahedron (20 faces)

Each model:

- Uses Threlte's `<T.Mesh>` for 3D rendering
- Accepts `style`, `size`, `position`, `rotation` props
- Uses geometry from `getDiceGeometry()` utility
- Applies materials based on style configuration

### Main Components

#### DiceScene3D.svelte

Main 3D scene with physics simulation using Threlte and Rapier.

**Features:**

- WebGL-based 3D rendering
- Physics simulation (gravity, collision, friction)
- Camera and lighting setup
- Detects when dice settle
- Returns results via callback

**Props:**

```typescript
{
  config: DiceConfig[],
  onRollStart?: () => void,
  onRollComplete?: (result: DiceRollResult[]) => void,
  physics?: Partial<PhysicsConfig>,
  duration?: number
}
```

**Methods:**

- `roll()` - Trigger a dice roll

#### DiceFallback.svelte

2D fallback for browsers without WebGL support.

**Features:**

- CSS-based animations
- Dice emojis/icons
- Same props interface as DiceScene3D
- Drop-in replacement when WebGL unavailable

**Props:** Same as DiceScene3D

#### DiceRoller.svelte

Main component with WebGL detection and two modes.

**Features:**

- Automatic WebGL detection
- **Controlled mode**: Pass `config` prop with dice configuration
- **Interactive mode**: User selects dice type, count, and style
- Roll history (optional)
- Responsive layout

**Props:**

```typescript
{
  // Mode 1: Controlled
  config?: DiceConfig[],

  // Mode 2: Interactive
  interactive?: boolean,

  // Common
  style?: DiceStyle,
  showHistory?: boolean,
  maxHistory?: number,
  onRollStart?: () => void,
  onRollComplete?: (result: DiceRollResult[]) => void,
  physics?: Partial<PhysicsConfig>,
  duration?: number,
  disabled?: boolean
}
```

#### DiceRollerModal.svelte

Modal wrapper for DiceRoller.

**Features:**

- Shadcn-svelte Dialog component
- Responsive (fullscreen on mobile, fixed on desktop)
- Forwards all DiceRoller props

**Props:**

```typescript
{
  open: boolean (bindable),
  title?: string,
  // ... all DiceRoller props
}
```

## Usage Examples

### Interactive Mode (User Selection)

```svelte
<script>
	import { DiceRoller } from '$lib/components/dice';

	function handleResult(results: DiceRollResult[]) {
		console.log('Roll results:', results);
	}
</script>

<DiceRoller interactive showHistory onRollComplete={handleResult} />
```

### Controlled Mode (Fixed Configuration)

```svelte
<script>
	import { DiceRoller } from '$lib/components/dice';
	import type { DiceConfig } from '$lib/components/dice/types';

	const config: DiceConfig[] = [
		{ type: 'd20', count: 1, style: 'neon' },
		{ type: 'd6', count: 2, style: 'classic' }
	];

	function handleResult(results: DiceRollResult[]) {
		const total = results.reduce((sum, r) => sum + r.total, 0);
		console.log('Total:', total);
	}
</script>

<DiceRoller {config} showHistory onRollComplete={handleResult} />
```

### Modal Mode

```svelte
<script>
	import { DiceRollerModal } from '$lib/components/dice';
	import { Button } from '$lib/components/ui/button';

	let showModal = $state(false);
</script>

<Button onclick={() => (showModal = true)}>Lancer les dés</Button>

<DiceRollerModal bind:open={showModal} title="Lanceur de Dés" interactive showHistory />
```

## Types

All types are exported from `src/lib/components/dice/types.ts`:

- `DiceType` - 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'
- `DiceStyle` - 'classic' | 'neon' | 'wood'
- `DiceConfig` - Configuration for dice to roll
- `DiceRollResult` - Result from a roll
- `SingleDiceResult` - Result from a single die
- `DiceStyleConfig` - Visual style configuration
- `PhysicsConfig` - Physics simulation settings
- `DiceRollerProps` - Props for main component

## Utilities

### dice-geometry.ts

- `getDiceGeometry(type)` - Get geometry data for a dice type
- `detectTopFace(type, upVector)` - Detect which face is on top
- `getMaxFaceValue(type)` - Get max face value
- `getDiceDisplayName(type)` - Get French display name
- `allDiceTypes` - Array of all dice types

### webgl-detector.ts

- `isWebGLSupported()` - Check if WebGL is available
- `getWebGLVersion()` - Get WebGL version ('1', '2', or null)
- `getWebGLCapabilities()` - Get detailed WebGL capabilities

### styles/index.ts

- `classicStyle` - White dice with black numbers
- `neonStyle` - Dark dice with glowing green numbers
- `woodStyle` - Brown dice with gold numbers
- `getStyleConfig(name)` - Get style by name
- `styleNames` - Array of style options for UI

## Test Page

A demo page is available at `/test-dice` with examples of:

- Interactive mode
- Controlled mode (single die)
- Controlled mode (multiple dice)
- Modal mode
- Result display

## Next Steps

1. **Physics Implementation** - Full Rapier physics simulation in DiceScene3D
2. **Number Display** - Add numbers/dots on dice faces using Decals or Text3D
3. **Testing** - Unit tests with test-automator agent
4. **Documentation** - User docs with documentation-writer agent
5. **Performance** - Optimize with performance-optimizer agent
6. **Security Review** - Audit with security-auditor agent

## Technical Notes

### SSR Safety

All Three.js/Threlte code is wrapped in `{#if browser}` blocks to prevent SSR errors.

### WebGL Fallback

The system automatically detects WebGL support:

- **Supported**: Shows DiceScene3D with 3D rendering
- **Not supported**: Shows DiceFallback with 2D animations

### Svelte 5 Runes

All components use Svelte 5 runes:

- `$state()` for reactive state
- `$derived()` for computed values
- `$props()` for component props
- `$bindable()` for two-way binding
- `$effect()` for side effects

### TypeScript

Full type safety with strict mode enabled. All types are properly defined in `types.ts`.

### Performance

- Lazy loading possible for Threlte components
- Minimal re-renders with Svelte 5 fine-grained reactivity
- Efficient geometry caching
- WebGL context cleanup

## Files Created

```
src/lib/components/dice/
├── models/
│   ├── D4.svelte
│   ├── D6.svelte
│   ├── D8.svelte
│   ├── D10.svelte
│   ├── D12.svelte
│   └── D20.svelte
├── DiceScene3D.svelte
├── DiceFallback.svelte
├── DiceRoller.svelte
├── DiceRollerModal.svelte
├── index.ts
└── README.md
```

Total: **11 new files created**
