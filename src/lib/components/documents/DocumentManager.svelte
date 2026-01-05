<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Search, RefreshCw, FileText, Upload } from 'lucide-svelte';
	import DocumentUploader from './DocumentUploader.svelte';
	import DocumentCard from './DocumentCard.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Document {
		id: string;
		title: string;
		sourceType: string;
		grades: string[];
		topics: string[];
		enabledForRag: boolean;
		chunkCount: number;
		metadata?: Record<string, unknown>;
		createdAt: string;
		updatedAt: string;
	}

	interface Pagination {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	}

	let documents = $state<Document[]>([]);
	let pagination = $state<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
	let isLoading = $state(false);
	let searchQuery = $state('');
	let activeTab = $state('list');

	// Load documents on mount
	$effect(() => {
		loadDocuments();
	});

	async function loadDocuments(page = 1) {
		isLoading = true;

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: '20'
			});

			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/documents?${params}`);
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Erreur lors du chargement');
			}

			documents = result.documents;
			pagination = result.pagination;
		} catch (error) {
			console.error('Load error:', error);
			toaster.error('Erreur lors du chargement des documents');
		} finally {
			isLoading = false;
		}
	}

	function handleSearch() {
		loadDocuments(1);
	}

	function handleDocumentDeleted(id: string) {
		documents = documents.filter((d) => d.id !== id);
		pagination.total = Math.max(0, pagination.total - 1);
	}

	function handleDocumentUpdated() {
		// Refresh list
		loadDocuments(pagination.page);
	}

	function handleUploadComplete() {
		// Switch to list tab and refresh
		activeTab = 'list';
		loadDocuments(1);
	}

	function goToPage(page: number) {
		if (page >= 1 && page <= pagination.totalPages) {
			loadDocuments(page);
		}
	}
</script>

<div class="space-y-6">
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="list">
				<FileText class="mr-2 h-4 w-4" />
				Mes documents ({pagination.total})
			</Tabs.Trigger>
			<Tabs.Trigger value="upload">
				<Upload class="mr-2 h-4 w-4" />
				Téléverser
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="list" class="space-y-4">
			<!-- Search bar -->
			<div class="flex gap-2">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Rechercher..."
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && handleSearch()}
						class="pl-10"
					/>
				</div>
				<Button variant="outline" onclick={handleSearch}>Rechercher</Button>
				<Button variant="ghost" size="icon" onclick={() => loadDocuments(pagination.page)}>
					<RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
				</Button>
			</div>

			<!-- Document list -->
			{#if isLoading && documents.length === 0}
				<div class="py-12 text-center text-muted-foreground">Chargement...</div>
			{:else if documents.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<FileText class="mx-auto h-12 w-12 opacity-50" />
					<p class="mt-4">Aucun document</p>
					<p class="text-sm">Téléversez votre premier document pour commencer</p>
					<Button variant="outline" class="mt-4" onclick={() => (activeTab = 'upload')}>
						<Upload class="mr-2 h-4 w-4" />
						Téléverser un document
					</Button>
				</div>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each documents as doc (doc.id)}
						<DocumentCard
							document={doc}
							onDelete={handleDocumentDeleted}
							onUpdate={handleDocumentUpdated}
						/>
					{/each}
				</div>

				<!-- Pagination -->
				{#if pagination.totalPages > 1}
					<div class="flex items-center justify-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page <= 1}
							onclick={() => goToPage(pagination.page - 1)}
						>
							Précédent
						</Button>
						<span class="text-sm text-muted-foreground">
							Page {pagination.page} sur {pagination.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page >= pagination.totalPages}
							onclick={() => goToPage(pagination.page + 1)}
						>
							Suivant
						</Button>
					</div>
				{/if}
			{/if}
		</Tabs.Content>

		<Tabs.Content value="upload">
			<DocumentUploader onUploadComplete={handleUploadComplete} />
		</Tabs.Content>
	</Tabs.Root>
</div>
