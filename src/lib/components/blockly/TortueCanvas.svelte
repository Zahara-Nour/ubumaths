<!--
  TortueCanvas.svelte

  Quadrillage fixe 20 × 20 (un carreau = une unité de la tortue), tortue au centre au départ.
  Affiche les segments rendus par `executerTortue` ; ce qui sort du cadre est coupé et signalé.

  Question « programme tortue » (bloc ```tortue) : la figure à reproduire en gris dessous
  (`modele`, `montrer: oui`), le tracé attendu en pointillés après la validation (`attendu`), le
  tracé de l'élève vert ou rouge selon le verdict (`verdict`).

  Sans Blockly : n'importe que `segments.ts` et des types (rendu côté serveur, corrigé, aperçu).
-->
<script lang="ts">
	import { DEMI_COTE_CADRE, sortDuCadre, type Segment } from '$lib/shared/blockly/tortue/segments';
	import type { EtatTortue } from '$lib/shared/blockly/tortue/interpreteur';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		segments: readonly Segment[];
		/** Absente : la tortue n'est pas dessinée (figure seule) */
		tortue?: EtatTortue | null;
		/** Figure à reproduire, en gris sous le tracé */
		modele?: readonly Segment[] | null;
		/** Tracé attendu, en pointillés par-dessus (après la validation) */
		attendu?: readonly Segment[] | null;
		/** Couleur du tracé : vert juste, rouge faux ; null : couleur ordinaire */
		verdict?: boolean | null;
		/** Nom donné par le lecteur d'écran ; par défaut, le nombre de segments */
		label?: string;
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

	let {
		segments,
		tortue = null,
		modele = null,
		attendu = null,
		verdict = null,
		label = undefined
	}: Props = $props();

	/** Plusieurs quadrillages sur une page (fiche, corrigé) : un découpage chacun */
	const uid = $props.id();
	const idCadre = `cadre-tortue-${uid}`;

	// =============================================================================
	// État dérivé
	// =============================================================================

	const horsCadre = $derived(sortDuCadre(segments, tortue ?? { x: 0, y: 0 }));

	const classeTrace = $derived(
		verdict === true ? 'trace-juste' : verdict === false ? 'trace-faux' : 'stroke-primary'
	);

	const nomLu = $derived(
		label ?? `Tracé de la tortue : ${segments.length} segment${segments.length > 1 ? 's' : ''}`
	);
</script>

<figure class="flex flex-col gap-2">
	<svg
		viewBox={VUE}
		class="aspect-square w-full rounded-md border border-border bg-background"
		role="img"
		aria-label={nomLu}
	>
		<defs>
			<clipPath id={idCadre}>
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

			<g clip-path="url(#{idCadre})">
				{#if modele && modele.length > 0}
					<g class="trace-modele" stroke-width="0.35" stroke-linecap="round" data-trace="modele">
						{#each modele as segment, i (i)}
							<line x1={segment.de.x} y1={segment.de.y} x2={segment.a.x} y2={segment.a.y} />
						{/each}
					</g>
				{/if}

				<g class={classeTrace} stroke-width="0.15" stroke-linecap="round" data-trace="eleve">
					{#each segments as segment, i (i)}
						<line x1={segment.de.x} y1={segment.de.y} x2={segment.a.x} y2={segment.a.y} />
					{/each}
				</g>

				{#if attendu && attendu.length > 0}
					<g
						class="stroke-foreground"
						stroke-width="0.1"
						stroke-dasharray="0.3 0.25"
						stroke-linecap="round"
						data-trace="attendu"
					>
						{#each attendu as segment, i (i)}
							<line x1={segment.de.x} y1={segment.de.y} x2={segment.a.x} y2={segment.a.y} />
						{/each}
					</g>
				{/if}

				{#if tortue}
					<!-- La tortue : un triangle pointé vers son cap -->
					<polygon
						points="0.5,0 -0.35,0.3 -0.35,-0.3"
						transform="translate({tortue.x} {tortue.y}) rotate({tortue.cap})"
						class={tortue.styloBaisse ? 'fill-foreground' : 'fill-muted-foreground'}
						fill-opacity="0.85"
					/>
				{/if}
			</g>
		</g>
	</svg>

	{#if horsCadre}
		<figcaption class="text-sm text-muted-foreground">
			Le tracé sort du quadrillage : ce qui dépasse est coupé.
		</figcaption>
	{/if}
</figure>

<style>
	.trace-modele {
		stroke: var(--color-muted-foreground);
		stroke-opacity: 0.35;
	}

	.trace-juste {
		stroke: var(--color-success);
	}

	.trace-faux {
		stroke: var(--color-destructive);
	}
</style>
