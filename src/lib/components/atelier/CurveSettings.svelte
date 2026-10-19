<script lang="ts">
	/**
	 * « Sur le graphique » : les réglages de la courbe d'une fonction tracée.
	 *
	 * Phase 0 `/grapheur` §1 S1 à S5 — le panneau du grapheur, réglage par
	 * réglage, moins la case « f′ » (Q1 : « Dériver » la remplace).
	 *
	 * ⚠️ Les réglages s'écrivent dans l'ATELIER (`setDisplay`), jamais dans le
	 * grapheur : celui-ci n'en reçoit qu'une copie (`plot-sync`) et un réglage
	 * écrit chez lui serait écrasé. Les nombres affichés, eux, sont calculés sur
	 * la courbe DESSINÉE (`curveOf`) : ce qu'on lit est ce qu'on voit.
	 *
	 * Un réglage n'est pas une action : il n'écrit rien dans Calcul (S5).
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { areaRefusal, tangentRefusal } from '$lib/atelier/interval';
	import { useGrapheurStore } from '$lib/stores/grapheur-context';
	import { curveOf } from '$lib/atelier/plot-sync';
	import type { CurveDisplay, FunctionObject } from '$lib/atelier/types';
	import { isFunction } from '$lib/atelier/types';
	import type { LineStyle } from '$lib/grapheur/types';
	import { arcLengthBetween, curvatureAt, integralUnder, tangentAt } from '$lib/grapheur/analysis';
	import { fromSliderIndex, SLIDER_STEPS, toSliderIndex } from '$lib/grapheur/slider';
	import ColorPicker from '$lib/components/grapheur/ColorPicker.svelte';
	import LineWidthPicker from '$lib/components/grapheur/LineWidthPicker.svelte';
	import LineStylePicker from '$lib/components/grapheur/LineStylePicker.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Slider } from '$lib/components/ui/slider';
	import { isCurveColor } from '$lib/grapheur/colors';
	import { Input } from '$lib/components/ui/input';
	import { integralToggle, tangentToggle } from '$lib/atelier/curve-toggles';
	import { gestureHandlers } from '$lib/atelier/gesture';

	interface Props {
		object: FunctionObject;
		display: CurveDisplay;
		/**
		 * La carte d'une fonction (lot 3 de la refonte) règle couleur et trait par
		 * son point, tangente et aire par son menu : il ne reste ici que ce qu'on
		 * LIT — le point de tangence, les bornes, les nombres.
		 */
		compact?: boolean;
	}

	let { object, display, compact = false }: Props = $props();

	const atelier = useAtelier();
	const graph = useGrapheurStore();

	/**
	 * La courbe dessinée pour cet objet — en lecture seule.
	 *
	 * ⚠️ `curveOf` lit une table NON réactive : quand la courbe n'y est pas
	 * encore (retirée puis retracée), il rend la main sans rien lire du
	 * grapheur, et le `$derived` ne se recalculait jamais — la carte restait sur
	 * « pente non définie » (revue du lot 2b). Lire `functions` l'abonne à la pose.
	 */
	const curve = $derived.by(() => {
		void graph.functions;
		return curveOf(atelier, graph, object.name);
	});

	/**
	 * Quatre chiffres significatifs, comme le grapheur, mais avec la virgule :
	 * la carte est en français (règle d'affichage des décimaux, #448).
	 */
	const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
		maximumSignificantDigits: 4,
		useGrouping: false
	});
	function formatNumber(n: number): string {
		if (!Number.isFinite(n)) return '—';
		return NUMBER_FORMAT.format(n);
	}

	/** Pourquoi la dernière borne saisie n'a pas été retenue. */
	let boundRefusal = $state<{ edge: 'from' | 'to'; message: string } | null>(null);

	function update(patch: Partial<CurveDisplay>) {
		atelier.setDisplay(object.name, patch);
	}

	// Les valeurs de l'atelier sont DÉJÀ substituées dans la courbe posée
	// (`plot-sync`) : aucun paramètre à lier ici.
	// Décision f : hors de l'ensemble de la fonction, ni tangente ni aire (une
	// borne fermée est dedans) — le refus se lit ici, où l'élève règle
	const tangentRefused = $derived(
		display.tangentAt === null ? null : tangentRefusal(object, display.tangentAt)
	);
	const areaRefused = $derived(
		display.integral === null
			? null
			: areaRefusal(object, display.integral.from, display.integral.to)
	);
	const tangent = $derived(
		curve && display.tangentAt !== null && tangentRefused === null
			? tangentAt(curve, display.tangentAt)
			: undefined
	);
	const curvature = $derived(
		curve && display.tangentAt !== null && display.showOsculating && tangentRefused === null
			? curvatureAt(curve, display.tangentAt)
			: undefined
	);
	const area = $derived(
		curve && display.integral && areaRefused === null
			? integralUnder(curve, display.integral.from, display.integral.to)
			: undefined
	);
	const length = $derived(
		curve && display.integral && display.showArcLength && areaRefused === null
			? arcLengthBetween(curve, display.integral.from, display.integral.to)
			: undefined
	);

	/** La tangente part du milieu de la fenêtre visible, comme dans le grapheur. */
	function handleTangentChange(checked: boolean | 'indeterminate') {
		update(tangentToggle(checked === true, graph.viewport));
	}

	/**
	 * Tout un glissé de la tangente = UNE étape d'Annuler (lot 5, PR 2 ; revue de
	 * #1517 : 150 crans faisaient 100 étapes et chassaient une suppression).
	 */
	const tangentGesture = gestureHandlers(() => atelier.endGesture());

	function handleTangentSlide(index: number) {
		const { xMin, xMax } = graph.viewport;
		atelier.setDisplay(
			object.name,
			{ tangentAt: fromSliderIndex(index, xMin, xMax) },
			`tangente:${object.name}`
		);
	}

	/** Bornes par défaut : la moitié centrale de la fenêtre visible. */
	function handleIntegralChange(checked: boolean | 'indeterminate') {
		update(integralToggle(checked === true, graph.viewport));
	}

	function handleBoundInput(edge: 'from' | 'to') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const parsed = Number.parseFloat(event.currentTarget.value);
			// ⚠️ L'état COURANT de l'atelier, pas la prop : deux bornes modifiées
			// coup sur coup lisaient sinon la première avant sa mise à jour, et la
			// seconde écriture effaçait la première (mesuré par le test)
			const current = atelier.get(object.name);
			const integral = current && isFunction(current) ? current.display?.integral : null;
			if (!Number.isFinite(parsed) || !integral) return;
			// Une frappe par écriture, UNE étape par champ quitté (lot 5, PR 2)
			const result = atelier.setDisplay(
				object.name,
				{ integral: { ...integral, [edge]: parsed } },
				`borne-${edge}:${object.name}`
			);
			// Refusée (au-delà de ±1e9) : on le DIT — sinon le champ contredit l'aire
			boundRefusal = result.ok
				? null
				: {
						edge,
						message: 'Cette borne est trop grande : l’aire reste calculée sur la précédente.'
					};
		};
	}

	/**
	 * Quand on quitte le champ, il reprend la valeur RETENUE : une saisie vide,
	 * « - » ou refusée ne doit pas rester affichée à côté d'une aire qui ne la
	 * prend pas en compte.
	 */
	function handleBoundChange(edge: 'from' | 'to') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			atelier.endGesture();
			const current = atelier.get(object.name);
			const integral = current && isFunction(current) ? current.display?.integral : null;
			if (integral) event.currentTarget.value = String(integral[edge]);
			if (boundRefusal?.edge === edge) boundRefusal = null;
		};
	}

	/** Ce que le curseur annonce : l'abscisse et la pente, pas un numéro de cran. */
	const sliderValueText = $derived(
		display.tangentAt === null
			? ''
			: `x₀ = ${formatNumber(display.tangentAt)}` +
					(tangent ? `, pente ${formatNumber(tangent.slope)}` : '')
	);

	let sliderZone = $state<HTMLElement>();

	// ⚠️ Le curseur partagé (`ui/slider`) ne transmet rien à son pouce : on pose
	// `aria-valuetext` sur l'élément `role="slider"` qu'il rend. Effet de bord
	// DOM, d'où l'`$effect`.
	$effect(() => {
		const thumb = sliderZone?.querySelector('[role="slider"]');
		if (!thumb) return;
		thumb.setAttribute('aria-valuetext', sliderValueText);
		// Le nom aussi : l'aria-label du `<Slider>` reste sur sa racine, sans rôle
		// (revue a11y du lot 4, même défaut qu'ici)
		thumb.setAttribute('aria-label', 'Abscisse du point de tangence');
	});
