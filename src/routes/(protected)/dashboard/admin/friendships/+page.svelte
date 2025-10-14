<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Trash2, Search, Users, AlertTriangle } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedClass = $state<string>('all');
	let deletingFriendshipId = $state<string | null>(null);

	const filteredFriendships = $derived(() => {
		let filtered = data.friendships;

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(f) =>
					f.requester_name.toLowerCase().includes(query) ||
					f.addressee_name.toLowerCase().includes(query)
			);
		}

		// Filter by class
		if (selectedClass !== 'all') {
			filtered = filtered.filter(
				(f) =>
					f.requester_class_ids.includes(selectedClass) ||
					f.addressee_class_ids.includes(selectedClass)
			);
		}

		return filtered;
	});

	function handleDeleteFriendship(friendshipId: string) {
		deletingFriendshipId = friendshipId;
	}

	function getFriendshipTypeLabel(type: 'classmate' | 'mentor'): string {
		return type === 'classmate' ? 'Camarade' : 'Mentor';
	}

	function getStatusBadge(status: 'pending' | 'accepted' | 'rejected'): {
		label: string;
		class: string;
	} {
		switch (status) {
			case 'accepted':
				return {
					label: 'Acceptée',
					class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
				};
			case 'pending':
				return {
					label: 'En attente',
					class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
				};
			case 'rejected':
				return {
					label: 'Refusée',
					class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
				};
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Modération des amitiés</h1>
		<p class="mt-1 text-muted-foreground">
			Visualisez et gérez toutes les relations d'amitié entre élèves
		</p>
	</div>

	<!-- Stats -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-green-100 p-3 dark:bg-green-900">
					<Users class="size-6 text-green-600 dark:text-green-300" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.accepted}</p>
					<p class="text-sm text-muted-foreground">Amitiés actives</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900">
					<AlertTriangle class="size-6 text-yellow-600 dark:text-yellow-300" />
				</div>
				<div>
					<p class="text-2xl font-bold">{data.stats.pending}</p>
					<p class="text-sm text-muted-foreground">En attente</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-border bg-card p-4">
			<div class="flex items-center gap-3">
				<div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
					<Users class="size-6 text-blue-600 dark:text-blue-300" />
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
			<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input type="text" placeholder="Rechercher par nom..." bind:value={searchQuery} class="pl-10" />
		</div>

		<Select.Root
			selected={{ value: selectedClass, label: selectedClass === 'all' ? 'Toutes les classes' : data.classes.find(c => c.id === selectedClass)?.name || 'Toutes les classes' }}
			onSelectedChange={(v) => {
				if (v) selectedClass = v.value;
			}}
		>
			<Select.Trigger class="w-64">
				<Select.Value placeholder="Filtrer par classe..." />
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">Toutes les classes</Select.Item>
				{#each data.classes as classItem}
					<Select.Item value={classItem.id}>{classItem.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
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
				<div class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
					<div class="flex flex-1 items-center gap-6">
						<!-- Requester -->
						<div class="flex items-center gap-3">
							<Avatar.Root class="size-10">
								{#if friendship.requester_avatar}
									<Avatar.Image src={friendship.requester_avatar} alt={friendship.requester_name} />
								{/if}
								<Avatar.Fallback>
									{friendship.requester_name.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<div>
								<p class="font-medium">{friendship.requester_name}</p>
								<p class="text-sm text-muted-foreground">
									{friendship.requester_role === 'teacher' ? 'Enseignant' : 'Élève'}
								</p>
							</div>
						</div>

						<!-- Arrow and Type -->
						<div class="flex items-center gap-2 text-muted-foreground">
							<span>→</span>
							<span class="text-xs">{getFriendshipTypeLabel(friendship.friendship_type)}</span>
							<span>→</span>
						</div>

						<!-- Addressee -->
						<div class="flex items-center gap-3">
							<Avatar.Root class="size-10">
								{#if friendship.addressee_avatar}
									<Avatar.Image src={friendship.addressee_avatar} alt={friendship.addressee_name} />
								{/if}
								<Avatar.Fallback>
									{friendship.addressee_name.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							<div>
								<p class="font-medium">{friendship.addressee_name}</p>
								<p class="text-sm text-muted-foreground">
									{friendship.addressee_role === 'teacher' ? 'Enseignant' : 'Élève'}
								</p>
							</div>
						</div>

						<!-- Status Badge -->
						{@const badge = getStatusBadge(friendship.status)}
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
									toaster.error('Impossible de supprimer l\'amitié');
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
							<span class="sr-only">Supprimer</span>
						</Button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</div>
