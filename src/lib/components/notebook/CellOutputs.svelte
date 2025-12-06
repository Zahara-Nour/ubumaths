<script lang="ts">
	/**
	 * CellOutputs Component
	 *
	 * Renders all outputs for a notebook cell
	 * Supports: stream (stdout/stderr), error, display_data (images, LaTeX, Plotly)
	 */

	import { browser } from '$app/environment';
	import type { CellOutput } from '$lib/types/notebook';
	import 'mathlive';

	// Props
	let {
		outputs = [] as CellOutput[]
	}: {
		outputs?: CellOutput[];
	} = $props();

	// Plotly state
	let plotlyContainers = $state<Map<number, HTMLDivElement>>(new Map());
	let plotlyLoaded = $state(false);

	// Svelte action to store Plotly container refs
	function setPlotlyContainer(node: HTMLDivElement, index: number) {
		plotlyContainers.set(index, node);
		return {
			destroy() {
				plotlyContainers.delete(index);
			}
		};
	}

	// Lazy load Plotly when needed
	$effect(() => {
		const hasPlotly = outputs.some(
			(out) =>
				(out.output_type === 'display_data' || out.output_type === 'execute_result') &&
				out.data['application/json']
		);

		if (hasPlotly && !plotlyLoaded && browser) {
			// Check if Plotly already loaded
			if ((window as Window & { Plotly?: unknown }).Plotly) {
				plotlyLoaded = true;
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
			script.onload = () => {
				plotlyLoaded = true;
			};
			script.onerror = () => {
				console.error('[CellOutputs] Failed to load Plotly');
			};
			document.head.appendChild(script);
		}
	});

	// Plotly interface
	interface PlotlyInstance {
		newPlot: (el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown) => void;
		purge: (el: HTMLElement) => void;
	}

	// Render Plotly charts
	$effect(() => {
		if (!plotlyLoaded || !browser) return;

		const Plotly = (window as Window & { Plotly?: PlotlyInstance }).Plotly;
		if (!Plotly) return;

		outputs.forEach((output, index) => {
			if (
				(output.output_type === 'display_data' || output.output_type === 'execute_result') &&
				output.data['application/json']
			) {
				const container = plotlyContainers.get(index);
				if (container) {
					try {
						const spec = JSON.parse(output.data['application/json']!);
						Plotly.newPlot(container, spec.data, spec.layout, {
							responsive: true,
							displayModeBar: true
						});
					} catch (e) {
						console.error('[CellOutputs] Plotly render error:', e);
					}
				}
			}
		});

		// Cleanup on unmount
		return () => {
			const PlotlyCleanup = (window as Window & { Plotly?: PlotlyInstance }).Plotly;
			if (PlotlyCleanup) {
				plotlyContainers.forEach((container) => {
					PlotlyCleanup.purge(container);
				});
			}
		};
	});
</script>

{#if outputs.length === 0}
	<!-- No outputs -->
{:else}
	<div class="flex flex-col gap-3 border-l-2 border-border pl-3">
		{#each outputs as output, index (index)}
			{#if output.output_type === 'stream'}
				<div>
					<div class="mb-1 text-xs font-medium text-muted-foreground">
						{output.name}
					</div>
					<pre
						class="rounded bg-muted p-3 font-mono text-sm whitespace-pre-wrap {output.name ===
						'stderr'
							? 'text-destructive'
							: 'text-foreground'}">{output.text}</pre>
				</div>
			{:else if output.output_type === 'error'}
				<div>
					<div class="mb-1 text-xs font-medium text-destructive">
						{output.ename}: {output.evalue}
					</div>
					<pre
						class="rounded bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">{output.traceback.join(
							'\n'
						)}</pre>
				</div>
			{:else if output.output_type === 'display_data' || output.output_type === 'execute_result'}
				{#if output.data['image/png']}
					<!-- PNG image -->
					<div class="rounded border border-border bg-white p-2">
						<img
							src="data:image/png;base64,{output.data['image/png']}"
							alt="Output graphique"
							class="max-w-full"
						/>
					</div>
				{:else if output.data['text/plain']}
					<!-- LaTeX or plain text -->
					<div class="rounded bg-muted p-3">
						<math-span class="block text-base">{output.data['text/plain']}</math-span>
					</div>
				{:else if output.data['application/json']}
					<!-- Plotly interactive chart -->
					<div>
						<div class="mb-1 text-xs font-medium text-muted-foreground">
							Graphique interactif (Plotly)
						</div>
						{#if !plotlyLoaded}
							<div class="flex items-center gap-2 py-4">
								<div
									class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
								></div>
								<span class="text-sm text-muted-foreground">Chargement...</span>
							</div>
						{/if}
						<div
							use:setPlotlyContainer={index}
							class="min-h-[300px] rounded border border-border bg-white"
							class:hidden={!plotlyLoaded}
						></div>
					</div>
				{:else if output.data['text/html']}
					<!-- HTML output (not commonly used, but supported) -->
					<div class="rounded border border-border bg-muted p-3">
						{@html output.data['text/html']}
					</div>
				{/if}
			{/if}
		{/each}
	</div>
{/if}
