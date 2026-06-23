<!--
	ChangePalotinModal
	====================
	Modal for changing the student's Palotin companion.
	First change is free, subsequent changes cost 50 gidouilles.
	XP is always preserved.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import type { PalotinType } from '$lib/config/buddy-messages';
	import type { BuddyState } from '$lib/types/buddy';
	import { PALOTIN_INFO } from '$lib/config/buddy-quiz';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		open: boolean;
		buddy: BuddyState;
		onClose: () => void;
	}

	let { open = $bindable(), buddy, onClose }: Props = $props();

	const CHANGE_COST = 50;
	const isFree = $derived(buddy.change_count === 0);
	const rewards = $derived(studentCache.getRewardsSync());
	const canAfford = $derived(isFree || (rewards?.gidouilles ?? 0) >= CHANGE_COST);

	const otherPalotins = $derived(
		(['giron', 'pile', 'cotice'] as PalotinType[]).filter((p) => p !== buddy.palotin_type)
	);

	let selectedPalotin = $state<PalotinType | null>(null);
	let isSubmitting = $state(false);

	async function handleChange() {
		if (!selectedPalotin || isSubmitting) return;
		isSubmitting = true;

		try {
			const response = await fetch('/api/student/buddy/change', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPalotinType: selectedPalotin })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur');
			}

			const { buddy: updatedBuddy, cost } = await response.json();
			studentCache.hydrateBuddy(updatedBuddy);

			if (cost > 0) {
				studentCache.updateGidouillesOptimistic(-cost);
			}

			toaster.success(`Tu es maintenant avec ${PALOTIN_INFO[selectedPalotin].name} !`);
			selectedPalotin = null;
			open = false;
			onClose();
		} catch (err) {
			console.error('❌ [ChangePalotin] Error:', err);
			toaster.error('Erreur lors du changement de Palotin');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		selectedPalotin = null;
		open = false;
		onClose();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Changer de Palotin</Dialog.Title>
			<Dialog.Description>
				{#if isFree}
					Premier changement gratuit ! Ton XP est conservee.
				{:else}
					Cout : {CHANGE_COST} gidouilles. Ton XP est conservee.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Current palotin -->
			<div class="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
				<BuddyAvatar palotin={buddy.palotin_type} expression="neutral" size="sm" />
				<div>
					<div class="text-sm font-medium">
						{PALOTIN_INFO[buddy.palotin_type].name}
						<Badge variant="secondary" class="ml-2">Actuel</Badge>
					</div>
					<div class="text-xs text-muted-foreground">Niveau {buddy.level} — {buddy.xp} XP</div>
				</div>
			</div>

			<!-- Other palotins to choose -->
			<div class="space-y-2">
				<p class="text-sm font-medium">Choisir un nouveau Palotin :</p>
				{#each otherPalotins as palotin (palotin)}
					{@const info = PALOTIN_INFO[palotin]}
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-lg border p-3 transition-all hover:bg-accent {selectedPalotin ===
						palotin
							? 'ring-2 ring-primary'
							: ''}"
						onclick={() => (selectedPalotin = palotin)}
					>
						<BuddyAvatar {palotin} expression="encouraging" size="sm" />
						<div class="text-left">
							<div class="text-sm font-medium">{info.name}</div>
							<div class="text-xs text-muted-foreground">{info.description}</div>
						</div>
					</button>
				{/each}
			</div>

			{#if !canAfford}
				<p class="text-sm text-destructive">
					Il te faut {CHANGE_COST} gidouilles (tu en as {rewards?.gidouilles ?? 0}).
				</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>{lore.actions.cancel}</Button>
			<Button onclick={handleChange} disabled={!selectedPalotin || !canAfford || isSubmitting}>
				{#if isSubmitting}
					Changement...
				{:else if isFree}
					Changer (gratuit)
				{:else}
					Changer ({CHANGE_COST} gidouilles)
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
