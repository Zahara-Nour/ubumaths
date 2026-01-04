<!--
	Trade Board Page
	================
	Real-time trading interface for direct friend-to-friend VIP card exchanges.

	Layout:
	- Desktop: 3 columns (My offer | Chat | Partner offer)
	- Mobile: Stacked with chat drawer

	Features:
	- Real-time offer synchronization
	- Presence indicators
	- In-trade chat
	- Mutual validation + confirmation flow
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { tradeRealtimeStore } from '$lib/stores/tradeRealtime.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, MessageCircle, X, Check, Pencil } from 'lucide-svelte';

	// Components
	import TradeOfferPanel from '$lib/components/marketplace/trade/TradeOfferPanel.svelte';
	import TradeConfirmationModal from '$lib/components/marketplace/trade/TradeConfirmationModal.svelte';
	import TradeChatDrawer from '$lib/components/marketplace/trade/TradeChatDrawer.svelte';
	import TradePresenceIndicator from '$lib/components/marketplace/trade/TradePresenceIndicator.svelte';
	import IdleWarningModal from '$lib/components/marketplace/trade/IdleWarningModal.svelte';

	// Props from server (includes parent layout data: user, supabase)
	let { data } = $props();

	// Get supabase client and user from parent layout data
	const supabase = data.supabase;
	const user = data.user;

	// Local state
	let isMobileView = $state(false);
	let showChatDrawer = $state(false);

	// Unread messages count for mobile badge
	let lastReadMessageCount = $state(0);
	let unreadCount = $derived(
		Math.max(0, tradeRealtimeStore.messages.length - lastReadMessageCount)
	);

	// Partner name for display
	let partnerName = $derived.by(() => {
		if (!data.trade) return 'Partenaire';
		const partner = data.isInitiator ? data.trade.partner : data.trade.initiator;
		if (!partner) return 'Partenaire';
		return `${partner.firstname || ''} ${partner.lastname || ''}`.trim() || 'Partenaire';
	});

	// Filter partner cards to only show those in the offer (not all their cards)
	let partnerOfferedCards = $derived(
		data.partnerCards.filter((card) =>
			tradeRealtimeStore.partnerOffer.cards.includes(card.instanceId)
		)
	);

	// Can validate (has at least something in offer)
	let canValidate = $derived(
		tradeRealtimeStore.myOffer.cards.length > 0 || tradeRealtimeStore.myOffer.gidouilles > 0
	);

	// Beforeunload handler to cleanup on tab close
	function handleBeforeUnload(): void {
		tradeRealtimeStore.destroy();
	}

	// Initialize store on mount
	onMount(() => {
		// Check window width for mobile detection
		checkMobileView();
		window.addEventListener('resize', checkMobileView);

		// Add beforeunload to cleanup on tab close (best effort)
		window.addEventListener('beforeunload', handleBeforeUnload);

		// Initialize realtime store
		if (data.trade && user && supabase) {
			tradeRealtimeStore.init(data.trade.id, user.id, supabase).then(() => {
				// Set available cards in store
				tradeRealtimeStore.myCards = data.myCards;
				tradeRealtimeStore.partnerCards = data.partnerCards;
			});
		}

		return () => {
			window.removeEventListener('resize', checkMobileView);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			tradeRealtimeStore.destroy();
		};
	});

	// Watch for trade completion or cancellation
	$effect(() => {
		if (tradeRealtimeStore.trade) {
			if (tradeRealtimeStore.trade.status === 'completed') {
				// Invalidate rewards cache to refresh gidouilles and VIP cards
				// This is executed for BOTH students (the confirmer and the partner who receives broadcast)
				studentCache.invalidateRewards();
				toaster.success('Echange complete avec succes !');
				// Use untrack to avoid reactivity tracking for navigation
				goto('/dashboard/student/marketplace?tab=exchanges');
				return; // Early return after navigation
			} else if (tradeRealtimeStore.trade.status === 'cancelled') {
				toaster.warning('Echange annule');
				goto('/dashboard/student/marketplace?tab=exchanges');
				return; // Early return after navigation
			}
		}
	});

	// Watch for session end (after user clicks "Quit" in idle warning)
	$effect(() => {
		// When store is destroyed (tradeId becomes null) and not due to completion/cancellation
		if (
			tradeRealtimeStore.tradeId === null &&
			data.trade &&
			tradeRealtimeStore.trade?.status !== 'completed' &&
			tradeRealtimeStore.trade?.status !== 'cancelled'
		) {
			goto('/dashboard/student/marketplace?tab=exchanges');
		}
	});

	/**
	 * Handle continue session from idle warning
	 */
	function handleContinueSession(): void {
		tradeRealtimeStore.continueSession();
	}

	/**
	 * Handle quit session from idle warning
	 */
	function handleQuitSession(): void {
		tradeRealtimeStore.endSession();
		goto('/dashboard/student/marketplace?tab=exchanges');
	}

	/**
	 * Check if mobile view (< 1024px for 3-column layout)
	 */
	function checkMobileView(): void {
		isMobileView = window.innerWidth < 1024;
	}

	/**
	 * Handle card selection in my panel
	 */
	function handleSelectCard(cardId: string): void {
		tradeRealtimeStore.selectCard(cardId);
	}

	/**
	 * Handle card deselection in my panel
	 */
	function handleDeselectCard(cardId: string): void {
		tradeRealtimeStore.deselectCard(cardId);
	}

	/**
	 * Handle gidouilles change
	 */
	function handleSetGidouilles(amount: number): void {
		tradeRealtimeStore.setGidouilles(amount);
	}

	/**
	 * Handle validation toggle
	 */
	async function handleValidate(): Promise<void> {
		await tradeRealtimeStore.toggleValidation();
	}

	/**
	 * Handle trade confirmation
	 */
	async function handleConfirm(): Promise<void> {
		await tradeRealtimeStore.confirm();
	}

	/**
	 * Handle confirmation refusal
	 */
	async function handleRefuse(): Promise<void> {
		await tradeRealtimeStore.refuseConfirmation();
	}

	/**
	 * Handle trade cancellation
	 */
	async function handleCancel(): Promise<void> {
		await tradeRealtimeStore.cancelTrade();
		goto('/dashboard/student/marketplace?tab=exchanges');
	}

	/**
	 * Handle chat message send
	 */
	async function handleSendMessage(message: string): Promise<void> {
		await tradeRealtimeStore.sendMessage(message);
	}

	/**
	 * Open chat drawer (mobile)
	 */
	function openChatDrawer(): void {
		showChatDrawer = true;
		lastReadMessageCount = tradeRealtimeStore.messages.length;
	}

	/**
	 * Close chat drawer
	 */
	function closeChatDrawer(): void {
		showChatDrawer = false;
	}

	/**
	 * Navigate back to marketplace
	 */
	function goBack(): void {
		goto('/dashboard/student/marketplace?tab=exchanges');
	}
