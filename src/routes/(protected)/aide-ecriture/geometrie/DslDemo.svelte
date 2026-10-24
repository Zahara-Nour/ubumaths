<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';
	import type { Figure } from '$lib/geometry-core/graph/figure';

	interface Props {
		dsl: string;
		title?: string;
		description?: string;
		center?: { x: number; y: number };
		pixelsPerUnit?: number;
		width?: number;
		height?: number;
		interactive?: boolean;
		renderMode?: 'normal' | 'rough' | 'mixed';
		figure?: Figure;
	}

	let {
		dsl,
		title,
		description,
		center = { x: 0, y: 0 },
		pixelsPerUnit = 40,
		width = 600,
		height = 450,
		interactive = true,
		renderMode,
		figure
	}: Props = $props();

	const fig = $derived(figure ?? runDsl(dsl).figure);
</script>

<section class="space-y-3">
	{#if title}
		<h2 class="text-xl font-bold">{title}</h2>
	{/if}
	{#if description}
		<p class="text-muted-foreground">{description}</p>
	{/if}

	<div class="flex flex-col gap-4 xl:flex-row">
		<div class="min-w-0 shrink-0">
			<GeometryCanvas
				figure={fig}
				{center}
				{pixelsPerUnit}
				{width}
				{height}
				{interactive}
				{renderMode}
			/>
		</div>

		<div class="min-w-0 flex-1">
			<span class="mb-1 block text-xs font-medium text-muted-foreground">Code DSL</span>
			<pre
				class="max-h-[28rem] overflow-auto rounded-md border bg-muted/50 p-3 font-mono text-[13px] leading-relaxed"><code
					>{dsl.trim()}</code
				></pre>
		</div>
	</div>
</section>
