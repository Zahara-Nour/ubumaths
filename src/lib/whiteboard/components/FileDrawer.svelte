<script lang="ts">
	/**
	 * FileDrawer - Left sidebar for file management
	 *
	 * Features:
	 * - Google Drive file gallery with recent documents
	 * - Save/Load to Google Drive
	 * - Local file operations (new, save, open, export)
	 * - Export to Google Classroom
	 * - Collapsible sidebar
	 */

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { driveSyncService, type DriveFile } from '../services/drive-sync';
	import { getSyncStatusColor, getSyncStatusLabel } from '../utils/sync-state';
	import { generateThumbnail } from '../core/pdf-export';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ChevronLeft,
		ChevronRight,
		Cloud,
		CloudOff,
		Save,
		FilePlus,
		FolderOpen,
		Download,
		FileText,
		Loader2,
		LogIn,
		GraduationCap,
		RefreshCw
	} from 'lucide-svelte';
	import ExportDialog from './ExportDialog.svelte';
	import ExportToClassroomDialog from './ExportToClassroomDialog.svelte';
	import SaveAsDialog from './SaveAsDialog.svelte';

	// ==========================================================================
	// State
	// ==========================================================================

	/** Drive files for gallery */
	let driveFiles = $state<DriveFile[]>([]);
	let isLoadingFiles = $state(false);
	let selectedFileId = $state<string | null>(null);

	/** Google connection status */
	let googleConnected = $state(false);
	let isCheckingConnection = $state(true);

	/** Dialog states */
	let exportDialogOpen = $state(false);
	let exportToClassroomDialogOpen = $state(false);
	let saveAsDialogOpen = $state(false);

	/** Operation states */
	let isSavingToDrive = $state(false);
	let loadingFileId = $state<string | null>(null);

	/** File input reference */
	let ubwInputRef: HTMLInputElement | null = null;

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let fileDrawerVisible = $derived(whiteboardStore.fileDrawerVisible);
	let syncState = $derived(whiteboardStore.syncState);
	let hasUnsavedChanges = $derived(whiteboardStore.hasUnsavedChanges);

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		checkGoogleConnection();
	});

	// Load files when drawer opens
	$effect(() => {
		if (fileDrawerVisible && googleConnected && driveFiles.length === 0) {
			loadDriveFiles();
		}
	});

	// ==========================================================================
	// Connection Check
	// ==========================================================================

	async function checkGoogleConnection() {
		isCheckingConnection = true;
		try {
			const response = await fetch('/api/google/auth/status');
			if (response.ok) {
				const data = await response.json();
				googleConnected = data.connected === true;
				// If connected, update sync state to allow auto-sync
				if (googleConnected && syncState.status === 'disconnected') {
					whiteboardStore.connectToDrive();
				}
			} else {
				googleConnected = false;
			}
		} catch {
			googleConnected = false;
		} finally {
			isCheckingConnection = false;
		}
	}

	// ==========================================================================
	// Drive Files
	// ==========================================================================

	async function loadDriveFiles() {
		if (!googleConnected) return;

		isLoadingFiles = true;
		try {
			driveFiles = await driveSyncService.listFiles();
		} catch (e) {
			console.error('Failed to load drive files:', e);
			toaster.error('Impossible de charger les fichiers');
		} finally {
			isLoadingFiles = false;
		}
	}

	async function handleRefreshFiles() {
		await loadDriveFiles();
	}

	function handleSelectFile(file: DriveFile) {
		selectedFileId = selectedFileId === file.id ? null : file.id;
	}

	async function handleOpenFile(file: DriveFile) {
		if (hasUnsavedChanges) {
			if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?')) {
				return;
			}
		}

		loadingFileId = file.id;

		try {
			const result = await driveSyncService.loadFromDrive(file.id);

			if (result.success && result.document) {
				whiteboardStore.loadDocument(result.document);
				whiteboardStore.connectToDrive(file.id);
				whiteboardStore.setSyncSuccess(file.id, result.modifiedTime!);
				toaster.success('Document chargé');
				selectedFileId = null;
			} else {
				toaster.error(result.error || 'Erreur de chargement');
			}
		} catch {
			toaster.error('Erreur lors du chargement');
		} finally {
			loadingFileId = null;
		}
	}

	// ==========================================================================
	// Drive Operations
	// ==========================================================================

	async function handleSaveToDrive() {
		const doc = whiteboardStore.document;
		if (!doc) return;

		isSavingToDrive = true;

		try {
			// Generate thumbnail of first page
			let thumbnailDataUrl: string | undefined;
			const firstPage = doc.pages[0];
			if (firstPage) {
				const thumbResult = await generateThumbnail(firstPage, doc, { width: 200, quality: 0.7 });
				if (thumbResult.success && thumbResult.dataUrl) {
					thumbnailDataUrl = thumbResult.dataUrl;
					console.log(`[FileDrawer] Generated thumbnail: ${thumbResult.sizeBytes} bytes`);
				}
			}

			const result = await driveSyncService.saveToDrive({
				document: doc,
				fileName: doc.title || 'Sans titre',
				fileId: syncState.driveFileId || undefined,
				thumbnail: thumbnailDataUrl
			});

			if (result.success) {
				whiteboardStore.setSyncSuccess(result.fileId!, result.modifiedTime!);
				toaster.success('Sauvegardé sur Drive');
				// Refresh file list to show updated time and thumbnail
				await loadDriveFiles();
			} else {
				whiteboardStore.setSyncError(result.error || 'Erreur de sauvegarde');
				toaster.error(result.error || 'Erreur de sauvegarde');
			}
		} finally {
			isSavingToDrive = false;
		}
	}

	function handleSaveAsToDrive() {
		saveAsDialogOpen = true;
	}

	async function handleSaveAsConfirm(fileName: string) {
		const doc = whiteboardStore.document;
		if (!doc) return;

		isSavingToDrive = true;

		try {
			// Generate thumbnail of first page
			let thumbnailDataUrl: string | undefined;
			const firstPage = doc.pages[0];
			if (firstPage) {
				const thumbResult = await generateThumbnail(firstPage, doc, { width: 200, quality: 0.7 });
				if (thumbResult.success && thumbResult.dataUrl) {
					thumbnailDataUrl = thumbResult.dataUrl;
				}
			}

			const result = await driveSyncService.saveToDrive({
				document: doc,
				fileName,
				fileId: undefined, // Force new file
				thumbnail: thumbnailDataUrl
			});

			if (result.success) {
				whiteboardStore.setTitle(fileName.replace(/\.ubw$/, ''));
				whiteboardStore.connectToDrive(result.fileId, syncState.driveFolderId || undefined);
				whiteboardStore.setSyncSuccess(result.fileId!, result.modifiedTime!);
				toaster.success('Document créé sur Drive');
				saveAsDialogOpen = false;
				// Refresh file list
				await loadDriveFiles();
			} else {
				toaster.error(result.error || 'Erreur de sauvegarde');
			}
		} finally {
			isSavingToDrive = false;
		}
	}

	// ==========================================================================
	// Local File Operations
	// ==========================================================================

	function handleNewDocument() {
		if (hasUnsavedChanges) {
			if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?')) {
				return;
			}
		}

		const title = prompt('Nom du nouveau document:', 'Sans titre');
		if (title === null) return;

		whiteboardStore.createNew(title || 'Sans titre');
		toaster.success('Nouveau document créé');
	}

	function handleSaveDocument() {
		const doc = whiteboardStore.document;
		if (!doc) return;

		if (doc.title === 'Sans titre' || !doc.title) {
			const title = prompt('Nom du document:', doc.title || 'Sans titre');
			if (title === null) return;
			if (title) {
				whiteboardStore.setTitle(title);
			}
		}

		const result = whiteboardStore.saveToFile();
		if (result.success) {
			toaster.success('Document sauvegardé');
		} else {
			toaster.error(result.error || 'Erreur lors de la sauvegarde');
		}
	}

	function handleOpenDocument() {
		ubwInputRef?.click();
	}

	async function handleUbwFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (hasUnsavedChanges) {
			if (!confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?')) {
				input.value = '';
				return;
			}
		}

		try {
			const result = await whiteboardStore.loadFromFile(file);

			if (result.success) {
				toaster.success('Document chargé');
			} else {
				toaster.error(result.error || 'Erreur lors du chargement');
			}
		} catch (error) {
			console.error('File load error:', error);
			toaster.error('Erreur lors du chargement du fichier');
		} finally {
			input.value = '';
		}
	}

	// ==========================================================================
	// Navigation
	// ==========================================================================

	function handleConnectGoogle() {
		goto('/dashboard/teacher/settings/google');
	}

	function toggleDrawer() {
		whiteboardStore.toggleFileDrawer();
	}

	// ==========================================================================
	// Helpers
	// ==========================================================================

	function formatDate(isoDate: string): string {
		if (!isoDate) return '';
		const date = new Date(isoDate);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short'
		});
	}
