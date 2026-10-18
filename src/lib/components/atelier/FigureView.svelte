<script lang="ts">
	/**
	 * La vue Figure (géométrie v2, lot 1, PR 2) : les points et les courbes de
	 * l'atelier dans un repère orthonormé (`GeometryCanvas` de `geometry-core`).
	 *
	 * ⚠️ Une PROJECTION (invariant 1) : la vue ne détient aucun état de modèle.
	 * Elle lit l'atelier par `useAtelier()` et le reflète par `syncFigure`, à
	 * sens unique. Rien ne s'y glisse au lot 1 (F4) : zoom et déplacement de la
	 * vue seulement ; un point bouge par son curseur ou sa carte.
	 *
	 * Le repère est orthonormé par construction (F2) : la toile n'a qu'un
	 * `pixelsPerUnit`, jamais un par axe — c'est ce qui garde le cercle rond, et
	 * la raison de ne pas fusionner avec le grapheur (décision figée n° 3).
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { AtelierFigure, syncFigure } from '$lib/atelier/figure-sync';
	import { isFigureObject } from '$lib/atelier/types';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	/** Unités visibles sur le plus petit côté de la toile, à l'ouverture (de −6,5 à 6,5). */
	const UNITS_ACROSS = 13;

	const atelier = useAtelier();

	// La figure se refait depuis l'atelier : elle appartient à la vue, pas au modèle
	const projection = new AtelierFigure();

	/**
	 * La figure en accord avec l'atelier, à chaque révision. `syncFigure` est
	 * idempotente et n'écrit dans aucun état réactif (seulement dans
	 * `projection`, un objet ordinaire) : un `$derived` suffit, sans effet.
	 * Glisser un curseur ne refait pas la figure (`moveSlider`) : `changes`
	 * avance, et la toile se redessine.
	 */
	const synced = $derived.by(() => {
		void atelier.revision;
		syncFigure(atelier, projection);
		return { figure: projection.figure, version: projection.changes };
	});

	/** La taille de la toile, mesurée : elle suit la largeur de l'écran (téléphone). */
	let width = $state(0);
	let height = $state(0);

	/** F1 : un atelier sans point ni courbe — la vue dit quoi écrire. */
	const empty = $derived(!atelier.objects.some(isFigureObject));
</script>

<section class="figure" aria-label="Figure">
	<div class="barre-figure">
		<MyCheckbox
			bind:checked={() => atelier.figureFrame, (shown) => atelier.setFigureFrame(shown)}
			label="Repère"
		/>
	</div>
	{#if empty}
		<p class="vide">Écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2.</p>
	{/if}
	<div class="toile" bind:clientWidth={width} bind:clientHeight={height}>
		{#if width > 0 && height > 0}
			<!-- Hors du flux : la toile ne fait pas grandir la boîte qu'on mesure -->
			<div class="cadre">
				<GeometryCanvas
					figure={synced.figure}
					externalVersion={synced.version}
					width={Math.floor(width)}
					height={Math.floor(height)}
					pixelsPerUnit={Math.min(width, height) / UNITS_ACROSS}
					objectsMovable={false}
					showGrid={atelier.figureFrame}
					showGraduations={atelier.figureFrame}
				/>
			</div>
		{/if}
	</div>
</section>

<style>
	.figure {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		min-height: 0;
	}
	.barre-figure {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
	}
	.vide {
		margin: 0;
		padding: 0 0.75rem 0.5rem;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}
	.toile {
		position: relative;
		flex: 1;
		/* Sur un téléphone, la vue passe sous le panneau : une toile toujours utilisable */
		min-height: 18rem;
		overflow: hidden;
	}
	.cadre {
		position: absolute;
		inset: 0;
	}
</style>
