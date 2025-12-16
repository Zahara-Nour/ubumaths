<script lang="ts">
	/**
	 * ExportButton Component
	 *
	 * Dropdown button for exporting the graph as SVG or PNG.
	 * Supports multiple resolution options for PNG export.
	 *
	 * @component
	 */

	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Download, FileCode, Image } from 'lucide-svelte';
	import { exportSvg, exportPng } from '$lib/grapheur/export';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Props
	let {
		svgRef,
		width,
		height
	}: {
		svgRef: SVGSVGElement | undefined;
		width: number;
		height: number;
	} = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Whether an export is in progress */
	let isExporting = $state(false);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	/**
	 * Export as SVG
	 */
	function handleExportSvg(): void {
		if (!svgRef) {
			toaster.error("Impossible d'exporter : graphique non disponible");
			return;
		}

		try {
			exportSvg(svgRef, width, height);
			toaster.success('Graphique exporté en SVG');
		} catch (error) {
			console.error('SVG export failed:', error);
			toaster.error("Échec de l'exportation SVG");
		}
	}

	/**
	 * Export as PNG at given scale
	 */
	async function handleExportPng(scale: 1 | 2 | 3): Promise<void> {
		if (!svgRef) {
			toaster.error("Impossible d'exporter : graphique non disponible");
			return;
		}

		if (isExporting) return;

		isExporting = true;
		try {
			await exportPng(svgRef, width, height, scale);
			const label = scale === 1 ? '' : ` ${scale}x`;
			toaster.success(`Graphique exporté en PNG${label}`);
		} catch (error) {
			console.error('PNG export failed:', error);
			toaster.error("Échec de l'exportation PNG");
		} finally {
			isExporting = false;
		}
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger disabled={!svgRef || isExporting}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				size="icon"
				title="Exporter le graphique"
				aria-label="Exporter le graphique"
			>
				<Download class="h-4 w-4" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Item onclick={handleExportSvg}>
			<FileCode class="mr-2 h-4 w-4" />
			SVG (vectoriel)
		</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item onclick={() => handleExportPng(1)}>
			<Image class="mr-2 h-4 w-4" />
			PNG
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => handleExportPng(2)}>
			<Image class="mr-2 h-4 w-4" />
			PNG HD (2x)
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
