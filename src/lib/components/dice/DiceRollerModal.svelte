<!--
	DiceRollerModal Component

	Modal dialog wrapper for the dice roller.
	Responsive layout (fullscreen on mobile, fixed size on desktop).
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import DiceRoller from './DiceRoller.svelte';
	import type { DiceRollerProps } from './types';

	// Props
	let {
		open = $bindable(false),
		title = 'Lanceur de dés',
		config,
		interactive = true,
		style,
		showHistory = true,
		maxHistory,
		onRollStart,
		onRollProgress,
		onRollComplete,
		physics,
		duration,
		disabled
	}: {
		open?: boolean;
		title?: string;
	} & DiceRollerProps = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto sm:max-h-[85vh] sm:w-full">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				{#if interactive}
					Sélectionnez un dé et lancez-le pour obtenir un résultat aléatoire
				{:else}
					Cliquez sur "Lancer" pour lancer les dés
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="dice-roller-content py-4">
			<DiceRoller
				{config}
				{interactive}
				{style}
				{showHistory}
				{maxHistory}
				{onRollStart}
				{onRollProgress}
				{onRollComplete}
				{physics}
				{duration}
				{disabled}
			/>
		</div>
	</Dialog.Content>
</Dialog.Root>
