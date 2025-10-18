<script lang="ts">
	import { friendsManager } from '$lib/stores/friends.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Search, UserPlus, Check, Clock, UserX } from 'lucide-svelte';
	import type { FriendshipType } from '$lib/types/database';

	let searchQuery = $state('');
	let searchResults = $state<
		Array<{
			id: string;
			full_name: string | null;
			firstname: string | null;
			lastname: string | null;
			avatar_url: string | null;
			role: 'student' | 'teacher' | 'admin';
			friendship_status?: 'pending' | 'accepted' | 'rejected' | null;
		}>
	>([]);
	let isSearching = $state(false);
	let selectedFriendshipType = $state<FriendshipType>('classmate');

	async function handleSearch() {
		if (!searchQuery || searchQuery.length < 2) {
			toaster.warning('Entrez au moins 2 caractères pour rechercher');
			return;
		}

		isSearching = true;
		searchResults = await friendsManager.searchUsers(searchQuery);
		isSearching = false;

		if (searchResults.length === 0) {
			toaster.info('Aucun utilisateur trouvé');
		}
	}

	async function handleSendRequest(userId: string, userName: string) {
		const success = await friendsManager.sendFriendRequest(userId, selectedFriendshipType);
		if (success) {
			toaster.success(`Demande d'ami envoyée à ${userName}`);
			// Refresh search results to update status
			searchResults = await friendsManager.searchUsers(searchQuery);
		} else {
			toaster.error('Impossible d\'envoyer la demande');
		}
	}

	function getDisplayName(user: (typeof searchResults)[0]): string {
		if (user.full_name) return user.full_name;
		if (user.firstname || user.lastname) {
			return `${user.firstname || ''} ${user.lastname || ''}`.trim();
		}
		return 'Utilisateur inconnu';
	}

	function getStatusBadge(status: 'pending' | 'accepted' | 'rejected' | null): {
		icon: any;
		label: string;
		class: string;
	} {
		switch (status) {
			case 'accepted':
				return {
					icon: Check,
					label: 'Déjà ami',
					class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
				};
			case 'pending':
				return {
					icon: Clock,
					label: 'En attente',
					class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
				};
			case 'rejected':
				return {
					icon: UserX,
					label: 'Refusée',
					class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
				};
			default:
				return { icon: null, label: '', class: '' };
		}
	}
</script>

<div class="space-y-4">
	<!-- Search Section -->
	<div class="space-y-3">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher par nom..."
					bind:value={searchQuery}
					class="pl-10"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
			</div>
			<Button onclick={handleSearch} disabled={isSearching}>
				{isSearching ? 'Recherche...' : 'Rechercher'}
			</Button>
		</div>

		<!-- Friendship Type Selector -->
		<div class="flex items-center gap-3">
			<label for="friendship-type" class="text-sm font-medium">Type de relation :</label>
			<Select.Root
				selected={{ value: selectedFriendshipType, label: selectedFriendshipType === 'classmate' ? 'Camarade' : 'Mentor' }}
				onSelectedChange={(v) => {
					if (v) selectedFriendshipType = v.value as FriendshipType;
				}}
			>
				<Select.Trigger class="w-48">
					<Select.Value placeholder="Sélectionner..." />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="classmate">Camarade</Select.Item>
					<Select.Item value="mentor">Mentor</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<!-- Search Results -->
	{#if searchResults.length > 0}
		<div class="space-y-2">
			<h3 class="text-sm font-medium text-muted-foreground">
				{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}
			</h3>

			{#each searchResults as user (user.id)}
				<div class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
					<div class="flex items-center gap-3">
						<!-- Avatar -->
						<Avatar.Root class="size-10">
							{#if user.avatar_url}
								<Avatar.Image src={user.avatar_url} alt={getDisplayName(user)} />
							{/if}
							<Avatar.Fallback>
								{getDisplayName(user).charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>

						<!-- Name and Role -->
						<div>
							<p class="font-medium">{getDisplayName(user)}</p>
							<p class="text-sm text-muted-foreground">
								{user.role === 'teacher' ? 'Enseignant' : 'Élève'}
							</p>
						</div>
					</div>

					<!-- Action or Status -->
					<div>
						{#if user.friendship_status}
							{@const badge = getStatusBadge(user.friendship_status)}
							<div class="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium {badge.class}">
								{#if badge.icon}
									<!-- Svelte 5: Components are dynamic by default -->
									<badge.icon class="size-4" />
								{/if}
								{badge.label}
							</div>
						{:else}
							<Button
								size="sm"
								onclick={() => handleSendRequest(user.id, getDisplayName(user))}
							>
								<UserPlus class="mr-1 size-4" />
								Ajouter
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else if searchQuery && !isSearching}
		<div class="rounded-lg border border-border bg-card p-8 text-center">
			<Search class="mx-auto size-12 text-muted-foreground" />
			<p class="mt-4 text-sm text-muted-foreground">
				Commencez à taper pour rechercher des utilisateurs
			</p>
		</div>
	{/if}
</div>
