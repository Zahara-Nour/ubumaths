<script lang="ts">
	/**
	 * Le curseur d'une valeur, dans sa carte — phase 0 `/grapheur` §4.
	 *
	 * Bouger le pouce change la valeur (K2) ; les bornes et le pas se règlent ici
	 * (K1), refusés avec leur raison (E1). Tout passe par l'atelier
	 * (`slideTo`, `setSlider`) : le curseur n'a pas d'état à lui.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { constantOf } from '$lib/atelier/atelier.svelte';
	import type { Slider as SliderSettings, ValueObject } from '$lib/atelier/types';
	import { Slider } from '$lib/components/ui/slider';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		object: ValueObject;
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

	const value = $derived(
		constantOf(object.definition, object.provenance, atelier.functionNames) ?? slider.min
	);

	function toNotch(v: number): number {
		return Math.min(notches, Math.max(0, Math.round((v - slider.min) / notchSize)));
	}

	function handleSlide(notch: number) {
		atelier.slideTo(object.name, slider.min + notch * notchSize);
	}

	/** Six chiffres significatifs, la virgule, jamais de notation « 1e-7 ». */
	const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', {
		maximumSignificantDigits: 6,
		useGrouping: false
	});

	/** Ce que le curseur annonce : la valeur, pas un numéro de cran. */
	const valueText = $derived(`${object.name} = ${NUMBER_FORMAT.format(value)}`);

	let zone = $state<HTMLElement>();

	// ⚠️ Le curseur partagé (`ui/slider`) ne transmet rien à son pouce : on pose
	// `aria-valuetext` sur l'élément `role="slider"` qu'il rend (effet de bord DOM).
	// Le NOM aussi : posé sur `<Slider>`, l'aria-label reste sur la racine, qui
	// n'a pas de rôle — le pouce n'avait aucun nom (revue a11y du lot 4).
	$effect(() => {
		const thumb = zone?.querySelector('[role="slider"]');
		if (!thumb) return;
		thumb.setAttribute('aria-valuetext', valueText);
		thumb.setAttribute('aria-label', `Curseur de ${object.name}`);
	});

	/** Pourquoi le dernier réglage n'a pas été retenu. */
	let refusal = $state<{ field: keyof SliderSettings; message: string } | null>(null);

	function handleSettingInput(field: keyof SliderSettings) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const parsed = Number.parseFloat(event.currentTarget.value.replace(',', '.'));
			if (!Number.isFinite(parsed)) return;
			const result = atelier.setSlider(object.name, { [field]: parsed });
			refusal = result.ok ? null : { field, message: result.message };
		};
	}

	/**
	 * En quittant le champ, il reprend la valeur RETENUE (saisie vide ou refusée).
	 * Le message de refus, lui, reste : effacé au départ du champ, un élève au
	 * lecteur d'écran n'avait pas le temps de le lire (revue a11y du lot 4).
	 */
	function handleSettingChange(field: keyof SliderSettings) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			event.currentTarget.value = String(slider[field]);
		};
	}

	/** Le nom de chaque champ COMMENCE par le mot visible (WCAG 2.5.3). */
	const FIELDS = $derived<{ field: keyof SliderSettings; name: string; short: string }[]>([
		{ field: 'min', name: `de, minimum du curseur de ${object.name}`, short: 'de' },
		{ field: 'max', name: `à, maximum du curseur de ${object.name}`, short: 'à' },
		{ field: 'step', name: `pas du curseur de ${object.name}`, short: 'pas' }
	]);

	const refusalId = $derived(`refus-curseur-${object.name}`);
</script>

<div class="curseur">
	<div class="ligne" bind:this={zone}>
		<Slider
			class="flex-1"
			type="single"
			bind:value={() => toNotch(value), handleSlide}
			min={0}
			max={notches}
			step={1}
		/>
	</div>
	<div class="ligne" role="group" aria-label={`Réglages du curseur de ${object.name}`}>
		{#each FIELDS as item (item.field)}
			<span class="mot" aria-hidden="true">{item.short}</span>
			<Input
				type="number"
				step="any"
				value={slider[item.field]}
				oninput={handleSettingInput(item.field)}
				onchange={handleSettingChange(item.field)}
				class="h-8 w-20 text-sm"
				aria-label={item.name}
				aria-invalid={refusal?.field === item.field}
				aria-describedby={refusal?.field === item.field ? refusalId : undefined}
			/>
		{/each}
	</div>
	<!-- Toujours dans l'arbre (pas de `display: none`) : une alerte qui apparaît
	     avec son contenu n'est pas annoncée de façon fiable (revue a11y) -->
	<p class="refus" id={refusalId} role="alert">{refusal?.message ?? ''}</p>
</div>

<style>
	.curseur {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem;
		font-size: 0.8125rem;
	}
	.mot {
		font-family: var(--font-serif, serif);
		color: var(--color-muted-foreground);
	}
	.refus {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
	}
	.refus:empty {
		visibility: hidden;
		height: 0;
	}
</style>
