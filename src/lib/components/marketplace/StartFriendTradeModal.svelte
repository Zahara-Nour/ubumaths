<!--
	StartFriendTradeModal Component
	================================

	Dialog for selecting a friend to start a direct trade with.
	Shows list of user's friends with search functionality.
	Friends with active trades are shown but disabled (can click to view existing trade).

	Props:
		- open: boolean (bindable)
		- onClose: () => void
		- onTradeStarted: (tradeId: string) => void
		- supabase: SupabaseClient
		- userId: string - Current authenticated user ID
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import OnlineStatus from '$lib/components/OnlineStatus.svelte';
	import { Search, ArrowLeftRight, UserPlus, Loader2 } from 'lucide-svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { presenceManager } from '$lib/stores/presence.svelte';
	import { marketplaceStore } from '$lib/stores/marketplace.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';

	// Component Props
	interface Props {
		open: boolean;
		onClose: () => void;
		onTradeStarted: (tradeId: string) => void;
		supabase: SupabaseClient;
		userId: string;
	}

	let { open = $bindable(), onClose, onTradeStarted, supabase, userId }: Props = $props();

	// Component State
	interface Friend {
		id: string;
		firstname: string;
		lastname: string;
		avatar_url: string | null;
	}

	let friends = $state<Friend[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let isCreatingTrade = $state(false);
	let creatingForFriendId = $state<string | null>(null);

	// Get IDs of friends with active trades
	let friendsWithActiveTrades = $derived.by(() => {
		return new Set(
			marketplaceStore.activeTrades
				.filter((t) => t.status === 'negotiating' && t.trade_type === 'friend')
				.map((t) => (t.initiator_id === userId ? t.partner_id : t.initiator_id))
		);
	});

	/**
	 * Load user's friends
	 */
	async function loadFriends(): Promise<void> {
		isLoading = true;

		try {
			// Get accepted friendships
			const { data: friendships, error: friendshipsError } = await supabase
				.from('friendships')
				.select('requester_id, addressee_id')
				.eq('status', 'accepted');

			if (friendshipsError) {
				console.error('Error loading friendships:', friendshipsError);
				toaster.error('Erreur lors du chargement de vos amis');
				return;
			}

			if (!friendships || friendships.length === 0) {
				friends = [];
				return;
			}

			// Extract friend IDs (other user in each friendship)
			const friendIds = friendships.map((f) =>
				f.requester_id === userId ? f.addressee_id : f.requester_id
			);

			// Load friend profiles
			const { data: profiles, error: profilesError } = await supabase
				.from('profiles')
				.select('id, firstname, lastname, avatar_url')
				.in('id', friendIds);

			if (profilesError) {
				console.error('Error loading profiles:', profilesError);
				toaster.error('Erreur lors du chargement des profils');
				return;
			}

			friends = (profiles || []).map((p) => ({
				id: p.id,
				firstname: p.firstname || '',
				lastname: p.lastname || '',
				avatar_url: p.avatar_url
			}));
		} catch (error) {
			console.error('Exception loading friends:', error);
			toaster.error('Erreur inattendue lors du chargement');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Filter friends based on search query
	 */
	let filteredFriends = $derived.by(() => {
		if (!searchQuery.trim()) {
			return friends;
		}

		const query = searchQuery.toLowerCase();
		return friends.filter(
			(f) => f.firstname?.toLowerCase().includes(query) || f.lastname?.toLowerCase().includes(query)
		);
	});

	/**
	 * Check if friend has an active trade
	 */
	function hasActiveTrade(friendId: string): boolean {
		return friendsWithActiveTrades.has(friendId);
	}

	/**
	 * Handle friend selection - start a trade
	 */
	async function handleStartTrade(friend: Friend): Promise<void> {
		if (hasActiveTrade(friend.id)) {
			// Find and open existing trade
			const existingTrade = marketplaceStore.activeTrades.find(
				(t) =>
					t.status === 'negotiating' && (t.initiator_id === friend.id || t.partner_id === friend.id)
			);
			if (existingTrade) {
				onTradeStarted(existingTrade.id);
				open = false;
			}
			return;
		}

		isCreatingTrade = true;
		creatingForFriendId = friend.id;

		try {
			const tradeId = await marketplaceStore.createFriendTrade(friend.id);

			if (tradeId) {
				toaster.success(`Échange démarré avec ${friend.firstname} ${friend.lastname}`);
				onTradeStarted(tradeId);
				open = false;
			}
		} catch (error) {
			console.error('Error starting trade:', error);
			toaster.error("Erreur lors de la création de l'échange");
		} finally {
			isCreatingTrade = false;
			creatingForFriendId = null;
		}
	}

	/**
	 * Load friends when dialog opens
	 */
	$effect(() => {
		if (open) {
			loadFriends();
			searchQuery = '';
		}
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<ArrowLeftRight class="h-5 w-5 text-primary" />
				Nouvel échange direct
			</Dialog.Title>
			<Dialog.Description>
				Sélectionnez un ami pour démarrer un échange de cartes VIP.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Search Bar -->
		<div class="relative mb-4">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input type="text" placeholder="Rechercher un ami..." bind:value={searchQuery} class="pl-9" />
		</div>

		<!-- Friends List -->
		<div class="max-h-96 overflow-y-auto">
			{#if isLoading}
				<div class="flex items-center justify-center py-8 text-muted-foreground">
					<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					<p>Chargement...</p>
				</div>
			{:else if filteredFriends.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					{#if searchQuery}
						<p>Aucun ami trouvé pour "{searchQuery}"</p>
					{:else if friends.length === 0}
						<UserPlus class="mx-auto mb-3 h-12 w-12 opacity-50" />
						<p class="mb-2 font-medium">Vous n'avez pas encore d'amis</p>
						<p class="text-sm">Ajoutez des amis pour pouvoir échanger des cartes !</p>
						<Button variant="outline" class="mt-4" onclick={() => goto('/dashboard/friends')}>
							Trouver des amis
						</Button>
					{:else}
						<p>Aucun résultat</p>
					{/if}
				</div>
			{:else}
				<div class="space-y-2">
					{#each filteredFriends as friend (friend.id)}
						{@const hasActive = hasActiveTrade(friend.id)}
						{@const isCreating = isCreatingTrade && creatingForFriendId === friend.id}

						<button
							onclick={() => handleStartTrade(friend)}
							disabled={isCreatingTrade}
							class="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 {hasActive
								? 'bg-muted/50'
								: ''}"
						>
							<!-- Avatar with Online Status -->
							<div class="relative flex-shrink-0">
								<Avatar.Root class="h-10 w-10 {hasActive ? 'opacity-60' : ''}">
									<Avatar.Image
										src={friend.avatar_url || ''}
										alt="{friend.firstname} {friend.lastname}"
									/>
									<Avatar.Fallback class="bg-primary/10 text-primary">
										{friend.firstname[0]?.toUpperCase() || '?'}
										{friend.lastname[0]?.toUpperCase() || ''}
									</Avatar.Fallback>
								</Avatar.Root>

								<div class="absolute -right-1 -bottom-1">
									<OnlineStatus status={presenceManager.getFriendPresence(friend.id)} size="sm" />
								</div>
							</div>

							<!-- Friend Info -->
							<div class="flex-1 overflow-hidden">
								<p class="truncate font-semibold {hasActive ? 'text-muted-foreground' : ''}">
									{friend.firstname}
									{friend.lastname}
								</p>
								<p class="text-sm text-muted-foreground">
									{#if hasActive}
										<span class="text-amber-500">Échange en cours</span>
									{:else}
										{presenceManager.getFriendPresence(friend.id) === 'online'
											? 'En ligne'
											: 'Hors ligne'}
									{/if}
								</p>
							</div>

							<!-- Action indicator -->
							<div class="flex-shrink-0">
								{#if isCreating}
									<Loader2 class="h-5 w-5 animate-spin text-primary" />
								{:else if hasActive}
									<span class="text-xs text-amber-500">Voir l'échange</span>
								{:else}
									<ArrowLeftRight class="h-5 w-5 text-muted-foreground" />
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="mt-4">
			<Button variant="outline" onclick={onClose} disabled={isCreatingTrade}>Annuler</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
