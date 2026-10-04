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

	interface Props {
		object: FunctionObject;
		display: CurveDisplay;
	}

	let { object, display }: Props = $props();

	const atelier = useAtelier();
	const graph = useGrapheurStore();

	/** La courbe dessinée pour cet objet — en lecture seule. */
	const curve = $derived(curveOf(atelier, graph, object.name));

	/** Quatre chiffres significatifs, comme le grapheur : assez pour lire, court à afficher. */
	function formatNumber(n: number): string {
		if (!Number.isFinite(n)) return '—';
		return Number.parseFloat(n.toPrecision(4)).toString();
	}

	function round(n: number): number {
		return Math.round(n * 100) / 100;
	}

	function update(patch: Partial<CurveDisplay>) {
		atelier.setDisplay(object.name, patch);
	}

	// Les valeurs de l'atelier sont DÉJÀ substituées dans la courbe posée
	// (`plot-sync`) : aucun paramètre à lier ici.
	const tangent = $derived(
		curve && display.tangentAt !== null ? tangentAt(curve, display.tangentAt) : undefined
	);
	const curvature = $derived(
		curve && display.tangentAt !== null && display.showOsculating
			? curvatureAt(curve, display.tangentAt)
			: undefined
	);
	const area = $derived(
		curve && display.integral
			? integralUnder(curve, display.integral.from, display.integral.to)
			: undefined
	);
	const length = $derived(
		curve && display.integral && display.showArcLength
			? arcLengthBetween(curve, display.integral.from, display.integral.to)
			: undefined
	);

	/** La tangente part du milieu de la fenêtre visible, comme dans le grapheur. */
	function handleTangentChange(checked: boolean | 'indeterminate') {
		const { xMin, xMax } = graph.viewport;
		update({ tangentAt: checked === true ? round((xMin + xMax) / 2) : null });
	}

	function handleTangentSlide(index: number) {
		const { xMin, xMax } = graph.viewport;
		update({ tangentAt: fromSliderIndex(index, xMin, xMax) });
	}

	/** Bornes par défaut : la moitié centrale de la fenêtre visible. */
	function handleIntegralChange(checked: boolean | 'indeterminate') {
		const { xMin, xMax } = graph.viewport;
		const quarter = (xMax - xMin) / 4;
		update({
			integral: checked === true ? { from: round(xMin + quarter), to: round(xMax - quarter) } : null
		});
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
			update({ integral: { ...integral, [edge]: parsed } });
		};
	}
</script>

<section class="reglages" aria-label={`Sur le graphique : ${object.name}`}>
	<h3 class="titre">Sur le graphique</h3>

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

	{#if display.tangentAt !== null}
		<div class="encadre">
			<div class="ligne">
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
					min={0}
					max={SLIDER_STEPS}
					step={1}
					aria-label="Abscisse du point de tangence"
				/>
				<!-- Largeur fixe : un nombre qui change de largeur fait reculer le curseur -->
				<span class="nombre fixe">{formatNumber(display.tangentAt)}</span>
			</div>
			<div class="ligne">
				<span class="nombre pente">
					{#if tangent}
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
			<div class="ligne">
				<span class="symbole">de</span>
				<Input
					type="number"
					step="any"
					value={display.integral.from}
					oninput={handleBoundInput('from')}
					class="h-7 w-20 text-xs"
					aria-label="Borne inférieure de l’aire"
				/>
				<span class="symbole">à</span>
				<Input
					type="number"
					step="any"
					value={display.integral.to}
					oninput={handleBoundInput('to')}
					class="h-7 w-20 text-xs"
					aria-label="Borne supérieure de l’aire"
				/>
			</div>
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
	.titre {
		margin: 0;
		font-size: 0.625rem;
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
		font-size: 0.75rem;
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
