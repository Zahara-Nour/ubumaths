<!--
	Construction Player Page
	=========================
	Displays a construction with the ConstructionPlayer component
	Includes controls for playback and parameter adjustment
-->

<script lang="ts">
	import type { PageData } from './$types';
	import ConstructionPlayer from '$lib/constructions/components/ConstructionPlayer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Edit, Trash2, Globe, Lock, User, Calendar } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	/**
	 * Handle construction deletion
	 */
	async function handleDelete() {
		if (
			!confirm(
				`Etes-vous sur de vouloir supprimer la construction "${data.construction.title}" ?\n\nCette action est irreversible.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/constructions/${data.construction.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				toaster.success('Construction supprimee');
				goto('/constructions');
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
	function formatAuthor(): string {
		if (!data.construction.profiles) return 'Auteur inconnu';
		const { firstname, lastname } = data.construction.profiles;
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
	<title>{data.construction.title} - Constructions - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header with back button and actions -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-4">
			<!-- Back Button -->
			<Button variant="ghost" href="/constructions" class="w-fit">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour aux constructions
			</Button>

			<!-- Title and metadata -->
			<div>
				<h1 class="text-2xl font-bold sm:text-3xl">{data.construction.title}</h1>
				<div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
					<div class="flex items-center gap-1">
						<User class="h-4 w-4" />
						<span>{formatAuthor()}</span>
					</div>
					<div class="flex items-center gap-1">
						<Calendar class="h-4 w-4" />
						<span>{formatDate(data.construction.created_at)}</span>
					</div>
					{#if data.construction.is_public}
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
		</div>

		<!-- Owner actions -->
		{#if data.isOwner}
			<div class="flex gap-2">
				<Button variant="outline" href="/constructions/{data.construction.id}/edit">
					<Edit class="mr-2 h-4 w-4" />
					Modifier
				</Button>
				<Button variant="destructive" onclick={handleDelete}>
					<Trash2 class="mr-2 h-4 w-4" />
					Supprimer
				</Button>
			</div>
		{/if}
	</div>

	<!-- Description -->
	{#if data.construction.description}
		<Card.Root class="mb-6">
			<Card.Content class="py-4">
				<p class="text-muted-foreground">{data.construction.description}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Construction Player -->
	<div class="flex justify-center">
		<Card.Root class="w-fit overflow-hidden">
			<Card.Content class="p-4 sm:p-6">
				<ConstructionPlayer
					script={data.construction.script}
					showGrid={true}
					showParameters={true}
					showControls={true}
				/>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Script info (for debugging/info purposes) -->
	{#if data.isOwner && data.construction.script}
		<Card.Root class="mt-6">
			<Card.Header>
				<Card.Title class="text-lg">Informations du script</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 text-sm sm:grid-cols-3">
					<div>
						<span class="font-medium">Version:</span>
						<span class="ml-2 text-muted-foreground">{data.construction.script.version}</span>
					</div>
					<div>
						<span class="font-medium">Etapes:</span>
						<span class="ml-2 text-muted-foreground"
							>{data.construction.script.steps?.length ?? 0}</span
						>
					</div>
					<div>
						<span class="font-medium">Canvas:</span>
						<span class="ml-2 text-muted-foreground">
							{data.construction.script.canvas?.width ?? 800} x {data.construction.script.canvas
								?.height ?? 600}
						</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
