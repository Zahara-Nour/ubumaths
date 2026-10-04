<script lang="ts">
	/**
	 * Le curseur d'une valeur, dans sa carte — phase 0 `/grapheur` §4.
	 *
	 * Bouger le pouce change la valeur (K2) ; les bornes et le pas se règlent ici
	 * (K1), refusés avec leur raison (E1). Tout passe par l'atelier
	 * (`slideTo`, `setSlider`) : le curseur n'a pas d'état à lui.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import { readNumber } from '$lib/atelier/parse';
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

	const value = $derived(readNumber(object.definition) ?? slider.min);

	function toNotch(v: number): number {
		return Math.min(notches, Math.max(0, Math.round((v - slider.min) / notchSize)));
	}

	function handleSlide(notch: number) {
		atelier.slideTo(object.name, slider.min + notch * notchSize);
	}

	/** Ce que le curseur annonce : la valeur, pas un numéro de cran. */
	const valueText = $derived(`${object.name} = ${String(value).replace('.', ',')}`);

	let zone = $state<HTMLElement>();

	// ⚠️ Le curseur partagé (`ui/slider`) ne transmet rien à son pouce : on pose
	// `aria-valuetext` sur l'élément `role="slider"` qu'il rend (effet de bord DOM).
	$effect(() => {
		const thumb = zone?.querySelector('[role="slider"]');
		if (thumb) thumb.setAttribute('aria-valuetext', valueText);
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

	/** En quittant le champ, il reprend la valeur RETENUE (saisie vide ou refusée). */
	function handleSettingChange(field: keyof SliderSettings) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			event.currentTarget.value = String(slider[field]);
			if (refusal?.field === field) refusal = null;
		};
	}

	const FIELDS: { field: keyof SliderSettings; label: string; short: string }[] = [
		{ field: 'min', label: 'Minimum', short: 'de' },
		{ field: 'max', label: 'Maximum', short: 'à' },
		{ field: 'step', label: 'Pas', short: 'pas' }
	];
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
			aria-label={`Curseur de ${object.name}`}
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
				aria-label={`${item.label} du curseur de ${object.name}`}
				aria-invalid={refusal?.field === item.field}
			/>
		{/each}
	</div>
	<p class="refus" role="alert">{refusal?.message ?? ''}</p>
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
		display: none;
	}
</style>
