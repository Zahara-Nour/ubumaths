# Educational Instruments

The whiteboard includes three educational geometry instruments that can be displayed, moved, and rotated on the canvas.

## Available Instruments

| Instrument | Component           | Description                          |
| ---------- | ------------------- | ------------------------------------ |
| Ruler      | `Ruler.svelte`      | Graduated ruler with cm/mm markings  |
| Protractor | `Protractor.svelte` | 180° protractor with degree markings |
| Set Square | `SetSquare.svelte`  | Right-angle triangle (45° or 30/60°) |

## Usage

### Show/Hide Instruments

```typescript
import { whiteboardStore } from '$lib/whiteboard';

// Toggle visibility
whiteboardStore.toggleInstrument('ruler');

// Show specific instrument
whiteboardStore.showInstrument('protractor');

// Hide specific instrument
whiteboardStore.hideInstrument('setSquare');
```

### Position and Rotate

```typescript
// Update position
whiteboardStore.updateInstrumentPosition('ruler', { x: 100, y: 200 });

// Update rotation (degrees)
whiteboardStore.updateInstrumentRotation('protractor', 45);

// Update multiple properties
whiteboardStore.updateInstrument('setSquare', {
	x: 300,
	y: 400,
	rotation: 90,
	scale: 1.5
});
```

### Reset to Default

```typescript
// Reset all instruments to default positions
whiteboardStore.resetInstruments();
```

### Get Instrument State

```typescript
const state = whiteboardStore.getInstrumentState('ruler');
console.log(state);
// { visible: true, x: 100, y: 200, rotation: 0, scale: 1 }
```

---

## Instrument Details

### Ruler

A graduated ruler with centimeter and millimeter markings.

**Default State:**

```typescript
{
  visible: false,
  x: 100,
  y: 100,
  rotation: 0,
  scale: 1
}
```

**Features:**

- 15 cm length (at scale 1)
- Major ticks every cm with numbers
- Minor ticks every mm
- Semi-transparent background
- Rotation handle at right edge

**Visual:**

```
┌────────────────────────────────────────────────────────┐
│ 0    1    2    3    4    5    6    7    8    9   10   │
│ |||||||||||||||||||||||||||||||||||||||||||||||||||||  │
└────────────────────────────────────────────────────────┘
```

### Protractor

A 180° semicircular protractor with degree markings.

**Default State:**

```typescript
{
  visible: false,
  x: 200,
  y: 200,
  rotation: 0,
  scale: 1
}
```

**Features:**

- 180° arc
- Major ticks every 10° with numbers
- Minor ticks every 1°
- Center point marked
- Dual numbering (0-180 and 180-0)
- Rotation handle at top center

**Visual:**

```
          90°
         /│\
       /  │  \
     /    │    \
   /      │      \
  ────────●────────
  180°          0°
```

### Set Square

A right-angle triangle set square.

**Default State:**

```typescript
{
  visible: false,
  x: 300,
  y: 150,
  rotation: 0,
  scale: 1
}
```

**Features:**

- 45-45-90 triangle (default)
- Graduated edges in cm
- Right angle indicator
- Rotation handle at hypotenuse center

**Visual:**

```
    ●
   /│
  / │
 /  │
●───●
```

---

## Toolbar Integration

Instruments are controlled via the toolbar:

```svelte
<!-- In WhiteboardToolbar.svelte -->
<div class="instruments-section">
	<Button
		variant={instruments.ruler.visible ? 'secondary' : 'ghost'}
		onclick={() => whiteboardStore.toggleInstrument('ruler')}
		aria-pressed={instruments.ruler.visible}
	>
		<RulerIcon />
		Règle
	</Button>

	<Button
		variant={instruments.protractor.visible ? 'secondary' : 'ghost'}
		onclick={() => whiteboardStore.toggleInstrument('protractor')}
		aria-pressed={instruments.protractor.visible}
	>
		<ProtractorIcon />
		Rapporteur
	</Button>

	<Button
		variant={instruments.setSquare.visible ? 'secondary' : 'ghost'}
		onclick={() => whiteboardStore.toggleInstrument('setSquare')}
		aria-pressed={instruments.setSquare.visible}
	>
		<TriangleIcon />
		Équerre
	</Button>
</div>
```

---

## InstrumentLayer Component

The `InstrumentLayer.svelte` component renders all visible instruments.

### Structure

