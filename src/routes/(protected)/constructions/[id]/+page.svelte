<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import type { PageData } from './$types';
	import OldConstructionPlayer from '$lib/constructions/components/ConstructionPlayer.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Edit, Trash2, Globe, Lock, User, Calendar } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Lazy load DSL player (uses $state, can't SSR)
	let DslPlayer = $state<Component | null>(null);

	onMount(async () => {
		if (data.construction.format === 'dsl') {
			const mod = await import('$lib/constructions-v2/components/ConstructionPlayer.svelte');
			DslPlayer = mod.default;
		}
	});

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

	function formatAuthor(): string {
		if (!data.construction.profiles) return 'Auteur inconnu';
		const { firstname, lastname } = data.construction.profiles;
		if (firstname && lastname) return `${firstname} ${lastname}`;
		if (firstname) return firstname;
		if (lastname) return lastname;
		return 'Auteur inconnu';
	}

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
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-4">
			<Button variant="ghost" href="/constructions" class="w-fit">
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour aux constructions
			</Button>

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
					<Badge
						variant={data.construction.format === 'dsl' ? 'default' : 'outline'}
						class="text-xs"
					>
						{data.construction.format === 'dsl' ? 'DSL' : 'JSON'}
					</Badge>
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

	{#if data.construction.description}
		<Card.Root class="mb-6">
			<Card.Content class="py-4">
				<p class="text-muted-foreground">{data.construction.description}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="flex justify-center">
		<Card.Root class="w-fit overflow-hidden">
			<Card.Content class="p-4 sm:p-6">
				{#if data.construction.format === 'dsl' && data.construction.dsl_script}
					{#if DslPlayer}
						<DslPlayer script={data.construction.dsl_script} showGrid={true} showControls={true} />
					{:else}
						<div class="flex h-[400px] w-[600px] items-center justify-center">
							<p class="text-muted-foreground">Chargement du player...</p>
						</div>
					{/if}
				{:else}
					<OldConstructionPlayer
						script={data.construction.script}
						showGrid={true}
						showParameters={true}
						showControls={true}
					/>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
