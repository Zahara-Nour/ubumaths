<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { PlusCircle, Trash2, BookOpen, BarChart3 } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleCreate(): Promise<void> {
		isCreating = true;
		try {
			const response = await fetch('/api/python-notebooks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Nouveau notebook',
					description: '',
					is_public: false
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error || 'Erreur lors de la creation du notebook');
			}

			const result = await response.json();
			toaster.success('Notebook créé avec succès');
			void goto(`/python-notebook/${result.notebook.id}`);
		} catch (err) {
			console.error('Error creating notebook:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la creation du notebook');
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(id: string, title: string): Promise<void> {
		if (!confirm(`Supprimer le notebook « ${title} » ? Cette action est irréversible.`)) return;
		deletingId = id;
		try {
			const response = await fetch(`/api/python-notebooks/${id}`, { method: 'DELETE' });
			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.error || 'Erreur lors de la suppression du notebook');
			}
			toaster.success('Notebook supprimé');
			// Reload the page data without a full refresh.
			window.location.reload();
		} catch (err) {
			console.error('Error deleting notebook:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
		} finally {
			deletingId = null;
		}
	}

	function handleOpen(id: string): void {
		void goto(`/python-notebook/${id}`);
	}

	function handleResults(id: string): void {
		void goto(`/python-notebook/${id}/results`);
	}
</script>

<svelte:head>
	<title>Notebooks Python | UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-xl font-semibold">Mes notebooks Python</h2>
			<p class="text-sm text-muted-foreground">
				Notebooks que vous avez créés. Partagez-les avec une classe depuis la page d'un notebook.
			</p>
		</div>
		<Button onclick={handleCreate} disabled={isCreating}>
			<PlusCircle class="mr-2 h-4 w-4" />
			{isCreating ? 'Création...' : 'Nouveau notebook'}
		</Button>
	</div>

	{#if data.notebooks.length === 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Aucun notebook</Card.Title>
				<Card.Description>Créez votre premier notebook Python pour commencer.</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button onclick={handleCreate} disabled={isCreating}>
					<PlusCircle class="mr-2 h-4 w-4" />
					{isCreating ? 'Création...' : 'Créer mon premier notebook'}
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.notebooks as notebook (notebook.id)}
				<Card.Root class="flex flex-col transition-shadow hover:shadow-lg">
					<Card.Header>
						<div class="flex items-start justify-between gap-2">
							<button
								class="flex-1 text-left"
								onclick={() => handleOpen(notebook.id)}
								type="button"
								aria-label="Ouvrir le notebook {notebook.title}"
							>
								<Card.Title class="text-lg">{notebook.title}</Card.Title>
								{#if notebook.description}
									<Card.Description class="mt-1 line-clamp-2">
										{notebook.description}
									</Card.Description>
								{/if}
							</button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => handleDelete(notebook.id, notebook.title)}
								disabled={deletingId === notebook.id}
								aria-label="Supprimer le notebook"
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="flex-1">
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span>Modifié : {formatDate(notebook.updated_at)}</span>
							{#if notebook.is_public}
								<span class="rounded bg-primary/10 px-2 py-1 text-primary">Public</span>
							{/if}
						</div>
					</Card.Content>
					<Card.Footer class="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							class="flex-1"
							onclick={() => handleOpen(notebook.id)}
						>
							<BookOpen class="mr-2 h-4 w-4" />
							Ouvrir
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => handleResults(notebook.id)}
							aria-label="Voir les résultats"
							title="Résultats des checkpoints"
						>
							<BarChart3 class="h-4 w-4" />
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