```svelte
<script lang="ts">
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import Ruler from '$lib/constructions/components/instruments/Ruler.svelte';
	import Protractor from '$lib/constructions/components/instruments/Protractor.svelte';
	import SetSquare from '$lib/constructions/components/instruments/SetSquare.svelte';

	const instruments = $derived(whiteboardStore.instruments);
</script>

<g class="instruments-layer">
	{#if instruments.ruler.visible}
		<g
			class="instrument ruler"
			transform="translate({instruments.ruler.x}, {instruments.ruler.y}) rotate({instruments.ruler
				.rotation})"
			onpointerdown={(e) => startDrag(e, 'ruler')}
		>
			<Ruler scale={instruments.ruler.scale} />
			<RotationHandle type="ruler" />
		</g>
	{/if}

	{#if instruments.protractor.visible}
		<g
			class="instrument protractor"
			transform="translate({instruments.protractor.x}, {instruments.protractor
				.y}) rotate({instruments.protractor.rotation})"
			onpointerdown={(e) => startDrag(e, 'protractor')}
		>
			<Protractor scale={instruments.protractor.scale} />
			<RotationHandle type="protractor" />
		</g>
	{/if}

	{#if instruments.setSquare.visible}
		<g
			class="instrument setSquare"
			transform="translate({instruments.setSquare.x}, {instruments.setSquare.y}) rotate({instruments
				.setSquare.rotation})"
			onpointerdown={(e) => startDrag(e, 'setSquare')}
		>
			<SetSquare scale={instruments.setSquare.scale} />
			<RotationHandle type="setSquare" />
		</g>
	{/if}
</g>
```

### Drag Implementation

```typescript
interface DragState {
	instrument: InstrumentType | null;
	startPointerX: number;
	startPointerY: number;
	startElementX: number;
	startElementY: number;
}

let dragState = $state<DragState>({
	instrument: null,
	startPointerX: 0,
	startPointerY: 0,
	startElementX: 0,
	startElementY: 0
});

function startDrag(e: PointerEvent, type: InstrumentType) {
	const state = whiteboardStore.getInstrumentState(type);
	dragState = {
		instrument: type,
		startPointerX: e.clientX,
		startPointerY: e.clientY,
		startElementX: state.x,
		startElementY: state.y
	};

	try {
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	} catch {
		// Ignore capture errors
	}
}

function handlePointerMove(e: PointerEvent) {
	if (!dragState.instrument) return;

	const dx = e.clientX - dragState.startPointerX;
	const dy = e.clientY - dragState.startPointerY;

	whiteboardStore.updateInstrumentPosition(dragState.instrument, {
		x: dragState.startElementX + dx,
		y: dragState.startElementY + dy
	});
}

function handlePointerUp() {
	dragState.instrument = null;
}
```

### Rotation Handle

```typescript
interface RotationState {
	instrument: InstrumentType | null;
	startAngle: number;
	startRotation: number;
}

let rotationState = $state<RotationState>({
	instrument: null,
	startAngle: 0,
	startRotation: 0
});

function startRotation(e: PointerEvent, type: InstrumentType) {
	const state = whiteboardStore.getInstrumentState(type);
	const rect = (e.currentTarget as Element).closest('.instrument')!.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	rotationState = {
		instrument: type,
		startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI),
		startRotation: state.rotation
	};
}

function handleRotationMove(e: PointerEvent) {
	if (!rotationState.instrument) return;

	const rect = document
		.querySelector(`.instrument.${rotationState.instrument}`)!
		.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;

	const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
	const deltaAngle = currentAngle - rotationState.startAngle;

	whiteboardStore.updateInstrumentRotation(
		rotationState.instrument,
		rotationState.startRotation + deltaAngle
	);
}
```

---

## Persistence

Instrument states are saved in the `.ubw` document:

```json
{
	"pages": [
		{
			"id": "page-1",
			"instruments": {
				"ruler": {
					"visible": true,
					"x": 150,
					"y": 300,
					"rotation": 15,
					"scale": 1
				},
				"protractor": {
					"visible": false,
					"x": 400,
					"y": 400,
					"rotation": 0,
					"scale": 1
				},
				"setSquare": {
					"visible": true,
					"x": 500,
					"y": 200,
					"rotation": -30,
					"scale": 1
				}
			}
		}
	]
}
```

---

## Export Behavior

When exporting, instruments can be included or excluded:

```typescript
import { exportDocument } from '$lib/whiteboard';

// Include instruments in export
const result = await exportDocument(document, {
	format: 'png',
	includeInstruments: true
});

// Exclude instruments from export
const result = await exportDocument(document, {
	format: 'pdf',
	includeInstruments: false
});
```

---

## Accessibility

- Instruments are keyboard-navigable (Tab to focus)
- Arrow keys move focused instrument
- Rotation via Shift+Arrow keys
- ARIA labels describe each instrument
- High contrast option available
