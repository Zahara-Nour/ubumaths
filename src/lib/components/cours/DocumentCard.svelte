<!--
	DocumentCard Component
	======================

	Card for displaying a chapter document.
	Shows file icon based on type, title, description,
	view/download buttons, and Google Drive badge if applicable.

	@module components/cours/DocumentCard
-->
<script lang="ts">
	import type { ChapterDocument } from '$lib/types/chapters';
	import { formatFileSize, getFileTypeLabel } from '$lib/types/chapters';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import {
		FileText,
		FileImage,
		FileVideo,
		File,
		ExternalLink,
		Download,
		Eye,
		Cloud
	} from 'lucide-svelte';

	// Props
	interface Props {
		document: ChapterDocument;
	}

	let { document }: Props = $props();

	// Get icon component based on MIME type
	function getFileIcon(mimeType: string | null): typeof File {
		if (!mimeType) return File;

		if (mimeType.startsWith('image/')) return FileImage;
		if (mimeType.startsWith('video/')) return FileVideo;
		if (mimeType === 'application/pdf') return FileText;
		if (mimeType.includes('document') || mimeType.includes('word')) return FileText;
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileText;
		if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;

		return File;
	}

	// Get color classes based on file type
	function getFileColorClasses(mimeType: string | null): { bg: string; text: string } {
		if (!mimeType) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' };

		if (mimeType === 'application/pdf') {
			return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' };
		}
		if (mimeType.startsWith('image/')) {
			return {
				bg: 'bg-purple-100 dark:bg-purple-900/30',
				text: 'text-purple-600 dark:text-purple-400'
			};
		}
		if (mimeType.startsWith('video/')) {
			return { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400' };
		}
		if (mimeType.includes('document') || mimeType.includes('word')) {
			return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
		}
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
			return {
				bg: 'bg-green-100 dark:bg-green-900/30',
				text: 'text-green-600 dark:text-green-400'
			};
		}
		if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
			return {
				bg: 'bg-orange-100 dark:bg-orange-900/30',
				text: 'text-orange-600 dark:text-orange-400'
			};
		}

		return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500' };
	}

	// Derived values
	const FileIcon = $derived(getFileIcon(document.mimeType));
	const colorClasses = $derived(getFileColorClasses(document.mimeType));
	const fileTypeLabel = $derived(getFileTypeLabel(document.mimeType));
	const fileSizeLabel = $derived(formatFileSize(document.fileSize));
	const isGoogleDrive = $derived(document.sourceType === 'google_drive');

	// Generate URLs
	const viewUrl = $derived.by(() => {
		if (isGoogleDrive && document.googleDriveUrl) {
			return document.googleDriveUrl;
		}
		if (document.storagePath) {
			return `/api/documents/${document.id}`;
		}
		return null;
	});

	const downloadUrl = $derived.by(() => {
		if (document.storagePath) {
			return `/api/documents/${document.id}?download`;
		}
		return null;
	});
</script>

<Card.Root class="overflow-hidden transition-shadow hover:shadow-md">
	<div class="flex items-start gap-4 p-4">
		<!-- File type icon -->
		<div class={cn('flex-shrink-0 rounded-lg p-3', colorClasses.bg)}>
			<FileIcon class={cn('h-8 w-8', colorClasses.text)} />
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1 space-y-1">
			<!-- Title with Google Drive badge -->
			<div class="flex items-start gap-2">
				<h3 class="line-clamp-2 text-sm font-medium">
					{document.title}
				</h3>
				{#if isGoogleDrive}
					<Badge variant="secondary" class="flex-shrink-0 text-xs">
						<Cloud class="mr-1 h-3 w-3" />
						Drive
					</Badge>
				{/if}
			</div>

			<!-- Description -->
			{#if document.description}
				<p class="line-clamp-2 text-xs text-muted-foreground">
					{document.description}
				</p>
			{/if}

			<!-- File info -->
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span>{fileTypeLabel}</span>
				{#if document.fileSize}
					<span>-</span>
					<span>{fileSizeLabel}</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Action buttons -->
	<Card.Footer class="flex justify-end gap-2 bg-muted/50 px-4 py-2">
		{#if viewUrl}
			<Button variant="ghost" size="sm" href={viewUrl} target="_blank" rel="noopener noreferrer">
				{#if isGoogleDrive}
					<ExternalLink class="mr-1 h-4 w-4" />
					Ouvrir
				{:else}
					<Eye class="mr-1 h-4 w-4" />
					Voir
				{/if}
			</Button>
		{/if}

		{#if downloadUrl && !isGoogleDrive}
			<Button variant="outline" size="sm" href={downloadUrl}>
				<Download class="mr-1 h-4 w-4" />
				Telecharger
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
