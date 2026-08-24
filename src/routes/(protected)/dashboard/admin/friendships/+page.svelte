<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Trash2, Search, Users, AlertTriangle } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedClass = $state<string>('all');
	let deletingFriendshipId = $state<string | null>(null);

	// Class items for MySelect
	const classItems = $derived([
		{ value: 'all', label: `Tous les ${lore.entities.class}s` },
		...data.classes.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))
	]);

	const filteredFriendships = $derived(() => {
		let filtered = data.friendships;

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(f: { requester_name: string; addressee_name: string }) =>
					f.requester_name.toLowerCase().includes(query) ||
					f.addressee_name.toLowerCase().includes(query)
			);
		}

		// Filter by class
		if (selectedClass !== 'all') {
			filtered = filtered.filter(
				(f: { requester_class_ids: string[]; addressee_class_ids: string[] }) =>
					f.requester_class_ids.includes(selectedClass) ||
					f.addressee_class_ids.includes(selectedClass)
			);
		}

		return filtered;
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function handleDeleteFriendship(friendshipId: string) {
		// Future: Show confirmation dialog before deletion
		deletingFriendshipId = friendshipId;
	}

	// Friendships are a single relation type now ('friend'); legacy values map to "Ami".
	function getFriendshipTypeLabel(): string {
		return 'Ami';
	}

	function getStatusBadge(status: 'pending' | 'accepted' | 'rejected'): {
		label: string;
		class: string;
	} {
		switch (status) {
			case 'accepted':
				return {
					label: 'Acceptée',
					class: 'bg-success/10 text-success'
				};
			case 'pending':
				return {
					label: 'En attente',
					class: 'bg-warning/10 text-warning'
				};
			case 'rejected':
				return {
					label: 'Refusée',
					class: 'bg-destructive/10 text-destructive'
				};
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Modération des amitiés</h1>
		<p class="mt-1 text-muted-foreground">
			Visualisez et gérez toutes les relations d'amitié entre {lore.entities.student}s
		</p>
	</div>

	<!-- Stats -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-success/10 p-3">
					<Users class="size-6 text-success" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.accepted}</p>
					<p class="text-sm text-muted-foreground">Amitiés actives</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-warning/10 p-3">
					<AlertTriangle class="size-6 text-warning" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
					<p class="text-sm text-muted-foreground">En attente</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-info/10 p-3">
					<Users class="size-6 text-info" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.total}</p>
					<p class="text-sm text-muted-foreground">Total</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-4 flex flex-col gap-3 md:flex-row">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Rechercher par nom..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>

		<MySelect
			type="single"
			bind:value={selectedClass}
			items={classItems}
			placeholder="Filtrer par classe..."
			triggerClass="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
		/>
	</div>

	<!-- Friendships List -->
	{#if filteredFriendships().length === 0}
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<Users class="mx-auto size-12 text-muted-foreground" />
			<p class="mt-4 text-muted-foreground">
				{searchQuery || selectedClass !== 'all'
					? 'Aucune amitié trouvée avec ces filtres'
					: 'Aucune amitié enregistrée'}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredFriendships() as friendship (friendship.id)}
				{@const badge = getStatusBadge(friendship.status)}
				<div class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
					<div class="flex flex-1 items-center gap-6">
						<!-- Requester -->
						<div class="flex items-center gap-3">
							<UserAvatar
								avatar_url={friendship.requester_avatar}
								role={friendship.requester_role}
								firstname={friendship.requester_name}
								class="size-10"
							/>
							<div>
								<p class="font-medium">{friendship.requester_name}</p>
								<p class="text-sm text-muted-foreground">
									{friendship.requester_role === 'teacher' ? 'Enseignant' : lore.entities.student}
								</p>
							</div>
						</div>

						<!-- Arrow and Type -->
						<div class="flex items-center gap-2 text-muted-foreground">
							<span>→</span>
							<span class="text-xs">{getFriendshipTypeLabel()}</span>
							<span>→</span>
						</div>

						<!-- Addressee -->
						<div class="flex items-center gap-3">
							<UserAvatar
								avatar_url={friendship.addressee_avatar}
								role={friendship.addressee_role}
								firstname={friendship.addressee_name}
								class="size-10"
							/>
							<div>
								<p class="font-medium">{friendship.addressee_name}</p>
								<p class="text-sm text-muted-foreground">
									{friendship.addressee_role === 'teacher' ? 'Enseignant' : lore.entities.student}
								</p>
							</div>
						</div>

						<!-- Status Badge -->
						<div class="ml-auto">
							<span class="rounded-full px-3 py-1 text-xs font-medium {badge.class}">
								{badge.label}
							</span>
						</div>
					</div>

					<!-- Delete Button -->
					<form
						method="POST"
						action="?/deleteFriendship"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									toaster.success('Amitié supprimée');
									await invalidateAll();
								} else {
									toaster.error("Impossible de supprimer l'amitié");
								}
								deletingFriendshipId = null;
							};
						}}
					>
						<input type="hidden" name="friendshipId" value={friendship.id} />
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							class="text-destructive hover:bg-destructive/10"
							disabled={deletingFriendshipId === friendship.id}
						>
							<Trash2 class="size-4" />
							<span class="sr-only">{lore.actions.delete}</span>
						</Button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</div>
