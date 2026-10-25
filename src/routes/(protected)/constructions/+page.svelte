<!--
	Constructions List Page
	=======================
	Le prof voit les constructions publiées et ses brouillons, avec les actions ;
	les autres comptes, les publiées seules (décision de David, 2026-10-24).
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
		FileUp,
		FlaskConical
	} from '@lucide/svelte';

	type Construction = PageData['constructions'][number];

	let { data }: { data: PageData } = $props();

	let publishedConstructions = $derived(data.constructions.filter((c) => c.is_public));
	// Vide pour qui n'est pas prof : le serveur et la RLS ne lui rendent que les publiées.
	let draftConstructions = $derived(data.constructions.filter((c) => !c.is_public));

	/**
	 * Handle construction deletion
	 */
	async function handleDelete(construction: Construction) {
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
				toaster.success('Construction supprimée');
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
	 * Format date for display
	 */
	// `created_at` est nullable en base : une construction sans horodatage
	// s'affiche avec un tiret plutôt qu'une « Invalid Date ».
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

{#snippet constructionCard(construction: Construction)}
	<Card.Root class="transition-shadow hover:shadow-md">
		<Card.Header class="pb-3">
			<div class="flex items-start justify-between gap-2">
				<div class="flex-1 space-y-1">
					<Card.Title class="line-clamp-1 text-lg">{construction.title}</Card.Title>
					<div class="flex items-center gap-2">
						{#if data.canAuthor}
							<Badge
								variant={construction.format === 'dsl' ? 'default' : 'outline'}
								class="text-xs"
							>
								{construction.format === 'dsl' ? 'DSL' : 'JSON'}
							</Badge>
						{/if}
						{#if construction.is_public}
							<Badge variant="secondary" class="gap-1">
								<Globe class="h-3 w-3" />
								Publiée
							</Badge>
						{:else}
							<Badge variant="outline" class="gap-1">
								<Lock class="h-3 w-3" />
								Brouillon
							</Badge>
						{/if}
					</div>
				</div>

				{#if data.canAuthor}
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
				{/if}
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
{/snippet}

<svelte:head>
	<title>Constructions geometriques - Chiphre</title>
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
		{#if data.canAuthor}
			<div class="flex flex-col gap-2 sm:flex-row">
				<Button variant="outline" href="/constructions/essais">
					<FlaskConical class="mr-2 h-4 w-4" />
					Essais
				</Button>
				<Button variant="outline" href="/constructions/conversion">
					<FileUp class="mr-2 h-4 w-4" />
					Importer XML
				</Button>
				<Button href="/constructions/new">
					<Plus class="mr-2 h-4 w-4" />
					Nouvelle construction
				</Button>
			</div>
		{/if}
	</div>

	<!-- Published Constructions Section -->
	<section class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">
			Publiées
			<span class="text-base font-normal text-muted-foreground">
				({publishedConstructions.length})
			</span>
		</h2>

		{#if publishedConstructions.length === 0}
			<Card.Root class="border-dashed">
				<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
					<Compass class="h-16 w-16 text-muted-foreground/50" />
					<h3 class="text-lg font-semibold">Aucune construction publiée</h3>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each publishedConstructions as construction (construction.id)}
					{@render constructionCard(construction)}
				{/each}
			</div>
		{/if}
	</section>

	<!-- Draft Constructions Section (prof seul) -->
	{#if data.canAuthor}
		<section>
			<h2 class="mb-4 text-xl font-semibold">
				Brouillons
				<span class="text-base font-normal text-muted-foreground">
					({draftConstructions.length})
				</span>
			</h2>

			{#if draftConstructions.length === 0}
				<p class="text-sm text-muted-foreground">Aucun brouillon.</p>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each draftConstructions as construction (construction.id)}
						{@render constructionCard(construction)}
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
