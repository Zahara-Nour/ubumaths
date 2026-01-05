<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { FileText, Trash2, ToggleLeft, ToggleRight, Edit } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Document {
		id: string;
		title: string;
		sourceType: string;
		grades: string[];
		topics: string[];
		enabledForRag: boolean;
		chunkCount: number;
		createdAt: string;
	}

	interface Props {
		document: Document;
		onDelete?: (id: string) => void;
		onUpdate?: (id: string) => void;
	}

	let { document, onDelete, onUpdate }: Props = $props();

	let isDeleting = $state(false);
	let isToggling = $state(false);

	const sourceTypeLabels: Record<string, string> = {
		manual_upload: 'Téléversé',
		google_drive: 'Google Drive',
		markdown_doc: 'Documentation',
		exercise: 'Exercice',
		question_template: 'Question'
	};

	async function handleDelete() {
		if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
			return;
		}

		isDeleting = true;

		try {
			const response = await fetch('/api/documents', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId: document.id })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Erreur lors de la suppression');
			}

			toaster.success('Document supprimé');
			onDelete?.(document.id);
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
		} finally {
			isDeleting = false;
		}
	}

	async function handleToggle() {
		isToggling = true;

		try {
			const response = await fetch('/api/documents', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: document.id,
					enabledForRag: !document.enabledForRag
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Erreur lors de la mise à jour');
			}

			document.enabledForRag = !document.enabledForRag;
			toaster.success(document.enabledForRag ? 'Document activé' : 'Document désactivé');
			onUpdate?.(document.id);
		} catch (error) {
			console.error('Toggle error:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
		} finally {
			isToggling = false;
		}
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<Card.Root class="relative {!document.enabledForRag ? 'opacity-60' : ''}">
	<Card.Header class="pb-2">
		<div class="flex items-start justify-between gap-2">
			<div class="flex items-center gap-2">
				<FileText class="h-5 w-5 text-muted-foreground" />
				<Card.Title class="text-base">{document.title}</Card.Title>
			</div>
			<Badge variant="secondary" class="text-xs">
				{sourceTypeLabels[document.sourceType] || document.sourceType}
			</Badge>
		</div>
	</Card.Header>

	<Card.Content class="space-y-3">
		<!-- Stats -->
		<div class="flex items-center gap-4 text-sm text-muted-foreground">
			<span>{document.chunkCount} segments</span>
			<span>Créé le {formatDate(document.createdAt)}</span>
		</div>

		<!-- Grades -->
		{#if document.grades.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each document.grades as grade (grade)}
					<Badge variant="outline" class="text-xs">{grade}</Badge>
				{/each}
			</div>
		{/if}

		<!-- Topics -->
		{#if document.topics.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each document.topics as topic (topic)}
					<Badge variant="secondary" class="text-xs">{topic}</Badge>
				{/each}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex items-center gap-2 pt-2">
			<Button
				variant="ghost"
				size="sm"
				onclick={handleToggle}
				disabled={isToggling}
				title={document.enabledForRag ? 'Désactiver' : 'Activer'}
			>
				{#if document.enabledForRag}
					<ToggleRight class="h-4 w-4 text-green-600" />
				{:else}
					<ToggleLeft class="h-4 w-4" />
				{/if}
			</Button>

			<Button variant="ghost" size="sm" disabled title="Modifier (bientôt disponible)">
				<Edit class="h-4 w-4" />
			</Button>

			<Button
				variant="ghost"
				size="sm"
				onclick={handleDelete}
				disabled={isDeleting}
				class="text-destructive hover:text-destructive"
				title="Supprimer"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	</Card.Content>
</Card.Root>
