<script lang="ts">
	import { goto } from '$app/navigation';
	import NotebookView from '$lib/components/notebook/NotebookView.svelte';
	import ShareNotebookDialog from '$lib/components/notebook/ShareNotebookDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Share2 } from 'lucide-svelte';

	let { data } = $props();

	let shareDialogOpen = $state(false);

	function handleBack() {
		goto('/python-notebook');
	}

	function handleShare() {
		shareDialogOpen = true;
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
		{#if data.isOwner && data.userRole === 'teacher'}
			<Button variant="outline" onclick={handleShare}>
				<Share2 class="mr-2 h-4 w-4" />
				Partager
			</Button>
		{/if}
	</div>

	<!-- Notebook -->
	<NotebookView notebookId={data.notebook.id} readonly={data.readonly} />
</div>

<!-- Share Dialog -->
{#if data.isOwner && data.userRole === 'teacher'}
	<ShareNotebookDialog
		bind:open={shareDialogOpen}
		notebookId={data.notebook.id}
		notebookTitle={data.notebook.title}
	/>
{/if}
