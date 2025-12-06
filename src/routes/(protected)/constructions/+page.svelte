<!--
	Constructions List Page
	=======================
	Lists all constructions (user's own + public from others)
	with links to view/play each construction
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';
	import {
		Plus,
		MoreVertical,
		Edit,
		Trash2,
		Play,
		Globe,
		Lock,
		Compass,
		User
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Separate user's constructions from public ones by others
	let myConstructions = $derived(data.constructions.filter((c) => c.author_id === data.userId));
	let publicConstructions = $derived(
		data.constructions.filter((c) => c.author_id !== data.userId && c.is_public)
	);

	/**
	 * Handle construction deletion
	 */
	async function handleDelete(construction: (typeof data.constructions)[0]) {
		if (
			!confirm(
				`Etes-vous sur de vouloir supprimer la construction "${construction.title}" ?\n\nCette action est irreversible.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/constructions/${construction.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				toaster.success('Construction supprimee');
				await invalidateAll();
			} else {
				const result = await response.json();
				toaster.error(result.message || 'Erreur lors de la suppression');
			}
		} catch (err: unknown) {
			console.error('Delete error:', err);
			toaster.error('Erreur de connexion');
		}
	}

	/**
	 * Format author name
	 */
	function formatAuthor(construction: (typeof data.constructions)[0]): string {
		if (!construction.profiles) return 'Auteur inconnu';
		const { firstname, lastname } = construction.profiles;
		if (firstname && lastname) return `${firstname} ${lastname}`;
		if (firstname) return firstname;
		if (lastname) return lastname;
		return 'Auteur inconnu';
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Constructions geometriques - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-3xl font-bold">
				<Compass class="h-8 w-8 text-primary" />
				Constructions geometriques
			</h1>
			<p class="mt-2 text-muted-foreground">
				Visualisez des constructions geometriques animees etape par etape
			</p>
		</div>
		<Button href="/constructions/new">
			<Plus class="mr-2 h-4 w-4" />
			Nouvelle construction
		</Button>
	</div>

	<!-- Stats Cards -->
	<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">{myConstructions.length}</div>
				<p class="text-xs text-muted-foreground">Mes constructions</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">
					{myConstructions.filter((c) => c.is_public).length}
				</div>
				<p class="text-xs text-muted-foreground">Partagees publiquement</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="text-2xl font-bold">{publicConstructions.length}</div>
				<p class="text-xs text-muted-foreground">Constructions publiques</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- My Constructions Section -->
	<section class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">Mes constructions</h2>

		{#if myConstructions.length === 0}
			<Card.Root class="border-dashed">
				<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
					<Compass class="h-16 w-16 text-muted-foreground/50" />
					<div class="text-center">
						<h3 class="text-lg font-semibold">Aucune construction</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							Creez votre premiere construction geometrique
						</p>
					</div>
					<Button href="/constructions/new">
						<Plus class="mr-2 h-4 w-4" />
						Creer une construction
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each myConstructions as construction (construction.id)}
					<Card.Root class="transition-shadow hover:shadow-md">
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 space-y-1">
									<Card.Title class="line-clamp-1 text-lg">{construction.title}</Card.Title>
									<div class="flex items-center gap-2">
										{#if construction.is_public}
											<Badge variant="secondary" class="gap-1">
												<Globe class="h-3 w-3" />
												Public
											</Badge>
										{:else}
											<Badge variant="outline" class="gap-1">
												<Lock class="h-3 w-3" />
												Prive
											</Badge>
										{/if}
									</div>
								</div>

								<!-- Actions Dropdown -->
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
												<MoreVertical class="h-4 w-4" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item>
											<a href="/constructions/{construction.id}" class="flex items-center">
												<Play class="mr-2 h-4 w-4" />
												Visualiser
											</a>
										</DropdownMenu.Item>
										<DropdownMenu.Item>
											<a href="/constructions/{construction.id}/edit" class="flex items-center">
												<Edit class="mr-2 h-4 w-4" />
												Modifier
											</a>
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => handleDelete(construction)}
											class="text-destructive"
										>
											<Trash2 class="mr-2 h-4 w-4" />
											Supprimer
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</Card.Header>

						<Card.Content class="pb-3">
							{#if construction.description}
								<p class="line-clamp-2 text-sm text-muted-foreground">
									{construction.description}
								</p>
							{:else}
								<p class="text-sm text-muted-foreground/60 italic">Pas de description</p>
							{/if}
						</Card.Content>

						<Card.Footer class="flex items-center justify-between pt-0">
							<span class="text-xs text-muted-foreground">
								{formatDate(construction.created_at)}
							</span>
							<Button variant="outline" size="sm" href="/constructions/{construction.id}">
								<Play class="mr-1 h-3 w-3" />
								Visualiser
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Public Constructions Section -->
	{#if publicConstructions.length > 0}
		<section>
			<h2 class="mb-4 text-xl font-semibold">Constructions publiques</h2>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each publicConstructions as construction (construction.id)}
					<Card.Root class="transition-shadow hover:shadow-md">
						<Card.Header class="pb-3">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 space-y-1">
									<Card.Title class="line-clamp-1 text-lg">{construction.title}</Card.Title>
									<div class="flex items-center gap-2 text-xs text-muted-foreground">
										<User class="h-3 w-3" />
										<span>{formatAuthor(construction)}</span>
									</div>
								</div>
								<Badge variant="secondary" class="shrink-0 gap-1">
									<Globe class="h-3 w-3" />
									Public
								</Badge>
							</div>
						</Card.Header>

						<Card.Content class="pb-3">
							{#if construction.description}
								<p class="line-clamp-2 text-sm text-muted-foreground">
									{construction.description}
								</p>
							{:else}
								<p class="text-sm text-muted-foreground/60 italic">Pas de description</p>
							{/if}
						</Card.Content>

						<Card.Footer class="flex items-center justify-between pt-0">
							<span class="text-xs text-muted-foreground">
								{formatDate(construction.created_at)}
							</span>
							<Button variant="outline" size="sm" href="/constructions/{construction.id}">
								<Play class="mr-1 h-3 w-3" />
								Visualiser
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</section>
	{/if}
</div>
