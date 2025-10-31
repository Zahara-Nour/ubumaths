<script lang="ts">
	import { friendsManager } from '$lib/stores/friends.svelte';
	import OnlineStatus from './OnlineStatus.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { MoreVertical, Search, User } from 'lucide-svelte';
	import { resolve } from '$app/paths';

	let searchQuery = $state('');

	const filteredFriends = $derived(
		friendsManager.friendships.filter((friend) => {
			if (!searchQuery) return true;
			const displayName = friendsManager.getDisplayName(friend);
			return displayName.toLowerCase().includes(searchQuery.toLowerCase());
		})
	);

	function handleUnfriend(friendshipId: string, friendName: string) {
		if (confirm(`Êtes-vous sûr de vouloir retirer ${friendName} de vos amis ?`)) {
			friendsManager.unfriend(friendshipId);
		}
	}

	function getFriendshipTypeLabel(type: 'classmate' | 'mentor'): string {
		return type === 'classmate' ? 'Camarade' : 'Mentor';
	}
</script>

<div class="space-y-4">
	<!-- Search Bar -->
	<div class="relative">
		<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input type="text" placeholder="Rechercher un ami..." bind:value={searchQuery} class="pl-10" />
	</div>

	<!-- Friends List -->
	{#if filteredFriends.length === 0}
		<div class="py-12 text-center">
			<User class="mx-auto size-12 text-muted-foreground" />
			<p class="mt-4 text-sm text-muted-foreground">
				{searchQuery ? 'Aucun ami trouvé' : "Vous n'avez pas encore d'amis"}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredFriends as friend (friend.id)}
				<div
					class="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
				>
					<div class="flex items-center gap-3">
						<!-- Avatar -->
						<Avatar.Root class="size-10">
							{#if friend.friend_profile.avatar_url}
								<Avatar.Image
									src={friend.friend_profile.avatar_url}
									alt={friendsManager.getDisplayName(friend)}
								/>
							{/if}
							<Avatar.Fallback>
								{friendsManager.getDisplayName(friend).charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>

						<!-- Name and Status -->
						<div>
							<div class="flex items-center gap-2">
								<p class="font-medium">{friendsManager.getDisplayName(friend)}</p>
								<OnlineStatus status={friendsManager.getFriendPresence(friend.friend_profile.id)} />
							</div>
							<p class="text-sm text-muted-foreground">
								{getFriendshipTypeLabel(friend.friendship_type)}
								{#if friend.friend_profile.role === 'teacher'}
									• Enseignant
								{/if}
							</p>
						</div>
					</div>

					<!-- Actions Menu -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} variant="ghost" size="icon" class="cursor-pointer">
									<MoreVertical class="size-4" />
									<span class="sr-only">Actions</span>
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end">
							<DropdownMenu.Item>
								<a
									href={resolve(`/dashboard/profile/${friend.friend_profile.id}`)}
									class="flex w-full items-center"
								>
									Voir le profil
								</a>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								class="text-destructive"
								onclick={() => handleUnfriend(friend.id, friendsManager.getDisplayName(friend))}
							>
								Retirer des amis
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/each}
		</div>
	{/if}
</div>
