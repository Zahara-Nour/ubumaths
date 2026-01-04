<!--
	TradeConfirmationModal Component
	================================
	Modal for final trade confirmation after both parties validate.

	Features:
	- Summary of both offers
	- 5-minute countdown timer
	- Confirmation status for each party
	- Confirm and Refuse buttons

	Props:
	- myOffer: { cards: VipCardInstance[], gidouilles: number }
	- partnerOffer: { cards: VipCardInstance[], gidouilles: number }
	- partnerName: string
	- deadline: Date | null
	- myConfirmation: boolean
	- partnerConfirmation: boolean
	- onConfirm: () => void
	- onRefuse: () => void
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import VipCard from '$lib/components/VipCard.svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		templateToVipCard
	} from '$lib/stores/vipCardTemplates.svelte';
	import { Check, X, Clock, ArrowRightLeft, Loader2 } from 'lucide-svelte';
	import type { VipCardInstance, VipCard as VipCardType } from '$lib/types/vip-card';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	// Extended type for cards with instanceId
	type TradeCard = VipCardInstance & { instanceId: string };

	// Grouped card type
	type GroupedCard = {
		cardId: string;
		card: VipCardType;
		count: number;
	};

	interface Props {
		myOffer: { cards: TradeCard[]; gidouilles: number };
		partnerOffer: { cards: TradeCard[]; gidouilles: number };
		partnerName: string;
		deadline: Date | null;
		myConfirmation: boolean;
		partnerConfirmation: boolean;
		onConfirm: () => void;
		onRefuse: () => void;
	}

	let {
		myOffer,
		partnerOffer,
		partnerName,
		deadline,
		myConfirmation,
		partnerConfirmation,
		onConfirm,
		onRefuse
	}: Props = $props();

	// Countdown state
	let remainingSeconds = $state(300); // 5 minutes default
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Loading state for confirm button
	let confirming = $state(false);

	// Format remaining time
	let formattedTime = $derived.by(() => {
		const minutes = Math.floor(remainingSeconds / 60);
		const seconds = remainingSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Timer is critical (< 60 seconds)
	let isCritical = $derived(remainingSeconds < 60);

	// Group cards by template for display
	function groupCards(cards: TradeCard[]): GroupedCard[] {
		const groups = new Map<string, GroupedCard>();

		for (const tradeCard of cards) {
			const template = getTemplateById(tradeCard.cardId, $vipCardTemplates);
			if (!template) continue;

			const card = templateToVipCard(template);

			if (groups.has(tradeCard.cardId)) {
				groups.get(tradeCard.cardId)!.count++;
			} else {
				groups.set(tradeCard.cardId, {
					cardId: tradeCard.cardId,
					card,
					count: 1
				});
			}
		}

		return Array.from(groups.values());
	}

	// Grouped cards for display
	let myGroupedCards = $derived(groupCards(myOffer.cards));
	let partnerGroupedCards = $derived(groupCards(partnerOffer.cards));

	// Update countdown
	onMount(() => {
		if (deadline) {
			updateRemainingTime();
			timerInterval = setInterval(updateRemainingTime, 1000);
		}

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});

	/**
	 * Update remaining time from deadline
	 */
	function updateRemainingTime(): void {
		if (!deadline) return;

		const now = new Date();
		const diff = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
		remainingSeconds = diff;

		// Auto-close on timeout (handled by parent store)
		if (diff <= 0 && timerInterval) {
			clearInterval(timerInterval);
		}
	}

	/**
	 * Handle confirm click with loading state
	 */
	async function handleConfirm(): Promise<void> {
		confirming = true;
		try {
			await onConfirm();
		} finally {
			confirming = false;
		}
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	<!-- Modal Content -->
	<div
		class="w-full max-w-2xl rounded-lg border bg-background shadow-lg"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirmation-title"
	>
		<!-- Header -->
		<div class="border-b p-4">
			<h2 id="confirmation-title" class="flex items-center gap-2 text-xl font-bold">
				<ArrowRightLeft class="h-6 w-6 text-primary" />
				Confirmation de l'echange
			</h2>
			<p class="text-sm text-muted-foreground">Verifiez les details et confirmez l'echange</p>
		</div>

		<!-- Content -->
		<div class="max-h-[60vh] overflow-auto p-4">
			<div class="grid gap-6 md:grid-cols-2">
				<!-- My Offer -->
				<div class="rounded-lg border bg-card p-3">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="font-semibold">Vous donnez</h3>
						<!-- My confirmation badge -->
						<div
							class="flex h-7 w-7 items-center justify-center rounded-full {myConfirmation
								? 'bg-green-500 text-white'
								: 'bg-muted-foreground/20'}"
							title={myConfirmation ? 'Vous avez confirme' : "Vous n'avez pas confirme"}
						>
							{#if myConfirmation}
								<Check class="h-4 w-4" />
							{:else}
								<span class="text-xs">?</span>
							{/if}
						</div>
					</div>

					<!-- Cards (grouped) -->
					{#if myGroupedCards.length > 0}
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each myGroupedCards as group (group.cardId)}
								<div class="relative">
									<VipCard card={group.card} size="sm" clickable={false} />
									{#if group.count > 1}
										<div
											class="absolute -top-2 -right-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground shadow-md"
										>
											x{group.count}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="mb-3 text-sm text-muted-foreground">Aucune carte</p>
					{/if}

					<!-- Gidouilles -->
					{#if myOffer.gidouilles > 0}
						<div class="flex items-center gap-2 rounded bg-muted p-2">
							<img src={gidouilleImg} alt="Gidouille" class="h-5 w-5" />
							<span class="font-medium">{myOffer.gidouilles} gidouilles</span>
						</div>
					{/if}
				</div>

				<!-- Partner Offer -->
				<div class="rounded-lg border bg-card p-3">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="font-semibold">Vous recevez de {partnerName}</h3>
						<!-- Partner confirmation badge -->
						<div
							class="flex h-7 w-7 items-center justify-center rounded-full {partnerConfirmation
								? 'bg-green-500 text-white'
								: 'bg-muted-foreground/20'}"
							title={partnerConfirmation
								? `${partnerName} a confirme`
								: `${partnerName} n'a pas confirme`}
						>
							{#if partnerConfirmation}
								<Check class="h-4 w-4" />
							{:else}
								<span class="text-xs">?</span>
							{/if}
						</div>
					</div>

					<!-- Cards (grouped) -->
					{#if partnerGroupedCards.length > 0}
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each partnerGroupedCards as group (group.cardId)}
								<div class="relative">
									<VipCard card={group.card} size="sm" clickable={false} />
									{#if group.count > 1}
										<div
											class="absolute -top-2 -right-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground shadow-md"
										>
											x{group.count}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="mb-3 text-sm text-muted-foreground">Aucune carte</p>
					{/if}

					<!-- Gidouilles -->
					{#if partnerOffer.gidouilles > 0}
						<div class="flex items-center gap-2 rounded bg-muted p-2">
							<img src={gidouilleImg} alt="Gidouille" class="h-5 w-5" />
							<span class="font-medium">{partnerOffer.gidouilles} gidouilles</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Footer with Timer and Buttons -->
		<div
			class="flex items-center justify-between gap-3 border-t p-4 {isCritical
				? 'bg-destructive/10'
				: 'bg-muted/50'}"
		>
			<!-- Timer -->
			<div
				class="flex items-center gap-2 {isCritical ? 'text-destructive' : 'text-muted-foreground'}"
			>
				<Clock class="h-5 w-5" />
				<span class="font-mono text-lg font-bold">{formattedTime}</span>
			</div>

			<!-- Buttons -->
			<div class="flex gap-3">
				<Button variant="destructive" onclick={onRefuse}>
					<X class="mr-2 h-4 w-4" />
					Refuser
				</Button>
				<Button onclick={handleConfirm} disabled={myConfirmation || confirming}>
					{#if confirming}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Confirmation...
					{:else if myConfirmation}
						<Check class="mr-2 h-4 w-4" />
						En attente...
					{:else}
						<Check class="mr-2 h-4 w-4" />
						Confirmer
					{/if}
				</Button>
			</div>
		</div>
	</div>
</div>
