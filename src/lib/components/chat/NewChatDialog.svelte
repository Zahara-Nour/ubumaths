<!--
	NewChatDialog Component
	========================

	Dialog for selecting a friend to start a 1-on-1 chat with.
	Shows list of user's friends with search functionality.

	Props:
		- open: boolean
		- onOpenChange: (open: boolean) => void
		- onSelectFriend: (friendId: string) => void
		- supabase: SupabaseClient

	Features:
		- Load user's accepted friends
		- Search/filter friends
		- Display avatars and online status
		- Handle friend selection
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import OnlineStatus from '$lib/components/OnlineStatus.svelte';
	import { Search, MessageSquare } from 'lucide-svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	// Component Props
	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelectFriend: (friendId: string, friendName: string) => Promise<void>;
		supabase: SupabaseClient;
	}

	let { open = $bindable(), onOpenChange, onSelectFriend, supabase }: Props = $props();

	// Component State
	interface Friend {
		id: string;
		firstname: string;
		lastname: string;
		avatar_url: string | null;
		status: 'online' | 'offline';
	}

	let friends = $state<Friend[]>([]);
	let isLoading = $state(false);
	let searchQuery = $state('');
	let isCreating = $state(false);

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
				return;
			}

			if (!friendships || friendships.length === 0) {
				friends = [];
				return;
			}

			// Get current user ID
			const {
				data: { user }
			} = await supabase.auth.getUser();
			if (!user) return;

			// Extract friend IDs (other user in each friendship)
			const friendIds = friendships.map((f) =>
				f.requester_id === user.id ? f.addressee_id : f.requester_id
			);

			// Load friend profiles
			const { data: profiles, error: profilesError } = await supabase
				.from('profiles')
				.select('id, firstname, lastname, avatar_url')
				.in('id', friendIds);

			if (profilesError) {
				console.error('Error loading profiles:', profilesError);
				return;
			}

			// Load presence status
			const { data: presenceData, error: presenceError } = await supabase
				.from('user_presence')
				.select('user_id, status')
				.in('user_id', friendIds);

			if (presenceError) {
				console.error('Error loading presence:', presenceError);
			}

			// Create presence map
			const presenceMap = new Map<string, 'online' | 'offline'>();
			presenceData?.forEach((p) => {
				presenceMap.set(p.user_id, p.status as 'online' | 'offline');
			});

			// Combine data
			friends = (profiles || []).map((p) => ({
				id: p.id,
				firstname: p.firstname || '',
				lastname: p.lastname || '',
				avatar_url: p.avatar_url,
				status: presenceMap.get(p.id) || 'offline'
			}));
		} catch (error) {
			console.error('Exception loading friends:', error);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Filter friends based on search query
	 */
	let filteredFriends = $derived(() => {
		if (!searchQuery.trim()) {
			return friends;
		}

		const query = searchQuery.toLowerCase();
		return friends.filter(
			(f) => f.firstname.toLowerCase().includes(query) || f.lastname.toLowerCase().includes(query)
		);
	});

	/**
	 * Handle friend selection
	 */
	async function handleSelectFriend(friend: Friend): Promise<void> {
		isCreating = true;

		try {
			await onSelectFriend(friend.id, `${friend.firstname} ${friend.lastname}`);
			// Dialog will be closed by parent component
		} catch (error) {
			console.error('Error selecting friend:', error);
		} finally {
			isCreating = false;
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

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouvelle conversation</Dialog.Title>
			<Dialog.Description>
				Sélectionnez un ami pour démarrer une conversation privée.
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
				<div class="py-8 text-center text-muted-foreground">
					<p>Chargement...</p>
				</div>
			{:else if filteredFriends().length === 0}
				<div class="py-8 text-center text-muted-foreground">
					{#if searchQuery}
						<p>Aucun ami trouvé</p>
					{:else if friends.length === 0}
						<p class="mb-2">Vous n'avez pas encore d'amis</p>
						<p class="text-sm">Ajoutez des amis pour commencer à discuter !</p>
					{:else}
						<p>Aucun résultat</p>
					{/if}
				</div>
			{:else}
				<div class="space-y-2">
					{#each filteredFriends() as friend (friend.id)}
						<button
							onclick={() => handleSelectFriend(friend)}
							disabled={isCreating}
							class="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
						>
							<!-- Avatar with Online Status -->
							<div class="relative flex-shrink-0">
								<Avatar.Root class="h-10 w-10">
									{#if friend.avatar_url}
										<Avatar.Image
											src={friend.avatar_url}
											alt="{friend.firstname} {friend.lastname}"
										/>
									{/if}
									<Avatar.Fallback class="bg-primary/10 text-primary">
										{friend.firstname[0]?.toUpperCase() || '?'}
										{friend.lastname[0]?.toUpperCase() || ''}
									</Avatar.Fallback>
								</Avatar.Root>

								<div class="absolute -right-1 -bottom-1">
									<OnlineStatus userId={friend.id} size="sm" />
								</div>
							</div>

							<!-- Friend Info -->
							<div class="flex-1 overflow-hidden">
								<p class="truncate font-semibold">
									{friend.firstname}
									{friend.lastname}
								</p>
								<p class="text-sm text-muted-foreground">
									{friend.status === 'online' ? 'En ligne' : 'Hors ligne'}
								</p>
							</div>

							<!-- Message Icon -->
							<MessageSquare class="h-5 w-5 flex-shrink-0 text-muted-foreground" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="mt-4">
			<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isCreating}>
				Annuler
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