</script>

<svelte:head>
	<title>Echange en cours - Ubumaths</title>
</svelte:head>

<div class="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
	<!-- Header -->
	<header class="flex items-center justify-between border-b bg-card px-2 py-2 sm:px-3">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="sm" onclick={goBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-lg font-semibold">Echange avec {partnerName}</h1>
				<TradePresenceIndicator online={tradeRealtimeStore.partnerOnline} />
			</div>
		</div>

		<div class="flex items-center gap-2">
			<!-- Mobile chat button -->
			{#if isMobileView}
				<Button variant="outline" size="sm" onclick={openChatDrawer} class="relative">
					<MessageCircle class="h-5 w-5" />
					{#if unreadCount > 0}
						<span
							class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
						>
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					{/if}
				</Button>
			{/if}

			<!-- Validate / Modify button -->
			{#if !tradeRealtimeStore.myValidation}
				<Button size="sm" onclick={handleValidate} disabled={!canValidate}>
					<Check class="mr-1 h-4 w-4" />
					Valider
				</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={handleValidate}>
					<Pencil class="mr-1 h-4 w-4" />
					Modifier
				</Button>
			{/if}

			<Button variant="destructive" size="sm" onclick={handleCancel}>
				<X class="mr-1 h-4 w-4" />
				Annuler
			</Button>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex flex-1 overflow-hidden">
		{#if isMobileView}
			<!-- Mobile Layout: Stacked panels -->
			<div class="flex flex-1 flex-col overflow-auto">
				<!-- My Offer Panel -->
				<div class="border-b p-2">
					<TradeOfferPanel
						isMyPanel={true}
						cards={data.myCards}
						offer={tradeRealtimeStore.myOffer}
						validated={tradeRealtimeStore.myValidation}
						gidouillesBalance={data.gidouillesBalance}
						onSelectCard={handleSelectCard}
						onDeselectCard={handleDeselectCard}
						onSetGidouilles={handleSetGidouilles}
					/>
				</div>

				<!-- Partner Offer Panel -->
				<div class="p-2">
					<TradeOfferPanel
						isMyPanel={false}
						cards={partnerOfferedCards}
						offer={tradeRealtimeStore.partnerOffer}
						validated={tradeRealtimeStore.partnerValidation}
						gidouillesBalance={0}
						{partnerName}
					/>
				</div>
			</div>
		{:else}
			<!-- Desktop Layout: 3 columns -->
			<div class="grid flex-1 grid-cols-[1fr_300px_1fr] overflow-hidden">
				<!-- My Offer Panel -->
				<div class="overflow-auto border-r p-2">
					<TradeOfferPanel
						isMyPanel={true}
						cards={data.myCards}
						offer={tradeRealtimeStore.myOffer}
						validated={tradeRealtimeStore.myValidation}
						gidouillesBalance={data.gidouillesBalance}
						onSelectCard={handleSelectCard}
						onDeselectCard={handleDeselectCard}
						onSetGidouilles={handleSetGidouilles}
					/>
				</div>

				<!-- Chat Panel (Desktop) -->
				<div class="flex flex-col overflow-hidden border-r bg-muted/30">
					<div class="border-b bg-card p-2">
						<h2 class="text-sm font-semibold">Chat</h2>
					</div>
					<div class="flex flex-1 flex-col overflow-hidden">
						<!-- Chat messages -->
						<div class="flex-1 overflow-auto p-2">
							{#if tradeRealtimeStore.messages.length === 0}
								<p class="py-8 text-center text-sm text-muted-foreground">
									Aucun message. Commencez la discussion !
								</p>
							{:else}
								<div class="space-y-3">
									{#each tradeRealtimeStore.messages as message (message.id)}
										{@const isOwn = message.senderId === user?.id}
										<div class="flex {isOwn ? 'justify-end' : 'justify-start'}">
											<div
												class="max-w-[80%] rounded-lg px-3 py-2 {isOwn
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-foreground'}"
											>
												<p class="text-sm">{message.message}</p>
												<p class="mt-1 text-xs opacity-70">
													{new Date(message.createdAt).toLocaleTimeString('fr-FR', {
														hour: '2-digit',
														minute: '2-digit'
													})}
												</p>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Chat input -->
						<div class="border-t bg-card p-2">
							<form
								onsubmit={(e) => {
									e.preventDefault();
									const form = e.target as HTMLFormElement;
									const input = form.elements.namedItem('message') as HTMLInputElement;
									if (input.value.trim()) {
										handleSendMessage(input.value.trim());
										input.value = '';
									}
								}}
								class="flex gap-2"
							>
								<input
									type="text"
									name="message"
									placeholder="Message..."
									maxlength="500"
									class="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
								<Button type="submit" size="sm">OK</Button>
							</form>
						</div>
					</div>
				</div>

				<!-- Partner Offer Panel -->
				<div class="overflow-auto p-2">
					<TradeOfferPanel
						isMyPanel={false}
						cards={partnerOfferedCards}
						offer={tradeRealtimeStore.partnerOffer}
						validated={tradeRealtimeStore.partnerValidation}
						gidouillesBalance={0}
						{partnerName}
					/>
				</div>
			</div>
		{/if}
	</main>
</div>

<!-- Confirmation Modal -->
{#if tradeRealtimeStore.showConfirmationModal}
	<TradeConfirmationModal
		myOffer={{
			cards: data.myCards.filter((c) => tradeRealtimeStore.myOffer.cards.includes(c.instanceId)),
			gidouilles: tradeRealtimeStore.myOffer.gidouilles
		}}
		partnerOffer={{
			cards: data.partnerCards.filter((c) =>
				tradeRealtimeStore.partnerOffer.cards.includes(c.instanceId)
			),
			gidouilles: tradeRealtimeStore.partnerOffer.gidouilles
		}}
		{partnerName}
		deadline={tradeRealtimeStore.confirmationDeadline}
		myConfirmation={tradeRealtimeStore.myConfirmation}
		partnerConfirmation={tradeRealtimeStore.partnerConfirmation}
		onConfirm={handleConfirm}
		onRefuse={handleRefuse}
	/>
{/if}

<!-- Mobile Chat Drawer -->
{#if isMobileView}
	<TradeChatDrawer
		open={showChatDrawer}
		messages={tradeRealtimeStore.messages}
		currentUserId={user?.id ?? ''}
		onSend={handleSendMessage}
		onClose={closeChatDrawer}
	/>
{/if}

<!-- Idle Warning Modal -->
{#if tradeRealtimeStore.showIdleWarning}
	<IdleWarningModal onContinue={handleContinueSession} onQuit={handleQuitSession} />
{/if}