</script>

<!-- Toggle button (left side) -->
<button
	type="button"
	class="file-drawer-toggle absolute top-1/2 left-0 z-10 -translate-y-1/2 rounded-r-md border border-l-0 border-border bg-background p-1 shadow-sm transition-transform hover:bg-accent"
	class:translate-x-0={!fileDrawerVisible}
	class:translate-x-[220px]={fileDrawerVisible}
	onclick={toggleDrawer}
	aria-label={fileDrawerVisible ? 'Masquer les fichiers' : 'Afficher les fichiers'}
	aria-expanded={fileDrawerVisible}
>
	{#if fileDrawerVisible}
		<ChevronLeft class="h-4 w-4" />
	{:else}
		<ChevronRight class="h-4 w-4" />
	{/if}
</button>

<!-- File Drawer -->
<aside
	class="file-drawer absolute top-0 bottom-0 left-0 flex w-[220px] flex-col border-r border-border bg-muted/30 transition-transform duration-200"
	class:translate-x-0={fileDrawerVisible}
	class:-translate-x-full={!fileDrawerVisible}
	aria-label="Gestion des fichiers"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-border px-3 py-2">
		<span class="text-sm font-medium">Fichiers</span>
		{#if googleConnected && !isLoadingFiles}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleRefreshFiles}
				title="Actualiser"
				aria-label="Actualiser la liste"
				class="h-7 w-7 p-0"
			>
				<RefreshCw class="h-4 w-4" />
			</Button>
		{/if}
	</div>

	<!-- Main content (scrollable) -->
	<div class="flex-1 overflow-y-auto">
		{#if isCheckingConnection}
			<!-- Loading connection status -->
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else if googleConnected}
			<!-- Sync Status -->
			<div
				class="flex items-center gap-2 border-b border-border px-3 py-2 text-sm {getSyncStatusColor(
					syncState
				)}"
			>
				{#if syncState.status === 'syncing'}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else if syncState.status === 'disconnected'}
					<CloudOff class="h-4 w-4" />
				{:else}
					<Cloud class="h-4 w-4" />
				{/if}
				<span class="truncate text-xs">{getSyncStatusLabel(syncState)}</span>
			</div>

			<!-- Drive Actions -->
			<div class="flex flex-col gap-1 border-b border-border px-3 py-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={handleSaveToDrive}
					disabled={isSavingToDrive}
					class="h-8 justify-start gap-2"
				>
					{#if isSavingToDrive}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Cloud class="h-4 w-4" />
					{/if}
					<span>Sauvegarder</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={handleSaveAsToDrive}
					class="h-8 justify-start gap-2"
				>
					<Save class="h-4 w-4" />
					<span>Enregistrer sous...</span>
				</Button>
			</div>

			<!-- Gallery Preview -->
			<div class="px-3 py-2">
				<span class="mb-2 block text-xs text-muted-foreground">Documents récents</span>
				{#if isLoadingFiles}
					<div class="flex items-center justify-center py-4">
						<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				{:else if driveFiles.length === 0}
					<p class="py-4 text-center text-xs text-muted-foreground">Aucun document</p>
				{:else}
					<div class="grid grid-cols-2 gap-2">
						{#each driveFiles.slice(0, 6) as file (file.id)}
							<button
								type="button"
								class="relative flex aspect-[3/4] flex-col overflow-hidden rounded border bg-white transition-all hover:border-primary"
								class:ring-2={selectedFileId === file.id || loadingFileId === file.id}
								class:ring-primary={selectedFileId === file.id && loadingFileId !== file.id}
								class:ring-blue-500={loadingFileId === file.id}
								class:opacity-75={loadingFileId && loadingFileId !== file.id}
								onclick={() => handleSelectFile(file)}
								ondblclick={() => handleOpenFile(file)}
								disabled={loadingFileId !== null}
								title="{file.name}\nDouble-clic pour ouvrir"
							>
								<!-- Loading overlay -->
								{#if loadingFileId === file.id}
									<div class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
										<Loader2 class="h-6 w-6 animate-spin text-blue-500" />
									</div>
								{/if}
								<!-- Thumbnail or fallback icon -->
								<div class="flex flex-1 items-center justify-center overflow-hidden bg-gray-50">
									{#if file.thumbnailUrl}
										<img
											src={file.thumbnailUrl}
											alt={file.name}
											class="h-full w-full object-contain"
											loading="lazy"
										/>
									{:else}
										<FileText class="h-6 w-6 text-muted-foreground" />
									{/if}
								</div>
								<!-- File info -->
								<div class="w-full border-t bg-white p-1">
									<span class="block w-full truncate text-center text-[9px]">
										{file.name.replace(/\.ubw$/, '')}
									</span>
									<span class="block text-center text-[8px] text-muted-foreground">
										{formatDate(file.modifiedTime)}
									</span>
								</div>
							</button>
						{/each}
					</div>
					{#if selectedFileId}
						<Button
							type="button"
							variant="default"
							size="sm"
							disabled={loadingFileId !== null}
							onclick={() => {
								const file = driveFiles.find((f) => f.id === selectedFileId);
								if (file) handleOpenFile(file);
							}}
							class="mt-2 w-full"
						>
							{#if loadingFileId === selectedFileId}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Chargement...
							{:else}
								Ouvrir
							{/if}
						</Button>
					{/if}
				{/if}
			</div>

			<!-- Export Classroom -->
			<div class="border-t border-border px-3 py-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (exportToClassroomDialogOpen = true)}
					class="h-8 w-full justify-start gap-2"
				>
					<GraduationCap class="h-4 w-4" />
					<span>Publier sur Classroom</span>
				</Button>
			</div>
		{:else}
			<!-- Not connected to Google -->
			<div class="flex flex-col items-center gap-3 px-3 py-6 text-center">
				<CloudOff class="h-8 w-8 text-muted-foreground" />
				<p class="text-xs text-muted-foreground">
					Connectez Google Drive pour synchroniser vos documents
				</p>
				<Button
					type="button"
					variant="default"
					size="sm"
					onclick={handleConnectGoogle}
					class="gap-2"
				>
					<LogIn class="h-4 w-4" />
					<span>Se connecter</span>
				</Button>
			</div>
		{/if}
	</div>

	<!-- Local Section (footer) -->
	<div class="border-t border-border px-3 py-2">
		<div class="flex flex-col gap-1">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleNewDocument}
				class="h-8 justify-start gap-2"
			>
				<FilePlus class="h-4 w-4" />
				<span>Nouveau</span>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleSaveDocument}
				class="h-8 justify-start gap-2"
			>
				<Save class="h-4 w-4" />
				<span>Enregistrer (.ubw)</span>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={handleOpenDocument}
				class="h-8 justify-start gap-2"
			>
				<FolderOpen class="h-4 w-4" />
				<span>Ouvrir (.ubw)</span>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => (exportDialogOpen = true)}
				class="h-8 justify-start gap-2"
			>
				<Download class="h-4 w-4" />
				<span>Exporter...</span>
			</Button>
		</div>
	</div>
</aside>

<!-- Hidden file input -->
<input
	bind:this={ubwInputRef}
	type="file"
	accept=".ubw"
	onchange={handleUbwFileSelect}
	class="hidden"
	aria-hidden="true"
/>

<!-- Dialogs -->
<ExportDialog bind:open={exportDialogOpen} />
<ExportToClassroomDialog bind:open={exportToClassroomDialogOpen} />
<SaveAsDialog
	bind:open={saveAsDialogOpen}
	defaultName={whiteboardStore.document?.title || 'Sans titre'}
	saving={isSavingToDrive}
	onSave={handleSaveAsConfirm}
	onClose={() => (saveAsDialogOpen = false)}
/>

<style>
	.file-drawer {
		/* Ensure drawer stays above canvas but below modals */
		z-index: 20;
	}

	.file-drawer-toggle {
		/* Ensure toggle button is above drawer */
		z-index: 21;
	}
</style>
