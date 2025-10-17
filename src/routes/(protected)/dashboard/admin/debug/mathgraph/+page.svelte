<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { MathGraphService } from '$lib/services/mathgraph-api';
	import { toaster } from '$lib/stores/toaster.svelte';
	import MathGraphFullscreen from '$lib/components/MathGraphFullscreen.svelte';

	let mathGraphLoaded = $state(false);
	let currentExample = $state<string>('');
	let exampleOutput = $state<string>('');
	let figureContainer: HTMLDivElement;

	// Initialize MathGraph32
	onMount(async () => {
		try {
			const service = MathGraphService.getInstance();
			await service.loadMathGraph();
			mathGraphLoaded = true;
			toaster.success('MathGraph32 loaded successfully!');
		} catch (error) {
			console.error('Failed to load MathGraph32:', error);
			toaster.error('Failed to load MathGraph32');
		}
	});

	// Example 1: Create a simple triangle
	async function createTriangleExample() {
		currentExample = 'triangle';
		exampleOutput = 'Creating triangle...';

		try {
			if (!mathGraphLoaded) {
				throw new Error('MathGraph32 not loaded');
			}

			// Always create a fresh canvas element
			figureContainer.innerHTML = ''; // Clear everything
			const canvas = document.createElement('div');
			canvas.id = 'mtg-canvas';
			canvas.style.width = '600px';
			canvas.style.height = '400px';
			figureContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise(resolve => setTimeout(resolve, 10));

			// Create new MathGraph32 application using the service
			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: 600,
				height: 400,
				level: 1
			});

			// Create three points for the triangle using English API
			// Centered coordinates for better visibility
			const pointA = app.addPointXY({
				tag: 'pointA',
				name: 'A',
				x: 2,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointB = app.addPointXY({
				tag: 'pointB',
				name: 'B',
				x: 8,
				y: 2,
				visible: true,
				nameVisible: true
			});

			const pointC = app.addPointXY({
				tag: 'pointC',
				name: 'C',
				x: 5,
				y: 7,
				visible: true,
				nameVisible: true
			});

			// Create segments connecting the points using object references
			app.addSegment({
				tag: 'segAB',
				a: pointA,
				b: pointB,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segBC',
				a: pointB,
				b: pointC,
				visible: true,
				color: 'blue'
			});

			app.addSegment({
				tag: 'segCA',
				a: pointC,
				b: pointA,
				visible: true,
				color: 'blue'
			});

			// Update the display
			app.updateFigDisplay();

			exampleOutput = `✅ Triangle created successfully!

Points created:
- A at (2, 2)
- B at (8, 2)
- C at (5, 7)

Segments created:
- [AB]
- [BC]
- [CA]

Code used:
\`\`\`typescript
const service = MathGraphService.getInstance();
const app = await service.initializeEditor(canvas, {
  width: 600,
  height: 400,
  level: 1
});

// Create points using English API
// Centered coordinates for better visibility
const pointA = app.addPointXY({
  tag: 'pointA', name: 'A',
  x: 2, y: 2,
  visible: true, nameVisible: true
});

const pointB = app.addPointXY({
  tag: 'pointB', name: 'B',
  x: 8, y: 2,
  visible: true, nameVisible: true
});

const pointC = app.addPointXY({
  tag: 'pointC', name: 'C',
  x: 5, y: 7,
  visible: true, nameVisible: true
});

// Create segments using object references (not tags!)
app.addSegment({
  tag: 'segAB',
  a: pointA,  // Use 'a' and 'b' with object refs
  b: pointB,
  visible: true,
  color: 'blue'
});

app.addSegment({
  tag: 'segBC',
  a: pointB,
  b: pointC,
  visible: true,
  color: 'blue'
});

app.addSegment({
  tag: 'segCA',
  a: pointC,
  b: pointA,
  visible: true,
  color: 'blue'
});

app.updateFigDisplay();
\`\`\``;

			toaster.success('Triangle created!');
		} catch (error) {
			console.error('Error creating triangle:', error);
			exampleOutput = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			toaster.error('Failed to create triangle');
		}
	}

	// Example 2: Create a circle with center and radius
	async function createCircleExample() {
		currentExample = 'circle';
		exampleOutput = 'Creating circle...';

		try {
			if (!mathGraphLoaded) {
				throw new Error('MathGraph32 not loaded');
			}

			// Always create a fresh canvas element
			figureContainer.innerHTML = ''; // Clear everything
			const canvas = document.createElement('div');
			canvas.id = 'mtg-canvas';
			canvas.style.width = '600px';
			canvas.style.height = '400px';
			figureContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise(resolve => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: 600,
				height: 400,
				level: 1
			});

			// Create center point
			const center = app.addPointXY({
				tag: 'centerO',
				name: 'O',
				x: 300,
				y: 200,
				visible: true,
				nameVisible: true
			});

			// Create point on circle to define radius
			const radiusPoint = app.addPointXY({
				tag: 'pointA',
				name: 'A',
				x: 450,
				y: 200,
				visible: true,
				nameVisible: true
			});

			// Create circle using object references
			app.addCircle({
				tag: 'circle1',
				center: center,
				radiusPoint: radiusPoint,
				visible: true,
				color: 'blue'
			});

			app.updateFigDisplay();

			exampleOutput = `✅ Circle created successfully!

Center: O at (300, 200)
Radius point: A at (450, 200)
Radius: 150 pixels

Code used:
\`\`\`typescript
const service = MathGraphService.getInstance();
const app = await service.initializeEditor(canvas, {
  width: 600,
  height: 400,
  level: 1
});

// Create center point using English API
const center = app.addPointXY({
  tag: 'centerO', name: 'O',
  x: 300, y: 200,
  visible: true, nameVisible: true
});

// Create radius point
const radiusPoint = app.addPointXY({
  tag: 'pointA', name: 'A',
  x: 450, y: 200,
  visible: true, nameVisible: true
});

// Create circle using object references
app.addCircle({
  tag: 'circle1',
  center: center,
  radiusPoint: radiusPoint,
  visible: true,
  color: 'blue'
});

app.updateFigDisplay();
\`\`\``;

			toaster.success('Circle created!');
		} catch (error) {
			console.error('Error creating circle:', error);
			exampleOutput = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			toaster.error('Failed to create circle');
		}
	}

	// Example 3: Perpendicular bisector
	async function createPerpendicularBisectorExample() {
		currentExample = 'perpendicular-bisector';
		exampleOutput = 'Creating perpendicular bisector...';

		try {
			if (!mathGraphLoaded) {
				throw new Error('MathGraph32 not loaded');
			}

			// Always create a fresh canvas element
			figureContainer.innerHTML = ''; // Clear everything
			const canvas = document.createElement('div');
			canvas.id = 'mtg-canvas';
			canvas.style.width = '600px';
			canvas.style.height = '400px';
			figureContainer.appendChild(canvas);

			// Wait a tick for DOM to update
			await new Promise(resolve => setTimeout(resolve, 10));

			const service = MathGraphService.getInstance();
			const app = await service.initializeEditor(canvas, {
				width: 600,
				height: 400,
				level: 1
			});

			// Create segment AB
			const pointA = app.addPointXY({
				tag: 'pointA',
				name: 'A',
				x: 150,
				y: 200,
				visible: true,
				nameVisible: true
			});

			const pointB = app.addPointXY({
				tag: 'pointB',
				name: 'B',
				x: 450,
				y: 200,
				visible: true,
				nameVisible: true
			});

			const segmentAB = app.addSegment({
				tag: 'segAB',
				a: pointA,
				b: pointB,
				visible: true,
				color: 'blue'
			});

			// Create midpoint M
			const midpoint = app.addMidpoint({
				tag: 'midpointM',
				name: 'M',
				a: pointA,
				b: pointB,
				visible: true,
				nameVisible: true
			});

			// Create perpendicular line at midpoint
			app.addPerpendicular({
				tag: 'perpendicular',
				line: segmentAB,
				point: midpoint,
				visible: true,
				color: 'red'
			});

			app.updateFigDisplay();

			exampleOutput = `✅ Perpendicular bisector created!

Construction:
- Segment [AB] from (150, 200) to (450, 200)
- Midpoint M at (300, 200)
- Perpendicular line through M

This demonstrates the classic construction exercise!

Code used:
\`\`\`typescript
const service = MathGraphService.getInstance();
const app = await service.initializeEditor(canvas, {
  width: 600,
  height: 400,
  level: 1
});

// Create points using English API
const pointA = app.addPointXY({
  tag: 'pointA', name: 'A',
  x: 150, y: 200,
  visible: true, nameVisible: true
});

const pointB = app.addPointXY({
  tag: 'pointB', name: 'B',
  x: 450, y: 200,
  visible: true, nameVisible: true
});

// Create segment using object references
const segmentAB = app.addSegment({
  tag: 'segAB',
  a: pointA,  // Use 'a' and 'b' with object refs
  b: pointB,
  visible: true,
  color: 'blue'
});

// Create midpoint using object references
const midpoint = app.addMidpoint({
  tag: 'midpointM', name: 'M',
  a: pointA,  // Use 'a' and 'b' with object refs
  b: pointB,
  visible: true, nameVisible: true
});

// Create perpendicular using object references
app.addPerpendicular({
  tag: 'perpendicular',
  line: segmentAB,  // Object reference
  point: midpoint,  // Object reference
  visible: true,
  color: 'red'
});

app.updateFigDisplay();
\`\`\``;

			toaster.success('Perpendicular bisector created!');
		} catch (error) {
			console.error('Error creating perpendicular bisector:', error);
			exampleOutput = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
			toaster.error('Failed to create perpendicular bisector');
		}
	}

	// Example 4: Export figure as base64
	async function exportFigureExample() {
		currentExample = 'export';
		exampleOutput = 'Exporting current figure...';

		try {
			if (!window.mtgLoad) {
				throw new Error('MathGraph32 not loaded');
			}

			const canvas = figureContainer.querySelector('#mtg-canvas');
			if (!canvas) {
				throw new Error('No figure to export. Create a figure first.');
			}

			// Get the MathGraph32 app instance
			// Note: In real implementation, you'd need to store the app reference
			exampleOutput = `📦 To export a figure:

\`\`\`typescript
// After creating your figure
const figureData = app.exportToBase64();

// Store in database
await supabase
  .from('geometry_exercises')
  .insert({
    title: 'My Exercise',
    initial_figure: figureData,
    // ... other fields
  });

// Later, load the figure
const { data } = await supabase
  .from('geometry_exercises')
  .select('initial_figure')
  .eq('id', exerciseId)
  .single();

const service = MathGraphService.getInstance();
const app = await service.initializeEditor(canvas, {
  width: 600,
  height: 400,
  level: 1
});
app.loadFromBase64(data.initial_figure);
app.updateFigDisplay();
\`\`\`

💡 The base64 string contains the complete figure definition including:
- All points, lines, circles, etc.
- Their positions and properties
- Construction dependencies
- Display settings`;

			toaster.info('Export example shown');
		} catch (error) {
			console.error('Error showing export:', error);
			exampleOutput = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}

	// Example 5: Validation example
	async function validationExample() {
		currentExample = 'validation';
		exampleOutput = '';

		exampleOutput = `🔍 Example: Validating a perpendicular bisector construction

\`\`\`typescript
import {
  validatePointIsMidpoint,
  validateLinesPerpendicular,
  validatePointOnLine
} from '$lib/services/geometry-validator';

// Student's construction
const service = MathGraphService.getInstance();
const app = await service.initializeEditor(canvas, {
  width: 600,
  height: 400,
  level: 1
});
app.loadFromBase64(studentFigure);

// Validation checks
const isMidpoint = validatePointIsMidpoint(
  app,
  'M',      // Student's point M
  'A',      // Given point A
  'B',      // Given point B
  2         // Tolerance in pixels
);

const isPerpendicular = validateLinesPerpendicular(
  app,
  'mediatrice',  // Student's line
  'segment_AB',  // Original segment
  2              // Tolerance in degrees
);

const isOnLine = validatePointOnLine(
  app,
  'M',           // Midpoint
  'mediatrice',  // Student's line
  2              // Tolerance in pixels
);

// All three must be true for correct construction
const isCorrect = isMidpoint && isPerpendicular && isOnLine;

if (isCorrect) {
  console.log('✅ Perfect construction!');
} else {
  console.log('❌ Issues found:');
  if (!isMidpoint) console.log('  - M is not the midpoint of [AB]');
  if (!isPerpendicular) console.log('  - Line is not perpendicular');
  if (!isOnLine) console.log('  - M is not on the perpendicular');
}
\`\`\`

**Available validators:**
- \`validatePointExists(app, tag)\`
- \`validatePointOnLine(app, pointTag, lineTag, tolerance)\`
- \`validatePointOnCircle(app, pointTag, circleTag, tolerance)\`
- \`validatePointIsMidpoint(app, midpointTag, point1, point2, tolerance)\`
- \`validateLinesParallel(app, line1, line2, angleTolerance)\`
- \`validateLinesPerpendicular(app, line1, line2, angleTolerance)\`
- \`validateAngleMeasure(app, angleTag, expectedDegrees, tolerance)\`
- \`validateDistance(app, point1, point2, expectedDistance, tolerance)\`
- ... and 20+ more!

See **GEOMETRY_API_DOCS.md** for complete list.`;

		toaster.info('Validation example shown');
	}

	// Example 6: Randomization
	async function randomizationExample() {
		currentExample = 'randomization';
		exampleOutput = '';

		exampleOutput = `🎲 Example: Creating randomized triangle exercises

\`\`\`typescript
import { generateRandomTriangle } from '$lib/services/geometry-generator';

// Generate a random triangle
const triangle = await generateRandomTriangle(app, {
  type: 'scalene',           // 'scalene', 'isosceles', 'right', or 'equilateral'
  minSideLength: 100,
  maxSideLength: 250,
  centerX: 300,
  centerY: 200
});

// triangle.metadata contains:
// {
//   points: ['A', 'B', 'C'],
//   sides: {
//     AB: 180.5,
//     BC: 200.3,
//     CA: 150.7
//   },
//   angles: {
//     A: 65.2,
//     B: 58.3,
//     C: 56.5
//   }
// }

// Use this metadata for validation
console.log(\`Expected angle A: \${triangle.metadata.angles.A}°\`);

// Store in exercise configuration
await supabase
  .from('geometry_exercises')
  .insert({
    title: 'Triangle measurements',
    is_randomized: true,
    randomization_params: {
      type: 'scalene',
      minSideLength: 100,
      maxSideLength: 250
    },
    validation_config: {
      // Validation will use the generated metadata
      checkAngleSum: true,
      tolerance: 2
    }
  });
\`\`\`

**Other generation functions:**
- \`generateRandomCircle(app, config)\`
- \`generateRandomAngle(app, min, max)\`
- \`generateRandomPolygon(app, sides, config)\`

**Benefits of randomization:**
- ✅ Prevent copying between students
- ✅ Allow unlimited practice attempts
- ✅ Create exercise variants automatically
- ✅ Test understanding vs memorization`;

		toaster.info('Randomization example shown');
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>MathGraph32 Wrapper - Live Examples</Card.Title>
			<Card.Description>
				Interactive examples showing how to use the MathGraph32 TypeScript wrapper for creating geometry exercises.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !mathGraphLoaded}
				<div class="flex items-center justify-center p-8">
					<div class="text-center">
						<div class="mb-4 text-4xl">⏳</div>
						<p class="text-muted-foreground">Loading MathGraph32...</p>
					</div>
				</div>
			{:else}
				<Tabs.Root value="examples" class="w-full">
					<Tabs.List class="grid w-full grid-cols-3">
						<Tabs.Trigger value="examples">Live Examples</Tabs.Trigger>
						<Tabs.Trigger value="validation">Validation</Tabs.Trigger>
						<Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
					</Tabs.List>

					<!-- Live Examples Tab -->
					<Tabs.Content value="examples" class="mt-6">
						<div class="space-y-4">
							<div class="grid gap-3 md:grid-cols-2">
								<Button onclick={createTriangleExample} variant="default">
									🔺 Create Triangle
								</Button>
								<Button onclick={createCircleExample} variant="default">
									⭕ Create Circle
								</Button>
								<Button onclick={createPerpendicularBisectorExample} variant="default">
									📐 Perpendicular Bisector
								</Button>
								<Button onclick={exportFigureExample} variant="outline">
									📦 Export Figure
								</Button>
							</div>

							<!-- Figure Display Area with Fullscreen -->
							<div class="rounded-lg border border-border bg-card p-4">
								<h3 class="mb-3 font-semibold">Interactive Figure (with fullscreen support):</h3>
								<MathGraphFullscreen
									bind:container={figureContainer}
									onFullscreenChange={(isFullscreen) => {
										toaster.info(isFullscreen ? 'Entered fullscreen mode' : 'Exited fullscreen mode');
									}}
								>
									<div class="mb-4 min-h-[400px] rounded border border-dashed border-border bg-muted/20">
										<div class="flex h-[400px] items-center justify-center text-muted-foreground">
											Click a button above to create a figure
										</div>
									</div>
								</MathGraphFullscreen>
								<p class="text-muted-foreground mt-2 text-xs">
									💡 Press <kbd class="rounded bg-muted px-1 py-0.5 text-xs font-semibold">F</kbd> or click the fullscreen icon to toggle fullscreen mode
								</p>
							</div>

							<!-- Output Display -->
							{#if exampleOutput}
								<div class="rounded-lg border border-border bg-muted/50 p-4">
									<h3 class="mb-2 font-semibold">Output:</h3>
									<pre class="whitespace-pre-wrap text-sm font-mono">{exampleOutput}</pre>
								</div>
							{/if}
						</div>
					</Tabs.Content>

					<!-- Validation Tab -->
					<Tabs.Content value="validation" class="mt-6">
						<div class="space-y-4">
							<Button onclick={validationExample} variant="default">
								🔍 Show Validation Example
							</Button>

							{#if currentExample === 'validation' && exampleOutput}
								<div class="rounded-lg border border-border bg-muted/50 p-4">
									<pre class="whitespace-pre-wrap text-sm font-mono">{exampleOutput}</pre>
								</div>
							{/if}

							<Card.Root>
								<Card.Header>
									<Card.Title class="text-base">30+ Validators Available</Card.Title>
								</Card.Header>
								<Card.Content class="space-y-2 text-sm">
									<div class="grid gap-2 md:grid-cols-2">
										<div class="rounded border p-2">
											<strong>Point Validators</strong>
											<ul class="text-muted-foreground ml-4 mt-1 list-disc text-xs">
												<li>validatePointExists</li>
												<li>validatePointOnLine</li>
												<li>validatePointOnCircle</li>
												<li>validatePointIsMidpoint</li>
											</ul>
										</div>
										<div class="rounded border p-2">
											<strong>Line Validators</strong>
											<ul class="text-muted-foreground ml-4 mt-1 list-disc text-xs">
												<li>validateLinesParallel</li>
												<li>validateLinesPerpendicular</li>
												<li>validateLineExists</li>
											</ul>
										</div>
										<div class="rounded border p-2">
											<strong>Angle Validators</strong>
											<ul class="text-muted-foreground ml-4 mt-1 list-disc text-xs">
												<li>validateAngleMeasure</li>
												<li>validateAngleEquals</li>
												<li>validateRightAngle</li>
											</ul>
										</div>
										<div class="rounded border p-2">
											<strong>Distance Validators</strong>
											<ul class="text-muted-foreground ml-4 mt-1 list-disc text-xs">
												<li>validateDistance</li>
												<li>validateSegmentLength</li>
												<li>validateCircleRadius</li>
											</ul>
										</div>
									</div>
									<p class="text-muted-foreground mt-4 text-xs">
										See <strong>GEOMETRY_API_DOCS.md</strong> for complete list and parameters.
									</p>
								</Card.Content>
							</Card.Root>
						</div>
					</Tabs.Content>

					<!-- Advanced Tab -->
					<Tabs.Content value="advanced" class="mt-6">
						<div class="space-y-4">
							<Button onclick={randomizationExample} variant="default">
								🎲 Show Randomization Example
							</Button>

							{#if currentExample === 'randomization' && exampleOutput}
								<div class="rounded-lg border border-border bg-muted/50 p-4">
									<pre class="whitespace-pre-wrap text-sm font-mono">{exampleOutput}</pre>
								</div>
							{/if}

							<div class="grid gap-4 md:grid-cols-2">
								<Card.Root>
									<Card.Header>
										<Card.Title class="text-base">Useful Resources</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-2 text-sm">
										<a
											href="/MATHGRAPH32_API_GUIDE.md"
											target="_blank"
											class="text-primary hover:underline block"
										>
											📘 MATHGRAPH32_API_GUIDE.md
										</a>
										<p class="text-muted-foreground text-xs">
											Complete guide with singleton pattern, common pitfalls, and 6 examples
										</p>

										<a
											href="/GEOMETRY_API_DOCS.md"
											target="_blank"
											class="text-primary hover:underline block mt-3"
										>
											📗 GEOMETRY_API_DOCS.md
										</a>
										<p class="text-muted-foreground text-xs">
											Full API reference with all validators and services
										</p>

										<a
											href="/GEOMETRY_EXAMPLES.md"
											target="_blank"
											class="text-primary hover:underline block mt-3"
										>
											📙 GEOMETRY_EXAMPLES.md
										</a>
										<p class="text-muted-foreground text-xs">
											12 complete exercise examples with full configurations
										</p>

										<a
											href="/demo/geometry"
											target="_blank"
											class="text-primary hover:underline block mt-3"
										>
											🎨 Demo Page
										</a>
										<p class="text-muted-foreground text-xs">
											Interactive showcase of all geometry features
										</p>
									</Card.Content>
								</Card.Root>

								<Card.Root>
									<Card.Header>
										<Card.Title class="text-base">Quick Tips</Card.Title>
									</Card.Header>
									<Card.Content class="space-y-2 text-sm">
										<div class="rounded bg-muted p-2">
											<strong class="text-xs">💡 Always use the singleton:</strong>
											<code class="text-muted-foreground mt-1 block text-xs">
												const service = MathGraphService.getInstance();
											</code>
										</div>

										<div class="rounded bg-muted p-2">
											<strong class="text-xs">💡 Wait for loading:</strong>
											<code class="text-muted-foreground mt-1 block text-xs">
												await service.loadMathGraph();
											</code>
										</div>

										<div class="rounded bg-muted p-2">
											<strong class="text-xs">💡 Always call display():</strong>
											<code class="text-muted-foreground mt-1 block text-xs">
												app.display(); // Render the figure
											</code>
										</div>

										<div class="rounded bg-muted p-2">
											<strong class="text-xs">💡 Use tolerance in validation:</strong>
											<code class="text-muted-foreground mt-1 block text-xs">
												validateAngleMeasure(app, 'angle_A', 90, 2);
											</code>
										</div>
									</Card.Content>
								</Card.Root>
							</div>
						</div>
					</Tabs.Content>
				</Tabs.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
