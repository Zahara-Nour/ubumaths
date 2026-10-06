<!--
	Résultat d'un chiffre : le texte produit, un bouton de copie et, sur demande,
	les étapes lettre par lettre (« H → 7 + 3 = 10 → K »).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toBlocks } from '$lib/ciphers/alphabet';
	import type { CipherOutcome } from '$lib/ciphers/outcome';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Types
	interface Props {
		outcome: CipherOutcome;
		label: string;
		/** Propose l'affichage en blocs de 5 lettres */
		blocksOption?: boolean;
		testid: string;
		/** Boutons ajoutés sous le résultat */
		actions?: Snippet<[string]>;
	}

	// Constantes
	/** Au-delà, la liste des étapes alourdirait la page sur un long texte */
	const MAX_STEPS = 50;

	// Props
	let { outcome, label, blocksOption = true, testid, actions }: Props = $props();

	// State
	let showSteps = $state(false);
	let blocks = $state(false);

	const displayed = $derived(outcome.ok ? (blocks ? toBlocks(outcome.text) : outcome.text) : '');
	const steps = $derived(outcome.ok ? outcome.steps : []);
	const hiddenSteps = $derived(Math.max(0, steps.length - MAX_STEPS));

	// Functions
	async function copy() {
		try {
			await navigator.clipboard.writeText(displayed);
			toaster.success('Copié dans le presse-papiers.');
		} catch {
			toaster.error('Copie impossible : sélectionnez le texte à la main.');
		}
	}
</script>

<div class="flex flex-col gap-3">
	<div class="text-sm font-medium">{label}</div>
	{#if outcome.ok}
		<output
			class="min-h-12 rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
			aria-live="off"
			data-testid={testid}>{displayed}</output
		>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
			{#if blocksOption}
				<MyCheckbox bind:checked={blocks} label="Blocs de 5 lettres" />
			{/if}
			{#if steps.length > 0}
				<MyCheckbox bind:checked={showSteps} label="Voir les étapes" />
			{/if}
			<Button variant="outline" size="sm" onclick={copy} disabled={displayed === ''}>Copier</Button>
			{@render actions?.(outcome.text)}
		</div>
		{#if showSteps && steps.length > 0}
			<ol class="grid gap-1 font-mono text-sm sm:grid-cols-2" data-testid="{testid}-steps">
				{#each steps.slice(0, MAX_STEPS) as step, i (i)}
					<li class="rounded-md bg-muted/40 px-2 py-1">
						<strong>{step.input}</strong>
						{#if step.detail}<span class="text-muted-foreground"> → {step.detail}</span>{/if}
						→ <strong class="text-primary">{step.output}</strong>
					</li>
				{/each}
			</ol>
			{#if hiddenSteps > 0}
				<p class="text-sm text-muted-foreground">
					… et {hiddenSteps} lettre{hiddenSteps > 1 ? 's' : ''} de plus, calculée{hiddenSteps > 1
						? 's'
						: ''} de la même façon.
				</p>
			{/if}
		{/if}
	{:else}
		<p class="rounded-lg border border-destructive/40 px-3 py-2 text-destructive" role="status">
			{outcome.message}
		</p>
	{/if}
</div>
