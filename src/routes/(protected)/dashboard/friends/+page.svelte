<script lang="ts">
	import { onMount } from 'svelte';
	import { friendsManager } from '$lib/stores/friends.svelte';
	import { presenceManager } from '$lib/stores/presence.svelte';
	import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';
	import FriendsList from '$lib/components/FriendsList.svelte';
	import FriendRequests from '$lib/components/FriendRequests.svelte';
	import AddFriend from '$lib/components/AddFriend.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Users, UserPlus, Bell } from 'lucide-svelte';

	let { data } = $props();

	// Badge counts for tabs
	const pendingIncomingCount = $derived(friendsManager.pendingIncoming.length);

	onMount(async () => {
		// Initialize friends manager
		if (data.user && data.supabase) {
			friendsManager.init(data.supabase, data.user.id);
			await friendsManager.loadFriendships();

			// Initialize presence manager
			presenceManager.init(data.supabase, data.user.id);
			// Presence tracking started automatically in friendsManager.loadFriendships()
		}
	});

	// Cleanup effect
	$effect(() => {
		return () => {
			presenceManager.stopPresenceTracking();
			supabaseRealtimeManager.disconnect();
		};
	});
</script>

<div class="container mx-auto max-w-4xl p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Amis</h1>
		<p class="mt-1 text-muted-foreground">Gérez vos amis et restez connecté avec vos camarades</p>
	</div>

	<!-- Connection Status -->
	{#if supabaseRealtimeManager.connectionStatus !== 'connected'}
		<div class="mb-4 rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-950">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				{#if supabaseRealtimeManager.connectionStatus === 'connecting'}
					Connexion au système de présence...
				{:else}
					Déconnecté du système de présence. Les statuts en ligne ne seront pas affichés.
				{/if}
			</p>
		</div>
	{/if}

	<!-- Tabs -->
	<Tabs.Root value="friends" class="space-y-4">
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="friends" class="flex items-center gap-2">
				<Users class="size-4" />
				Mes amis
				<span class="ml-1 text-xs text-muted-foreground">
					({friendsManager.friendships.length})
				</span>
			</Tabs.Trigger>

			<Tabs.Trigger value="requests" class="relative flex items-center gap-2">
				<Bell class="size-4" />
				Demandes
				{#if pendingIncomingCount > 0}
					<span
						class="ml-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
					>
						{pendingIncomingCount}
					</span>
				{/if}
			</Tabs.Trigger>

			<Tabs.Trigger value="add" class="flex items-center gap-2">
				<UserPlus class="size-4" />
				Ajouter
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="friends">
			{#if friendsManager.loading}
				<div class="py-12 text-center">
					<p class="text-muted-foreground">Chargement...</p>
				</div>
			{:else}
				<FriendsList />
			{/if}
		</Tabs.Content>

		<Tabs.Content value="requests">
			{#if friendsManager.loading}
				<div class="py-12 text-center">
					<p class="text-muted-foreground">Chargement...</p>
				</div>
			{:else}
				<FriendRequests />
			{/if}
		</Tabs.Content>

		<Tabs.Content value="add">
			<AddFriend />
		</Tabs.Content>
	</Tabs.Root>
</div>
