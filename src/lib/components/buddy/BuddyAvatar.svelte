<!--
	BuddyAvatar
	=============
	Displays the Palotin image with the appropriate expression.
	Falls back to a colored circle with initial if image not found.
-->

<script lang="ts">
	import type { PalotinType } from '$lib/config/buddy-messages';
	import type { BuddyExpression } from '$lib/types/buddy';

	interface Props {
		palotin: PalotinType;
		expression?: BuddyExpression;
		size?: 'sm' | 'md';
	}

	let { palotin, expression = 'neutral', size = 'md' }: Props = $props();

	const sizeClass = $derived(
		size === 'sm' ? 'h-[60px] w-[60px]' : 'h-[80px] w-[80px] md:h-[100px] md:w-[100px]'
	);
	const imagePath = $derived(`/images/buddies/${palotin}-${expression}.png`);
	let imageError = $state(false);

	const palotinColors: Record<PalotinType, string> = {
		giron: 'bg-red-400',
		pile: 'bg-blue-400',
		cotice: 'bg-green-400'
	};

	const palotinInitials: Record<PalotinType, string> = {
		giron: 'G',
		pile: 'P',
		cotice: 'C'
	};

	// Reset error when expression changes
	$effect(() => {
		void imagePath;
		imageError = false;
	});
</script>

<div class="relative {sizeClass} shrink-0">
	{#if !imageError}
		<img
			src={imagePath}
			alt="Palotin {palotin}"
			class="{sizeClass} rounded-full object-cover"
			onerror={() => (imageError = true)}
		/>
	{:else}
		<!-- Fallback: colored circle with initial -->
		<div
			class="{sizeClass} {palotinColors[
				palotin
			]} flex items-center justify-center rounded-full font-bold text-white shadow-md"
			class:text-lg={size === 'sm'}
			class:text-2xl={size === 'md'}
		>
			{palotinInitials[palotin]}
		</div>
	{/if}
</div>
