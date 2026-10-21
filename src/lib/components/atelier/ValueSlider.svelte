<script lang="ts">
	/**
	 * Le curseur d'une valeur, sous la ligne de sa carte — phase 0 `/grapheur` §4.
	 *
	 * Bouger le pouce change la valeur (K2). Les bornes et le pas se règlent dans
	 * une petite fenêtre ouverte depuis le menu de la carte (`SliderSettings`,
	 * lot 4a de la refonte). Tout passe par l'atelier (`slideTo`) : le curseur
	 * n'a pas d'état à lui.
	 *
	 * Le même curseur règle la POSITION d'un `point_sur` (géométrie, lot 2, PR 3) :
	 * bornes de l'objet (`positionSliderOf`), le nombre écrit dans la définition
	 * réécrit par `slidePosition`.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { constantOf } from '$lib/atelier/atelier.svelte';
	import type { PointObject, Slider as SliderSettings, ValueObject } from '$lib/atelier/types';
	import { Slider } from '$lib/components/ui/slider';
	import { gestureHandlers } from '$lib/atelier/gesture';

	interface Props {
		object: ValueObject | PointObject;
		slider: SliderSettings;
	}

	let { object, slider }: Props = $props();

	const atelier = useAtelier();

	/**
	 * Au-delà, un cran par pas ferait un curseur inutilisable : on retombe sur
	 * 1 000 crans, et `slideTo` arrondit au pas.
	 */
	const MAX_NOTCHES = 1000;

	/**
	 * Le curseur est piloté en crans ENTIERS, comme celui du grapheur : bits-ui
	 * compare la valeur aux crans permis avec `===`, et un pas flottant n'en
	 * produit aucun qui corresponde — le pouce repartait en arrière. Un cran vaut
	 * un pas quand c'est possible : une flèche avance alors d'un pas exactement.
	 */
	const notches = $derived(
		Math.min(MAX_NOTCHES, Math.max(1, Math.round((slider.max - slider.min) / slider.step)))
	);
	const notchSize = $derived((slider.max - slider.min) / notches);

	const isPosition = $derived(object.kind === 'point');

	const value = $derived(
		(isPosition
			? atelier.positionOf(object.name)
			: constantOf(object.definition, object.provenance, atelier.functionNames)) ?? slider.min
	);

	function toNotch(v: number): number {
		return Math.min(notches, Math.max(0, Math.round((v - slider.min) / notchSize)));
	}

	/** Tout un glissé = UNE étape d'Annuler (lot 5, PR 2) : fermée au relâchement. */
	const gesture = gestureHandlers(() => atelier.endGesture());

	function handleSlide(notch: number) {
		const next = slider.min + notch * notchSize;
		if (isPosition) atelier.slidePosition(object.name, next);
		else atelier.slideTo(object.name, next);
	}

	/** Six chiffres significatifs, la virgule, jamais de notation « 1e-7 ». */
	const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
		maximumSignificantDigits: 6,
		useGrouping: false
	});

	/** Ce que le curseur annonce : la valeur, pas un numéro de cran. */
	const valueText = $derived(
		`${isPosition ? 'position de ' : ''}${object.name} = ${NUMBER_FORMAT.format(value)}`
	);
	const label = $derived(isPosition ? `Position de ${object.name}` : `Curseur de ${object.name}`);

	let zone = $state<HTMLElement>();

	// ⚠️ Le curseur partagé (`ui/slider`) ne transmet rien à son pouce : on pose
	// `aria-valuetext` sur l'élément `role="slider"` qu'il rend (effet de bord DOM).
	// Le NOM aussi : posé sur `<Slider>`, l'aria-label reste sur la racine, qui
	// n'a pas de rôle — le pouce n'avait aucun nom (revue a11y du lot 4).
	$effect(() => {
		const thumb = zone?.querySelector('[role="slider"]');
		if (!thumb) return;
		thumb.setAttribute('aria-valuetext', valueText);
		thumb.setAttribute('aria-label', label);
	});
</script>

<!-- Les touches arrivent du pouce (`role="slider"`), seul élément interactif :
     le conteneur ne fait qu'apprendre la fin du geste (Annuler, lot 5 PR 2) -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="curseur"
	role="group"
	bind:this={zone}
	onkeydowncapture={gesture.keydown}
	onkeyup={gesture.keyup}
	onfocusout={gesture.focusout}
	onpointercancel={gesture.pointercancel}
>
	<Slider
		class="flex-1"
		type="single"
		bind:value={() => toNotch(value), handleSlide}
		onValueCommit={gesture.commit}
		min={0}
		max={notches}
		step={1}
	/>
</div>

<style>
	.curseur {
		display: flex;
		align-items: center;
		/* Aligné sur le champ de la ligne : le point et le nom le précèdent */
		padding: 0.25rem 0.25rem 0.25rem 1.75rem;
	}
</style>
