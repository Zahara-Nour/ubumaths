<script lang="ts">
	import { friendsManager } from '$lib/stores/friends.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Check, X, Clock, UserPlus } from 'lucide-svelte';

	function getFriendshipTypeLabel(type: 'classmate' | 'mentor'): string {
		return type === 'classmate' ? 'Camarade' : 'Mentor';
	}

	async function handleAcceptRequest(friendshipId: string, friendName: string) {
		const success = await friendsManager.acceptRequest(friendshipId);
		if (success) {
			toaster.success(`Demande d'ami acceptée (${friendName})`);
		} else {
			toaster.error("Impossible d'accepter la demande");
		}
	}

	async function handleRejectRequest(friendshipId: string, friendName: string) {
		const success = await friendsManager.rejectRequest(friendshipId);
		if (success) {
			toaster.info(`Demande d'ami refusée (${friendName})`);
		} else {
			toaster.error('Impossible de refuser la demande');
		}
	}

	async function handleCancelRequest(friendshipId: string, friendName: string) {
		if (confirm(`Annuler la demande envoyée à ${friendName} ?`)) {
			const success = await friendsManager.cancelRequest(friendshipId);
			if (success) {
				toaster.info('Demande annulée');
			} else {
				toaster.error("Impossible d'annuler la demande");
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Incoming Requests -->
	<div>
		<h3 class="mb-3 text-lg font-semibold">Demandes reçues</h3>

		{#if friendsManager.pendingIncoming.length === 0}
			<div class="rounded-lg border border-border bg-card p-8 text-center">
				<UserPlus class="mx-auto size-12 text-muted-foreground" />
				<p class="mt-4 text-sm text-muted-foreground">Aucune demande d'ami en attente</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each friendsManager.pendingIncoming as request (request.id)}
					<div
						class="flex items-center justify-between rounded-lg border border-border bg-card p-4"
					>
						<div class="flex items-center gap-3">
							<!-- Avatar -->
							<Avatar.Root class="size-10">
								{#if request.friend_profile.avatar_url}
									<Avatar.Image
										src={request.friend_profile.avatar_url}
										alt={friendsManager.getDisplayName(request)}
									/>
								{/if}
								<Avatar.Fallback>
									{friendsManager.getDisplayName(request).charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>

							<!-- Name and Type -->
							<div>
								<p class="font-medium">{friendsManager.getDisplayName(request)}</p>
								<p class="text-sm text-muted-foreground">
									{getFriendshipTypeLabel(request.friendship_type)}
									{#if request.friend_profile.role === 'teacher'}
										• Enseignant
									{/if}
								</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex gap-2">
							<Button
								variant="default"
								size="sm"
								onclick={() =>
									handleAcceptRequest(request.id, friendsManager.getDisplayName(request))}
							>
								<Check class="mr-1 size-4" />
								Accepter
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() =>
									handleRejectRequest(request.id, friendsManager.getDisplayName(request))}
							>
								<X class="mr-1 size-4" />
								Refuser
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Sent Requests -->
	<div>
		<h3 class="mb-3 text-lg font-semibold">Demandes envoyées</h3>

		{#if friendsManager.pendingSent.length === 0}
			<div class="rounded-lg border border-border bg-card p-8 text-center">
				<Clock class="mx-auto size-12 text-muted-foreground" />
				<p class="mt-4 text-sm text-muted-foreground">Aucune demande en attente</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each friendsManager.pendingSent as request (request.id)}
					<div
						class="flex items-center justify-between rounded-lg border border-border bg-card p-4"
					>
						<div class="flex items-center gap-3">
							<!-- Avatar -->
							<Avatar.Root class="size-10">
								{#if request.friend_profile.avatar_url}
									<Avatar.Image
										src={request.friend_profile.avatar_url}
										alt={friendsManager.getDisplayName(request)}
									/>
								{/if}
								<Avatar.Fallback>
									{friendsManager.getDisplayName(request).charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>

							<!-- Name and Type -->
							<div>
								<p class="font-medium">{friendsManager.getDisplayName(request)}</p>
								<p class="text-sm text-muted-foreground">
									{getFriendshipTypeLabel(request.friendship_type)}
									{#if request.friend_profile.role === 'teacher'}
										• Enseignant
									{/if}
								</p>
							</div>
						</div>

						<!-- Status and Action -->
						<div class="flex items-center gap-3">
							<span class="text-sm text-muted-foreground">En attente...</span>
							<Button
								variant="ghost"
								size="sm"
								onclick={() =>
									handleCancelRequest(request.id, friendsManager.getDisplayName(request))}
							>
								Annuler
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
