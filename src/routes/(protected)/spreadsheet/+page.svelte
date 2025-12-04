<script lang="ts">
	/**
	 * Spreadsheet List Page
	 *
	 * Lists all spreadsheets for the current user.
	 * Users can:
	 * - Create new spreadsheets
	 * - View existing spreadsheets
	 * - Delete spreadsheets
	 * - Open spreadsheets for editing
	 *
	 * Access: Students, Teachers, Admins only
	 */

	import { goto } from '$app/navigation';
	import { toaster } from '$lib/stores/toaster.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Plus, FileSpreadsheet, Trash2, Calendar } from 'lucide-svelte';

	let { data } = $props();

	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);

	/**
	 * Create a new spreadsheet and redirect to edit page
	 */
	async function createSpreadsheet() {
		isCreating = true;

		try {
			const response = await fetch('/api/spreadsheets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Nouveau tableur',
					description: ''
				})
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la creation');
			}

			const result = await response.json();
			toaster.success('Tableur cree');
			goto(`/spreadsheet/${result.spreadsheet.id}`);
		} catch (error) {
			console.error('Create error:', error);
			toaster.error('Erreur lors de la creation du tableur');
		} finally {
			isCreating = false;
		}
	}

	/**
	 * Delete a spreadsheet
	 */
	async function deleteSpreadsheet(id: string) {
		if (!confirm('Voulez-vous vraiment supprimer ce tableur ?')) {
			return;
		}

		deletingId = id;

		try {
			const response = await fetch(`/api/spreadsheets/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Erreur lors de la suppression');
			}

			toaster.success('Tableur supprime');

			// Reload the page to refresh the list
			window.location.reload();
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error('Erreur lors de la suppression');
		} finally {
			deletingId = null;
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Mes tableurs - UbuMaths</title>
	<meta name="description" content="Mes feuilles de calcul enregistrees" />
</svelte:head>

<div class="spreadsheet-list-page">
	<!-- Page Header -->
	<header class="page-header">
		<div>
			<h1 class="text-2xl font-bold">Mes tableurs</h1>
			<p class="text-sm text-muted-foreground">Gerez vos feuilles de calcul avec formules</p>
		</div>

		<Button onclick={createSpreadsheet} disabled={isCreating} class="gap-2">
			<Plus class="h-4 w-4" />
			Nouveau tableur
		</Button>
	</header>

	<!-- Spreadsheets List -->
	<div class="spreadsheets-grid">
		{#if data.spreadsheets.length === 0}
			<div class="empty-state">
				<FileSpreadsheet class="h-12 w-12 text-muted-foreground" />
				<p class="text-lg font-semibold">Aucun tableur</p>
				<p class="text-sm text-muted-foreground">Creez votre premier tableur pour commencer</p>
				<Button onclick={createSpreadsheet} disabled={isCreating} class="mt-4 gap-2">
					<Plus class="h-4 w-4" />
					Creer un tableur
				</Button>
			</div>
		{:else}
			{#each data.spreadsheets as spreadsheet (spreadsheet.id)}
				<div class="spreadsheet-card">
					<button class="card-content" onclick={() => goto(`/spreadsheet/${spreadsheet.id}`)}>
						<div class="card-header">
							<FileSpreadsheet class="h-5 w-5 text-primary" />
							<h3 class="font-semibold">{spreadsheet.name}</h3>
						</div>

						{#if spreadsheet.description}
							<p class="card-description text-sm text-muted-foreground">
								{spreadsheet.description}
							</p>
						{/if}

						<div class="card-footer text-xs text-muted-foreground">
							<Calendar class="h-3 w-3" />
							<span>Modifie {formatDate(spreadsheet.updated_at)}</span>
						</div>
					</button>

					<div class="card-actions">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => deleteSpreadsheet(spreadsheet.id)}
							disabled={deletingId === spreadsheet.id}
							class="gap-2 text-destructive hover:text-destructive"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	/* ==========================================================================
     Page Layout
     ========================================================================== */

	.spreadsheet-list-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	/* ==========================================================================
     Spreadsheets Grid
     ========================================================================== */

	.spreadsheets-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.spreadsheet-card {
		position: relative;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s;
	}

	.spreadsheet-card:hover {
		border-color: hsl(var(--primary));
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
		width: 100%;
		text-align: left;
		background: hsl(var(--card));
		cursor: pointer;
		border: none;
		transition: background 0.2s;
	}

	.card-content:hover {
		background: hsl(var(--accent));
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.card-description {
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.card-actions {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
	}

	/* ==========================================================================
     Empty State
     ========================================================================== */

	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		gap: 0.5rem;
	}

	/* ==========================================================================
     Responsive: Mobile
     ========================================================================== */

	@media (max-width: 768px) {
		.spreadsheet-list-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.spreadsheets-grid {
			grid-template-columns: 1fr;
		}

		.page-header h1 {
			font-size: 1.5rem;
		}
	}
</style>
