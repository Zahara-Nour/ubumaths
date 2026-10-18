<!--
	BuddyGainCard
	=============
	Fin de séance : ce que le Palotin a gagné (pansées), sa réplique, la montée
	de tour de panse et le plafond du jour. Partagé par l'Entraînement / la
	Course aux nombres (`/automaths/test`) et la séance de révision espacée.

	Props :
	- gain : préparé par `receiveBuddyGain` ; `null` → rien n'est affiché.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import { formatXpAmount, palotinName, type BuddyGainView } from './buddy-gain';

	interface Props {
		gain: BuddyGainView | null;
	}

	let { gain }: Props = $props();
</script>

{#if gain && gain.xpGained > 0}
	<section
		class="flex items-start gap-3 rounded-lg border bg-muted/40 p-3"
		aria-label="Gain de ton Palotin"
		data-testid="buddy-gain-card"
	>
		<BuddyAvatar palotin={gain.palotin} expression={gain.expression} size="sm" />
		<div class="min-w-0 flex-1 space-y-1">
			<p class="text-sm font-medium">
				{palotinName(gain.palotin)} a gagné {formatXpAmount(gain.xpGained)}
			</p>
			{#if gain.message}
				<p class="text-sm text-muted-foreground italic">« {gain.message} »</p>
			{/if}
			{#if gain.leveledUp}
				<p class="text-sm font-semibold text-primary">
					Nouveau {lore.buddy.level.toLowerCase()} : {gain.newLevel} !
				</p>
			{/if}
			{#if gain.dailyCapReached}
				<p class="text-xs text-muted-foreground">
					Sa panse est pleine pour aujourd’hui : ton travail compte toujours, et il pourra de
					nouveau gagner demain.
				</p>
			{/if}
		</div>
	</section>
{/if}
