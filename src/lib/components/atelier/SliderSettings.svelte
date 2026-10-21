<script lang="ts">
	/**
	 * Les bornes et le pas du curseur d'une valeur (K1), dans la petite fenêtre
	 * qu'ouvre le menu de sa carte (lot 4a de la refonte de l'atelier).
	 *
	 * Refusés avec leur raison (E1) : tout passe par l'atelier (`setSlider`).
	 */
	import { useAtelier } from '$lib/atelier/context';
	import type { Slider, ValueObject } from '$lib/atelier/types';
	import { Input } from '$lib/components/ui/input';

	interface Props {
		object: ValueObject;
		slider: Slider;
	}

	let { object, slider }: Props = $props();

	const atelier = useAtelier();

	/** Pourquoi le dernier réglage n'a pas été retenu. */
	let refusal = $state<{ field: keyof Slider; message: string } | null>(null);

	function handleSettingInput(field: keyof Slider) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			const parsed = Number.parseFloat(event.currentTarget.value.replace(',', '.'));
			if (!Number.isFinite(parsed)) return;
			// Une frappe par écriture, UNE étape par champ quitté (lot 5, PR 2)
			const result = atelier.setSlider(
				object.name,
				{ [field]: parsed },
				`curseur-${field}:${object.name}`
			);
			refusal = result.ok ? null : { field, message: result.message };
		};
	}

	/**
	 * En quittant le champ, il reprend la valeur RETENUE (saisie vide ou refusée).
	 * Le message de refus, lui, reste : effacé au départ du champ, un élève au
	 * lecteur d'écran n'avait pas le temps de le lire (revue a11y du lot 4).
	 */
	function handleSettingChange(field: keyof Slider) {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			atelier.endGesture();
			event.currentTarget.value = String(slider[field]);
		};
	}

	/** Le nom de chaque champ COMMENCE par le mot visible (WCAG 2.5.3). */
	const FIELDS = $derived<{ field: keyof Slider; name: string; short: string }[]>([
		{ field: 'min', name: `de, minimum du curseur de ${object.name}`, short: 'de' },
		{ field: 'max', name: `à, maximum du curseur de ${object.name}`, short: 'à' },
		{ field: 'step', name: `pas du curseur de ${object.name}`, short: 'pas' }
	]);

	const refusalId = $derived(`refus-curseur-${object.name}`);
</script>

<div class="reglages">
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
	.reglages {
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
