<!--
	SelfAssessButtons
	=================

	Auto-évaluation d'une carte retournée : deux boutons, « Pas réussi » puis
	« Réussi » (chantier `formes-de-serie`, N7). Les mêmes partout : révisions,
	Flash-cards, cartes de cours. La révision les traduit en notes FSRS
	Again / Good.

	Props :
	- onAssess : appelé avec `true` (Réussi) ou `false` (Pas réussi)
	- disabled : boutons et raccourcis inactifs
	- keyboard : raccourcis 1 (Pas réussi) et 2 (Réussi) ; un seul écran à la fois
	  peut les écouter, d'où l'option (la révision les active)
	- size : taille des boutons (celle de la carte qui les héberge)
	- missedHint / succeededHint : ligne sous chaque bouton (vitrine : « dans 3 jours »)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Check, X } from '@lucide/svelte';

	// Types
	interface Props {
		onAssess: (succeeded: boolean) => void;
		disabled?: boolean;
		keyboard?: boolean;
		size?: 'sm' | 'default' | 'lg';
		missedHint?: string;
		succeededHint?: string;
	}

	let {
		onAssess,
		disabled = false,
		keyboard = false,
		size = 'default',
		missedHint,
		succeededHint
	}: Props = $props();

	// Functions
	function isTyping(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!keyboard || disabled || event.repeat) return;
		if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
		if (event.key === '1' || event.key === '2') {
			event.preventDefault();
			onAssess(event.key === '2');
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="space-y-2" data-testid="self-assess">
	<div class="flex flex-wrap justify-center gap-3">
		<div class="flex flex-col items-center gap-1">
			<Button
				variant="outline"
				{size}
				{disabled}
				data-self-assess="missed"
				onclick={() => onAssess(false)}
			>
				<X class="mr-2 h-4 w-4" aria-hidden="true" />
				Pas réussi
			</Button>
			{#if missedHint}
				<span class="text-xs text-muted-foreground">{missedHint}</span>
			{/if}
		</div>
		<div class="flex flex-col items-center gap-1">
			<Button {size} {disabled} data-self-assess="found" onclick={() => onAssess(true)}>
				<Check class="mr-2 h-4 w-4" aria-hidden="true" />
				Réussi
			</Button>
			{#if succeededHint}
				<span class="text-xs text-muted-foreground">{succeededHint}</span>
			{/if}
		</div>
	</div>
	{#if keyboard}
		<p class="text-center text-xs text-muted-foreground">
			Clavier : <kbd>1</kbd> pas réussi · <kbd>2</kbd> réussi
		</p>
	{/if}
</div>
