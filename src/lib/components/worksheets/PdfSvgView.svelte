<!--
	PdfSvgView — l'aperçu d'un PDF compilé par Typst, rendu en SVG
	===============================================================
	La vue de `PdfPreview` (page de la fiche, cahier public), partagée avec les
	copies par élève d'une affectation (lot 5) : le SVG mis à la largeur du
	cadre, un voile pendant la génération, un message tant que rien n'est rendu.
-->
<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { FileText, Loader2 } from '@lucide/svelte';

	interface Props {
		/** Le SVG rendu par le compilateur ; vide : rien encore */
		svg: string;
		/** Génération en cours : voile et message */
		generating?: boolean;
		generatingMessage?: string;
		/** Ce que dit le cadre tant qu'aucun aperçu n'est rendu */
		emptyMessage?: string;
	}

	let {
		svg,
		generating = false,
		generatingMessage = 'Generation du PDF...',
		emptyMessage = 'Cliquez sur "Rafraichir" pour generer un apercu'
	}: Props = $props();

	/**
	 * Le SVG à la largeur du cadre (le compilateur le rend à la taille de la
	 * page) ; refait à chaque nouveau SVG
	 */
	function fitWidth(content: string): Attachment<HTMLDivElement> {
		return (target) => {
			if (!content) return;
			const timer = setTimeout(() => {
				const width = target.clientWidth - 40;
				for (const svgElem of target.querySelectorAll(':scope > svg')) {
					const svgWidth = Number.parseFloat(svgElem.getAttribute('width') || '0');
					const svgHeight = Number.parseFloat(svgElem.getAttribute('height') || '0');
					// Seulement si les dimensions sont connues
					if (svgWidth > 0 && svgHeight > 0 && width > 0) {
						svgElem.setAttribute('width', String(width));
						svgElem.setAttribute('height', String((svgHeight * width) / svgWidth));
					}
				}
			}, 50);
			return () => clearTimeout(timer);
		};
	}
</script>

<div class="relative">
	{#if generating}
		<div
			class="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<div class="space-y-2 text-center">
				<Loader2 class="mx-auto h-8 w-8 animate-spin text-primary" />
				<p class="text-sm text-muted-foreground">{generatingMessage}</p>
			</div>
		</div>
	{/if}

	{#if svg}
		<div
			{@attach fitWidth(svg)}
			id="pdf-svg-preview"
			class="min-h-[400px] overflow-auto rounded-lg border border-border bg-white p-5"
		>
			<!-- SVG produit par le compilateur Typst depuis notre propre source, où tout texte
			venu de la base (énoncés, noms) est échappé (`escapeTypst`) -->
			{@html svg}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5 p-12">
			<div class="space-y-3 text-center">
				<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
				<p class="text-muted-foreground">{emptyMessage}</p>
			</div>
		</div>
	{/if}
</div>