</script>

<section class="reglages" class:compact aria-label={`Sur le graphique : ${object.name}`}>
	{#if !compact}
		<!-- Pas de titre de section (h3) : le panneau n'a pas de h2, l'ordre sauterait -->
		<p class="titre">Sur le graphique</p>

		<div class="ligne">
			<ColorPicker
				value={display.color}
				onchange={(color) => {
					if (isCurveColor(color)) update({ color });
				}}
			/>
			<LineWidthPicker value={display.lineWidth} onchange={(lineWidth) => update({ lineWidth })} />
			<LineStylePicker
				value={display.lineStyle}
				onchange={(lineStyle: LineStyle) => update({ lineStyle })}
			/>
		</div>

		<div class="ligne">
			<MyCheckbox
				checked={display.tangentAt !== null}
				onCheckedChange={handleTangentChange}
				label="tangente"
				aria-label="Afficher la tangente"
			/>
			<MyCheckbox
				checked={display.integral !== null}
				onCheckedChange={handleIntegralChange}
				label="aire"
				aria-label="Afficher l’aire sous la courbe"
			/>
		</div>
	{/if}

	{#if display.tangentAt !== null}
		<div class="encadre">
			<!-- Les touches arrivent du pouce (`role="slider"`), seul élément interactif :
			     le conteneur ne fait qu'apprendre la fin du geste (Annuler, lot 5 PR 2) -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="ligne curseur"
				role="group"
				bind:this={sliderZone}
				onkeydowncapture={tangentGesture.keydown}
				onkeyup={tangentGesture.keyup}
				onfocusout={tangentGesture.focusout}
			>
				<span class="symbole">x₀</span>
				<!--
					Curseur piloté en entiers, comme dans le grapheur : bits-ui compare la
					valeur aux crans permis avec `===`, et un pas flottant n'en produit
					aucun qui corresponde — le pouce repartait en arrière.
				-->
				<Slider
					class="flex-1"
					type="single"
					bind:value={
						() =>
							toSliderIndex(
								display.tangentAt ?? graph.viewport.xMin,
								graph.viewport.xMin,
								graph.viewport.xMax
							),
						handleTangentSlide
					}
					onValueCommit={tangentGesture.commit}
					min={0}
					max={SLIDER_STEPS}
					step={1}
					aria-label="Abscisse du point de tangence"
				/>
				<!-- Largeur fixe : un nombre qui change de largeur fait reculer le curseur -->
				<span class="nombre fixe">{formatNumber(display.tangentAt)}</span>
			</div>
			<p class="refus refus-tangente" role="alert">{tangentRefused ?? ''}</p>
			<div class="ligne">
				<span class="nombre pente">
					{#if tangentRefused !== null}
						pas de tangente
					{:else if tangent}
						f′(x₀) = {formatNumber(tangent.slope)}
					{:else}
						pente non définie
					{/if}
				</span>
				<MyCheckbox
					checked={display.showOsculating}
					onCheckedChange={(checked) => update({ showOsculating: checked === true })}
					label="cercle osculateur"
					aria-label="Afficher le cercle osculateur"
				/>
				{#if display.showOsculating}
					<span class="nombre courbure">
						κ = {curvature === undefined ? '—' : formatNumber(curvature)}
					</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- L'aire est SIGNÉE : sous l'axe elle compte négativement, ce qu'un remplissage ne dit pas -->
	{#if display.integral}
		<div class="encadre">
			<!-- Le nom de chaque champ COMMENCE par le mot visible (« de », « à ») :
			     une commande vocale qui le dit atteint le champ (WCAG 2.5.3) -->
			<div class="ligne" role="group" aria-label="Bornes de l’aire">
				<span class="symbole" aria-hidden="true">de</span>
				<Input
					type="number"
					step="any"
					value={display.integral.from}
					oninput={handleBoundInput('from')}
					onchange={handleBoundChange('from')}
					class="h-8 w-20 text-sm"
					aria-label="de, borne inférieure de l’aire"
					aria-invalid={boundRefusal?.edge === 'from'}
				/>
				<span class="symbole" aria-hidden="true">à</span>
				<Input
					type="number"
					step="any"
					value={display.integral.to}
					oninput={handleBoundInput('to')}
					onchange={handleBoundChange('to')}
					class="h-8 w-20 text-sm"
					aria-label="à, borne supérieure de l’aire"
					aria-invalid={boundRefusal?.edge === 'to'}
				/>
			</div>
			<p class="refus" role="alert">{boundRefusal?.message ?? areaRefused ?? ''}</p>
			<div class="ligne">
				<span class="nombre aire">aire = {area ? formatNumber(area.value) : '—'}</span>
				<MyCheckbox
					checked={display.showArcLength}
					onCheckedChange={(checked) => update({ showArcLength: checked === true })}
					label="longueur"
					aria-label="Afficher la longueur de la courbe"
				/>
				{#if display.showArcLength}
					<span class="nombre longueur">
						longueur = {length === undefined ? '—' : formatNumber(length)}
					</span>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.reglages {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding-top: 0.375rem;
		border-top: 1px solid var(--color-border);
	}
	/* Sous la ligne d'une carte de fonction : pas de filet, la carte encadre déjà */
	.reglages.compact {
		padding-top: 0;
		border-top: none;
	}
	.refus {
		margin: 0;
		font-size: 0.75rem;
		color: var(--color-destructive);
	}
	.refus:empty {
		visibility: hidden;
		height: 0;
	}
	.titre {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted-foreground);
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.75rem;
		/* Lisible en projection (audit a11y du lot 2b) */
		font-size: 0.8125rem;
	}
	.encadre {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.375rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-muted);
	}
	.symbole {
		flex-shrink: 0;
		font-family: var(--font-serif, serif);
	}
	.nombre {
		font-family: var(--font-serif, serif);
		font-variant-numeric: tabular-nums;
	}
	.fixe {
		width: 4rem;
		flex-shrink: 0;
		text-align: right;
	}
</style>
