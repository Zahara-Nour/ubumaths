<script lang="ts">
	/**
	 * La vue Géométrie (géométrie v2, lot 1 ; onglet « Géométrie » depuis la Q5
	 * révisée, identifiants `Figure*` gardés) : les points, les courbes et les
	 * fonctions affichées (𝒞f, K1) de l'atelier dans un repère orthonormé
	 * (`GeometryCanvas` de `geometry-core`).
	 *
	 * ⚠️ Une PROJECTION (invariant 1) : la vue ne détient aucun état de modèle.
	 * Elle lit l'atelier par `useAtelier()` et le reflète par `syncFigure`, à
	 * sens unique. Le glisser d'un point (lot 3, M1) ne la contredit pas : la
	 * toile le DÉLÈGUE (`pointDrag`), l'atelier réécrit la définition du point et
	 * la figure suit, comme pour un curseur. Une étape par glisser (M7).
	 *
	 * Le repère est orthonormé par construction (F2) : la toile n'a qu'un
	 * `pixelsPerUnit`, jamais un par axe — c'est ce qui garde le cercle rond, et
	 * la raison de ne pas fusionner avec le grapheur (décision figée n° 3).
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { AtelierFigure, syncFigure } from '$lib/atelier/figure-sync';
	import { isFigureObject, isFunction } from '$lib/atelier/types';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import type { PointDrag } from '$lib/components/geometry/point-drag';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	/** Unités visibles sur le plus petit côté de la toile, à l'ouverture (de −6,5 à 6,5). */
	const UNITS_ACROSS = 13;

	const atelier = useAtelier();

	// La figure se refait depuis l'atelier : elle appartient à la vue, pas au modèle
	const projection = new AtelierFigure();

	syncFigure(atelier, projection);

	/** La figure montrée, et son numéro de version pour la toile. */
	let synced = $state.raw({ figure: projection.figure, version: projection.changes });

	// Comme `syncPlots` dans `AtelierContainer` : l'effet synchronise à chaque
	// révision. Il n'écrit `synced` que si la figure a changé, et ne lit pas ce
	// qu'il écrit ; `syncFigure` est idempotente — l'effet ne boucle pas. Glisser
	// un curseur ne refait pas la figure (`moveSlider`) : `changes` avance, et la
	// toile se redessine
	$effect(() => {
		void atelier.revision;
		if (syncFigure(atelier, projection) === 'unchanged') return;
		synced = { figure: projection.figure, version: projection.changes };
	});

	/** Le point saisi à la souris, pendant un glisser. */
	let held: string | null = null;
	/** Pourquoi le dernier point visé ne se glisse pas (M2) : dit sous la barre. */
	let refusal = $state<string | null>(null);

	/** Les refus du glisser, relus à chaque révision : la toile les demande à chaque dessin. */
	let refusals = new Map<string, string | null>();
	let refusalsRevision = -1;

	function refusalOf(name: string): string | null {
		if (refusalsRevision !== atelier.revision) {
			refusals = new Map();
			refusalsRevision = atelier.revision;
		}
		if (!refusals.has(name)) refusals.set(name, atelier.dragRefusal(name));
		return refusals.get(name) ?? null;
	}

	const pointDrag: PointDrag = {
		canGrab: (id) => {
			const name = projection.nameOf(id);
			return name !== undefined && refusalOf(name) === null;
		},
		grab: (id) => {
			const name = projection.nameOf(id);
			if (name === undefined) return false;
			refusal = refusalOf(name);
			if (refusal !== null) return false;
			held = name;
			return true;
		},
		move: (x, y, snap) => {
			if (held === null) return;
			const done = atelier.dragPoint(held, x, y, snap);
			if (!done.ok) refusal = done.message;
		},
		release: () => {
			held = null;
			atelier.endGesture();
		}
	};

	/** La taille de la toile, mesurée : elle suit la largeur de l'écran (téléphone). */
	let width = $state(0);
	let height = $state(0);

	/**
	 * F1 : un atelier sans point, ni courbe, ni fonction affichée — la vue dit quoi
	 * écrire. Une fonction affichée ne compte que si elle se dessine (`ok`) : en
	 * attente ou en erreur, la vue resterait vide sans le dire (revue de la PR 3).
	 */
	const empty = $derived(
		!atelier.objects.some(
			(o) => isFigureObject(o) || (isFunction(o) && o.inFigure === true && o.status === 'ok')
		)
	);
</script>

<section class="figure" aria-label="Géométrie">
	<div class="barre-figure">
		<MyCheckbox
			bind:checked={() => atelier.figureFrame, (shown) => atelier.setFigureFrame(shown)}
			label="Repère"
		/>
		<p class="refus" role="status">{refusal ?? ''}</p>
	</div>
	{#if empty}
		<p class="vide">
			Dans la console, écris un point A = (1 ; 2) ou une courbe d : y = 3x − 2, ou affiche une
			fonction depuis sa carte.
		</p>
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
					{pointDrag}
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
	.refus {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
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
