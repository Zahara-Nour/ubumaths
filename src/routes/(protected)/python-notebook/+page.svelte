<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { PlusCircle, Trash2, ExternalLink, BookOpen } from 'lucide-svelte';

	let { data } = $props();

	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleCreateNotebook() {
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
				const error = await response.json();
				throw new Error(error.error || 'Erreur lors de la creation du notebook');
			}

			const result = await response.json();
			toaster.success('Notebook cree avec succes');
			goto(`/python-notebook/${result.notebook.id}`);
		} catch (err) {
			console.error('Error creating notebook:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la creation du notebook');
		} finally {
			isCreating = false;
		}
	}

	async function handleDeleteNotebook(notebookId: string) {
		if (!confirm('Etes-vous sur de vouloir supprimer ce notebook ?')) {
			return;
		}

		deletingId = notebookId;
		try {
			const response = await fetch(`/api/python-notebooks/${notebookId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Erreur lors de la suppression du notebook');
			}

			toaster.success('Notebook supprime avec succes');
			// Refresh page to update list
			window.location.reload();
		} catch (err) {
			console.error('Error deleting notebook:', err);
			toaster.error(
				err instanceof Error ? err.message : 'Erreur lors de la suppression du notebook'
			);
		} finally {
			deletingId = null;
		}
	}

	function handleOpenNotebook(notebookId: string) {
		goto(`/python-notebook/${notebookId}`);
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Mes Notebooks Python</h1>
			<p class="mt-2 text-muted-foreground">Créez et gérez vos notebooks Python interactifs</p>
		</div>
		{#if data.userRole === 'teacher'}
			<Button onclick={handleCreateNotebook} disabled={isCreating}>
				<PlusCircle class="mr-2 h-4 w-4" />
				{isCreating ? 'Creation...' : 'Nouveau Notebook'}
			</Button>
		{/if}
	</div>

	<!-- User's own notebooks -->
	{#if data.notebooks.length > 0}
		<div class="mb-8">
			<h2 class="mb-4 text-xl font-semibold">Mes notebooks</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.notebooks as notebook (notebook.id)}
					<Card.Root class="cursor-pointer transition-shadow hover:shadow-lg">
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="flex-1" onclick={() => handleOpenNotebook(notebook.id)}>
									<Card.Title class="text-lg">{notebook.title}</Card.Title>
									{#if notebook.description}
										<Card.Description class="mt-1 line-clamp-2">
											{notebook.description}
										</Card.Description>
									{/if}
								</div>
								{#if data.userRole === 'teacher'}
									<Button
										variant="ghost"
										size="icon"
										class="ml-2"
										onclick={() => handleDeleteNotebook(notebook.id)}
										disabled={deletingId === notebook.id}
									>
										<Trash2 class="h-4 w-4 text-destructive" />
									</Button>
								{/if}
							</div>
						</Card.Header>
						<Card.Content onclick={() => handleOpenNotebook(notebook.id)}>
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<span>Modifié: {formatDate(notebook.updated_at)}</span>
								{#if notebook.is_public}
									<span class="rounded bg-primary/10 px-2 py-1 text-primary">Public</span>
								{/if}
							</div>
						</Card.Content>
						<Card.Footer>
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								onclick={() => handleOpenNotebook(notebook.id)}
							>
								<BookOpen class="mr-2 h-4 w-4" />
								Ouvrir
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</div>
	{:else}
		<Card.Root class="mb-8">
			<Card.Header>
				<Card.Title>Aucun notebook</Card.Title>
				<Card.Description>
					{#if data.userRole === 'teacher'}
						Créez votre premier notebook Python pour commencer.
					{:else}
						Vous n'avez pas encore créé de notebook.
					{/if}
				</Card.Description>
			</Card.Header>
			{#if data.userRole === 'teacher'}
				<Card.Footer>
					<Button onclick={handleCreateNotebook} disabled={isCreating}>
						<PlusCircle class="mr-2 h-4 w-4" />
						{isCreating ? 'Creation...' : 'Creer mon premier notebook'}
					</Button>
				</Card.Footer>
			{/if}
		</Card.Root>
	{/if}

	<!-- Assigned notebooks (for students) -->
	{#if data.userRole === 'student' && data.assignedNotebooks.length > 0}
		<div>
			<h2 class="mb-4 text-xl font-semibold">Notebooks assignes</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.assignedNotebooks as notebook (notebook.id)}
					<Card.Root class="cursor-pointer transition-shadow hover:shadow-lg">
						<Card.Header onclick={() => handleOpenNotebook(notebook.id)}>
							<Card.Title class="text-lg">{notebook.title}</Card.Title>
							{#if notebook.description}
								<Card.Description class="mt-1 line-clamp-2">
									{notebook.description}
								</Card.Description>
							{/if}
						</Card.Header>
						<Card.Content onclick={() => handleOpenNotebook(notebook.id)}>
							<div class="space-y-2 text-xs text-muted-foreground">
								{#if notebook.profiles}
									<div>
										Auteur: {notebook.profiles.firstname}
										{notebook.profiles.lastname}
									</div>
								{/if}
								{#if notebook.assignment?.class_name}
									<div>Classe: {notebook.assignment.class_name}</div>
								{/if}
								{#if notebook.assignment?.readonly}
									<span class="rounded bg-yellow-100 px-2 py-1 text-yellow-800">
										Lecture seule
									</span>
								{/if}
							</div>
						</Card.Content>
						<Card.Footer>
							<Button
								variant="outline"
								size="sm"
								class="w-full"
								onclick={() => handleOpenNotebook(notebook.id)}
							>
								<ExternalLink class="mr-2 h-4 w-4" />
								Ouvrir
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
