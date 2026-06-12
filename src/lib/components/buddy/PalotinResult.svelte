<!--
	PalotinResult
	===============
	Shows the suggested Palotin after the quiz, plus the other two.
	Each Palotin says its onboarding message. Student picks one.
-->

<script lang="ts">
	import type { PalotinType } from '$lib/config/buddy-messages';
	import { buddyMessages } from '$lib/config/buddy-messages';
	import { PALOTIN_INFO } from '$lib/config/buddy-quiz';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { fade } from 'svelte/transition';

	interface Props {
		suggested: PalotinType;
		scores: Record<PalotinType, number>;
		onChoose: (palotin: PalotinType) => void;
	}

	let { suggested, scores: _scores, onChoose }: Props = $props();

	let selectedPalotin = $state<PalotinType | null>(null);
	let showConfirm = $state(false);

	// Order: suggested first, then the other two
	const palotinOrder = $derived.by<PalotinType[]>(() => {
		const others = (['giron', 'pile', 'cotice'] as PalotinType[]).filter((p) => p !== suggested);
		return [suggested, ...others];
	});

	function getOnboardingMessage(palotin: PalotinType): string {
		const messages = buddyMessages[palotin]?.onboarding;
		if (!messages || messages.length === 0) return '';
		return messages[0];
	}

	function handleSelect(palotin: PalotinType) {
		selectedPalotin = palotin;
		showConfirm = true;
	}

	function handleConfirm() {
		if (selectedPalotin) {
			onChoose(selectedPalotin);
		}
	}

	function handleCancel() {
		showConfirm = false;
		selectedPalotin = null;
	}
</script>

<div class="flex flex-col items-center gap-6 px-4" in:fade={{ duration: 200 }}>
	{#if !showConfirm}
		<h2 class="text-center text-lg font-semibold md:text-xl">
			On te suggere <span class="text-primary">{PALOTIN_INFO[suggested].name}</span> !
		</h2>
		<p class="text-center text-sm text-muted-foreground">
			Mais tu peux choisir celui que tu preferes.
		</p>

		<div class="grid w-full max-w-lg gap-4 md:grid-cols-3">
			{#each palotinOrder as palotin (palotin)}
				{@const info = PALOTIN_INFO[palotin]}
				{@const isSuggested = palotin === suggested}
				<Card.Root
					class="relative cursor-pointer transition-all hover:shadow-md {isSuggested
						? 'ring-2 ring-primary'
						: ''}"
				>
					<button type="button" class="w-full text-left" onclick={() => handleSelect(palotin)}>
						{#if isSuggested}
							<div
								class="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
							>
								Suggere
							</div>
						{/if}
						<Card.Content class="flex flex-col items-center gap-3 pt-6 pb-4">
							<BuddyAvatar {palotin} expression="encouraging" size="sm" />
							<div class="text-center">
								<div class="font-semibold">{info.name}</div>
								<div class="text-xs text-muted-foreground">{info.subtitle}</div>
							</div>
							<p class="text-center text-xs leading-snug text-muted-foreground">
								{getOnboardingMessage(palotin)}
							</p>
						</Card.Content>
					</button>
				</Card.Root>
			{/each}
		</div>
	{:else if selectedPalotin}
		<!-- Confirmation -->
		<div class="flex flex-col items-center gap-4" in:fade={{ duration: 150 }}>
			<BuddyAvatar palotin={selectedPalotin} expression="excited" />
			<h2 class="text-lg font-semibold">
				Tu pars avec {PALOTIN_INFO[selectedPalotin].name} ?
			</h2>
			<p class="text-center text-sm text-muted-foreground">
				{PALOTIN_INFO[selectedPalotin].description}
			</p>
			<div class="flex gap-3">
				<Button variant="outline" onclick={handleCancel}>Non, revenir</Button>
				<Button onclick={handleConfirm}>Oui, c'est parti !</Button>
			</div>
		</div>
	{/if}
</div>
