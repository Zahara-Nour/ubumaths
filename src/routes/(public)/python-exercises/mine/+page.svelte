<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import { ExternalLink, Trash2, Plus, Copy, Pencil } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data } = $props();
	const exercises = $derived(data.exercises);

	let confirmingDelete = $state<string | null>(null); // exercise id
	let isDeleting = $state(false);

	const baseUrl = $derived.by(() => {
		if (typeof window === 'undefined') return '';
		return `${window.location.protocol}//${window.location.host}`;
	});

	function levelLabel(l: 'college' | 'lycee' | 'nsi' | 'etudiant'): string {
		return l === 'college' ? 'Collège' : l === 'lycee' ? 'Lycée' : l === 'nsi' ? 'NSI' : 'Étudiant';
	}

	async function handleCopyLink(id: string) {
		const url = `${baseUrl}/python-exercises/${id}`;
		try {
			await navigator.clipboard.writeText(url);
			toaster.success('Lien copié');
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}

	async function handleDelete() {
		if (!confirmingDelete || isDeleting) return;
		isDeleting = true;
		try {
			const res = await fetch(`/api/python-exercises/${confirmingDelete}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const message = await res.text();
				throw new Error(`HTTP ${res.status} : ${message || res.statusText}`);
			}
			toaster.success('Exercice supprimé');
			confirmingDelete = null;
			await invalidateAll();
		} catch (e) {
			toaster.error(e instanceof Error ? e.message : 'Erreur lors de la suppression');
		} finally {
			isDeleting = false;
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', {
				day: '2-digit',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	const exerciseToDelete = $derived(
		confirmingDelete ? exercises.find((e) => e.id === confirmingDelete) : null
	);
</script>

<svelte:head>
	<title>Mes {lore.learning.exercise}s Python – Chiphre</title>
</svelte:head>

<div class="container mx-auto p-4">
	<header class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div>
			<h1 class="text-2xl font-bold">Mes exercices Python</h1>
			<p class="text-sm text-muted-foreground">
				{exercises.length} exercice{exercises.length > 1 ? 's' : ''}
			</p>
		</div>
		<Button href="/python-exercises/new">
			<Plus class="mr-1 h-4 w-4" /> Créer un exercice
		</Button>
	</header>

	{#if exercises.length === 0}
		<div class="rounded-lg border border-dashed border-border p-8 text-center">
			<p class="mb-4 text-muted-foreground">Tu n'as pas encore créé d'exercice.</p>
			<Button href="/python-exercises/new">
				<Plus class="mr-1 h-4 w-4" /> Créer mon premier exercice
			</Button>
		</div>
	{:else}
		<ul class="space-y-2">
			{#each exercises as exercise (exercise.id)}
				<li class="rounded-md border border-border bg-card p-3">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<a href="/python-exercises/{exercise.id}" class="font-medium hover:underline">
									{exercise.title}
								</a>
								<Badge>{levelLabel(exercise.level)}</Badge>
								{#if !exercise.is_public}
									<Badge variant="outline">Privé</Badge>
								{/if}
								{#each exercise.tags as tag (tag)}
									<Badge variant="outline" class="text-xs">{tag}</Badge>
								{/each}
							</div>
							{#if exercise.description}
								<p class="mt-1 text-sm text-muted-foreground">{exercise.description}</p>
							{/if}
							<p class="mt-1 text-xs text-muted-foreground">
								Créé le {formatDate(exercise.created_at)}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => handleCopyLink(exercise.id)}
								aria-label="Copier le lien"
								title="Copier le lien partageable"
							>
								<Copy class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								href="/python-exercises/{exercise.id}"
								aria-label="Ouvrir l'exercice"
								title="Ouvrir l'exercice"
							>
								<ExternalLink class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								href="/python-exercises/{exercise.id}/edit"
								aria-label="Modifier l'exercice"
								title="Modifier l'exercice"
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (confirmingDelete = exercise.id)}
								aria-label="Supprimer"
								title="Supprimer"
								class="text-red-600 hover:text-red-700"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if exerciseToDelete}
	<ConfirmDialog
		open={confirmingDelete !== null}
		title="Supprimer cet exercice ?"
		description={`« ${exerciseToDelete.title} » sera définitivement supprimé. Le lien partagé cessera de fonctionner.`}
		confirmLabel={lore.actions.delete}
		cancelLabel={lore.actions.cancel}
		variant="destructive"
		onConfirm={handleDelete}
		onCancel={() => (confirmingDelete = null)}
	/>
{/if}
