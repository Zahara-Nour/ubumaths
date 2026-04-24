<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { Ruler, Compass, Pencil, Protractor, SetSquare } from '../instruments/components/index';
	import type { Figure } from '$lib/geometry-core/graph/figure';
	import type { InstrumentState } from '../types';

	interface Props {
		figure: Figure;
		instrumentStates: Map<string, InstrumentState>;
		width?: number;
		height?: number;
		showGrid?: boolean;
		interactive?: boolean;
		class?: string;
	}

	let {
		figure,
		instrumentStates,
		width = 800,
		height = 600,
		showGrid = true,
		interactive = false,
		class: className = ''
	}: Props = $props();

	// Convert instrument states to array for rendering
	let visibleInstruments = $derived([...instrumentStates.values()].filter((s) => s.visible));
</script>

<div class="construction-canvas {className}" style="position: relative; display: inline-block;">
	<!-- Geometry figure layer -->
	<GeometryCanvas {figure} {width} {height} {showGrid} {interactive} />

	<!-- Instruments overlay -->
	{#if visibleInstruments.length > 0}
		<svg
			class="instruments-overlay"
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="position: absolute; top: 0; left: 0; pointer-events: none;"
		>
			{#each visibleInstruments as state (state.type)}
				<g
					transform="translate({state.x}, {state.y}) rotate({state.rotation})"
					opacity={state.opacity}
				>
					{#if state.type === 'ruler'}
						<Ruler x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'compass'}
						<Compass
							x={0}
							y={0}
							rotation={0}
							opening={state.compassRadius ?? 100}
							scale={state.scale}
							visible={true}
						/>
					{:else if state.type === 'pencil'}
						<Pencil x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'protractor'}
						<Protractor x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{:else if state.type === 'setSquare'}
						<SetSquare x={0} y={0} rotation={0} scale={state.scale} visible={true} />
					{/if}
				</g>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.construction-canvas {
		overflow: hidden;
	}
</style>
