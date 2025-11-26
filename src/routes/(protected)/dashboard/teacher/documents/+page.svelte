<script lang="ts">
	import { DocumentManager } from '$lib/components/documents';
	import { FileText } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Documents RAG | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div class="rounded-lg bg-primary/10 p-2">
			<FileText class="h-6 w-6 text-primary" />
		</div>
		<div>
			<h1 class="text-2xl font-bold">Documents RAG</h1>
			<p class="text-muted-foreground">
				Gérez les documents utilisés par le tuteur pédagogique pour fournir du contexte aux élèves
			</p>
		</div>
	</div>

	<!-- Info box -->
	<div class="rounded-lg border bg-muted/50 p-4">
		<h3 class="font-medium">Comment ça marche ?</h3>
		<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
			<li>• Téléversez vos documents (PDF, texte, markdown)</li>
			<li>• Le contenu est automatiquement découpé et indexé</li>
			<li>• Le tuteur utilise ces documents pour enrichir ses réponses</li>
			<li>• Filtrez par niveau et thème pour un contexte pertinent</li>
		</ul>
	</div>

	<!-- Document manager -->
	<DocumentManager />
</div>
