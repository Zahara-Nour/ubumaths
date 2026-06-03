<script lang="ts">
	import { goto } from '$app/navigation';
	import NotebookView from '$lib/components/notebook/NotebookView.svelte';
	import ShareNotebookDialog from '$lib/components/notebook/ShareNotebookDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Share2, BarChart3, Eye, Pencil } from 'lucide-svelte';

	let { data } = $props();

	let shareDialogOpen = $state(false);
	let previewMode = $state(false);

	let isOwnerTeacher = $derived(data.isOwner && data.userRole === 'teacher');

	function handleBack() {
		goto('/python-notebook');
	}

	function handleShare() {
		shareDialogOpen = true;
	}

	function handleResults() {
		goto(`/python-notebook/${data.notebook.id}/results`);
	}

	function togglePreviewMode() {
		previewMode = !previewMode;
	}
</script>

<div class="container mx-auto max-w-7xl px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={handleBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold">{data.notebook.title}</h1>
				{#if data.notebook.description}
					<p class="mt-1 text-sm text-muted-foreground">{data.notebook.description}</p>
				{/if}
			</div>
		</div>
		{#if isOwnerTeacher}
			<div class="flex items-center gap-2">
				<Button
					variant={previewMode ? 'default' : 'outline'}
					onclick={togglePreviewMode}
					title={previewMode
						? "Quitter la vue élève et revenir à l'édition"
						: "Voir et tester le notebook tel qu'un élève le verra (sans enregistrer les vérifications)"}
				>
					{#if previewMode}
						<Pencil class="mr-2 h-4 w-4" />
						Retour édition
					{:else}
						<Eye class="mr-2 h-4 w-4" />
						Vue élève
					{/if}
				</Button>
				<Button variant="outline" onclick={handleResults}>
					<BarChart3 class="mr-2 h-4 w-4" />
					Résultats
				</Button>
				<Button variant="outline" onclick={handleShare}>
					<Share2 class="mr-2 h-4 w-4" />
					Partager
				</Button>
			</div>
		{/if}
	</div>

	<!-- Notebook -->
	<NotebookView
		notebookId={data.notebook.id}
		isReadonly={data.readonly}
		isTeacher={isOwnerTeacher}
		{previewMode}
	/>
</div>

<!-- Share Dialog -->
{#if data.isOwner && data.userRole === 'teacher'}
	<ShareNotebookDialog
		bind:open={shareDialogOpen}
		notebookId={data.notebook.id}
		notebookTitle={data.notebook.title}
	/>
{/if}
