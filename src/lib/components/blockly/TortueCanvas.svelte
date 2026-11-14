<!--
  TortueCanvas.svelte

  Quadrillage fixe 20 × 20 (un carreau = une unité de la tortue), tortue au centre au départ.
  Affiche les segments rendus par `executerTortue` ; ce qui sort du cadre est coupé et signalé.
-->
<script lang="ts">
	import {
		DEMI_COTE_CADRE,
		sortDuCadre,
		type EtatTortue,
		type Segment
	} from '$lib/shared/blockly/tortue';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		segments: readonly Segment[];
		tortue: EtatTortue;
	}

	// =============================================================================
	// Constantes
	// =============================================================================

	const MARGE = 0.6;
	const COTE = 2 * DEMI_COTE_CADRE;
	const VUE = `${-DEMI_COTE_CADRE - MARGE} ${-DEMI_COTE_CADRE - MARGE} ${COTE + 2 * MARGE} ${COTE + 2 * MARGE}`;
	const LIGNES = Array.from({ length: COTE + 1 }, (_, i) => i - DEMI_COTE_CADRE);

	// =============================================================================
	// Props
	// =============================================================================

	let { segments, tortue }: Props = $props();

	// =============================================================================
	// État dérivé
	// =============================================================================

	const horsCadre = $derived(sortDuCadre(segments, tortue));
</script>

<figure class="flex flex-col gap-2">
	<svg
		viewBox={VUE}
		class="aspect-square w-full rounded-md border border-border bg-background"
		role="img"
		aria-label="Tracé de la tortue : {segments.length} segment{segments.length > 1 ? 's' : ''}"
	>
		<defs>
			<clipPath id="cadre-tortue">
				<rect x={-DEMI_COTE_CADRE} y={-DEMI_COTE_CADRE} width={COTE} height={COTE} />
			</clipPath>
		</defs>

		<!-- Repère mathématique : y vers le haut -->
		<g transform="scale(1 -1)">
			<g class="stroke-border" stroke-width="0.04">
				{#each LIGNES as k (k)}
					<line x1={k} y1={-DEMI_COTE_CADRE} x2={k} y2={DEMI_COTE_CADRE} />
					<line x1={-DEMI_COTE_CADRE} y1={k} x2={DEMI_COTE_CADRE} y2={k} />
				{/each}
			</g>

			<g clip-path="url(#cadre-tortue)">
				<g class="stroke-primary" stroke-width="0.15" stroke-linecap="round">
					{#each segments as segment, i (i)}
						<line x1={segment.de.x} y1={segment.de.y} x2={segment.a.x} y2={segment.a.y} />
					{/each}
				</g>

				<!-- La tortue : un triangle pointé vers son cap -->
				<polygon
					points="0.5,0 -0.35,0.3 -0.35,-0.3"
					transform="translate({tortue.x} {tortue.y}) rotate({tortue.cap})"
					class={tortue.styloBaisse ? 'fill-foreground' : 'fill-muted-foreground'}
					fill-opacity="0.85"
				/>
			</g>
		</g>
	</svg>

	{#if horsCadre}
		<figcaption class="text-sm text-muted-foreground">
			Le tracé sort du quadrillage : ce qui dépasse est coupé.
		</figcaption>
	{/if}
</figure>
