<script lang="ts">
	/**
	 * FileDrawer - Sheet overlay for file management
	 *
	 * Features:
	 * - Google Drive file gallery with recent documents
	 * - Class-based folder organization
	 * - Save/Load to Google Drive
	 * - Local file operations (new, save, open, export)
	 * - Export to Google Classroom
	 * - Full-width overlay sheet for better UX
	 */

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { whiteboardStore } from '../stores/whiteboard.svelte';
	import { driveSyncService, type DriveFile } from '../services/drive-sync';
	import { getSyncStatusColor, getSyncStatusLabel } from '../utils/sync-state';
	import { generateThumbnail, exportToPdf } from '../core/pdf-export';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
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
		RefreshCw,
		Folder,
		FolderPlus,
		ArrowLeft,
		Sparkles,
		PanelLeftOpen
	} from 'lucide-svelte';
	import ExportDialog from './ExportDialog.svelte';
	import ExportToClassroomDialog from './ExportToClassroomDialog.svelte';
	import SaveAsDialog from './SaveAsDialog.svelte';
	import CreateFolderDialog from './CreateFolderDialog.svelte';
	import AutosaveRecoveryDialog from './AutosaveRecoveryDialog.svelte';
	import type { ClassForDrawer, DriveFolder } from '../types/drive';
	import type { AutosaveInfo } from '../services/drive-sync';
	import { findCurrentSchedule } from '$lib/utils/timeMatching';

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
	let createDocumentDialogOpen = $state(false);
	let saveAsDialogOpen = $state(false);
	let createFolderDialogOpen = $state(false);
	let autosaveRecoveryDialogOpen = $state(false);

	/** Autosave recovery state */
	let pendingFileToLoad = $state<DriveFile | null>(null);
	let pendingAutosaveInfo = $state<AutosaveInfo | null>(null);
	let isLoadingRecovery = $state(false);

	/** Operation states */
	let isSavingToDrive = $state(false);
	let loadingFileId = $state<string | null>(null);
	let isCreatingFolder = $state(false);
	let isExportingToClassroom = $state(false);

	/** File input reference */
	let ubwInputRef: HTMLInputElement | null = null;

	/** Class selection state */
	let classes = $state<ClassForDrawer[]>([]);
	let selectedClassId = $state<string | null>(null);
	let wasAutoDetected = $state(false);

	/** Folder navigation state */
	let folders = $state<DriveFolder[]>([]);
	let currentFolderId = $state<string | null>(null);
	let parentFolderId = $state<string | null>(null);
	let currentSubfolderName = $state<string | null>(null);

	/** Track if initial load has been done (to avoid infinite loop on empty folders) */
	let initialLoadDone = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	let fileDrawerVisible = $derived(whiteboardStore.fileDrawerVisible);
	let syncState = $derived(whiteboardStore.syncState);
	let hasUnsavedChanges = $derived(whiteboardStore.hasUnsavedChanges);

	/** Class items for MySelect */
	const classItems = $derived([
		{ value: '', label: 'Toutes les classes' },
		...classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	]);

	/** Selected class object */
	const selectedClass = $derived(classes.find((c) => c.id === selectedClassId));

	/** Check if we're in a subfolder (inside a class folder) */
	const isInSubfolder = $derived(currentFolderId !== null && parentFolderId !== null);

	/** Check if we can create subfolders (only in class folders, not in subfolders) */
	const canCreateSubfolder = $derived(
		selectedClassId !== null && currentFolderId !== null && !isInSubfolder
	);

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		checkGoogleConnection();
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
				// If drawer is already open, trigger initial load now
				// (handles case where user opened drawer before connection check completed)
				if (googleConnected && fileDrawerVisible) {
					triggerInitialLoadIfNeeded();
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
	// Classes
	// ==========================================================================

	async function loadClasses() {
		try {
			const response = await fetch('/api/whiteboard/classes-for-drawer');
			if (!response.ok) {
				throw new Error('Failed to load classes');
			}
			const data = await response.json();
			classes = data.classes || [];

			// Auto-detect current class based on schedule
			if (classes.length > 0) {
				const detected = findCurrentSchedule(classes);
				if (detected) {
					selectedClassId = detected.class.id;
					wasAutoDetected = true;
					// Load class folder
					await loadClassFolder(detected.class);
					return;
				}
			}

			// No auto-detection, load root folder
			await loadDriveFiles();
		} catch (e) {
			console.error('Failed to load classes:', e);
			// Still try to load files on error
			await loadDriveFiles();
		}
	}

	async function loadClassFolder(cls: ClassForDrawer) {
		isLoadingFiles = true;
		try {
			const folderId = await driveSyncService.getOrCreateClassFolder(cls.join_code, cls.name);
			currentFolderId = folderId;
			currentSubfolderName = null;
			await loadDriveFilesFromFolder(folderId);
		} catch (e) {
			console.error('Failed to load class folder:', e);
			toaster.error('Erreur lors du chargement du dossier');
			isLoadingFiles = false;
		}
	}

	async function handleClassChange(value: string) {
		selectedClassId = value || null;
		wasAutoDetected = false;
		currentSubfolderName = null;

		if (value && selectedClass) {
			// Load class folder
			await loadClassFolder(selectedClass);
		} else {
			// Load root folder (all classes)
			currentFolderId = null;
			parentFolderId = null;
			await loadDriveFiles();
		}
	}

	// ==========================================================================
	// Drive Files
	// ==========================================================================

	async function loadDriveFiles() {
		if (!googleConnected) return;

		isLoadingFiles = true;
		try {
			const result = await driveSyncService.listFiles(currentFolderId || undefined);
			driveFiles = result.files;
			folders = result.folders;
			parentFolderId = result.parentFolderId;
		} catch (e) {
			console.error('Failed to load drive files:', e);
			toaster.error('Impossible de charger les fichiers');
		} finally {
			isLoadingFiles = false;
		}
	}

	async function loadDriveFilesFromFolder(folderId: string) {
		isLoadingFiles = true;
		try {
			const result = await driveSyncService.listFiles(folderId);
			driveFiles = result.files;
			folders = result.folders;
			currentFolderId = result.currentFolderId;
			parentFolderId = result.parentFolderId;
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

	// ==========================================================================
	// Folder Navigation
	// ==========================================================================

	async function handleOpenFolder(folder: DriveFolder) {
		currentSubfolderName = folder.name;
		await loadDriveFilesFromFolder(folder.id);
	}

	async function handleGoBack() {
		currentSubfolderName = null;
		if (!selectedClassId || !selectedClass) {
			// Go back to root
			currentFolderId = null;
			parentFolderId = null;
			await loadDriveFiles();
		} else {
			// Go back to class folder
			const classFolderId = await driveSyncService.getOrCreateClassFolder(
				selectedClass.join_code,
				selectedClass.name
			);
			await loadDriveFilesFromFolder(classFolderId);
		}
	}

	async function handleCreateFolder(name: string) {
		if (!currentFolderId) return;

		isCreatingFolder = true;
		try {
			const result = await driveSyncService.createFolder(name, currentFolderId);
			if (result.success) {
				toaster.success(`Dossier "${name}" créé`);
				createFolderDialogOpen = false;
				// Refresh to show new folder
				await loadDriveFiles();
			} else {
				toaster.error(result.error || 'Erreur de création');
			}
		} finally {
			isCreatingFolder = false;
		}
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
			// Check for autosave before loading
			const autosaveInfo = await driveSyncService.findAutosave(file.id);

			if (
				autosaveInfo &&
				autosaveInfo.found &&
				autosaveInfo.isMoreRecent &&
				autosaveInfo.autosave
			) {
				// Autosave exists and is more recent - ask user what to do
				pendingFileToLoad = file;
				pendingAutosaveInfo = autosaveInfo;
				autosaveRecoveryDialogOpen = true;
				loadingFileId = null; // Reset loading state, dialog will handle it
				return;
			}

			// No autosave or original is more recent - load directly
			await loadFileDirectly(file);
		} catch {
			toaster.error('Erreur lors du chargement');
			loadingFileId = null;
		}
	}

	/**
	 * Load file directly without autosave check (used after user choice)
	 */
	async function loadFileDirectly(file: DriveFile) {
		try {
			const result = await driveSyncService.loadFromDrive(file.id);

			if (result.success && result.document) {
				whiteboardStore.loadDocument(result.document);
				// Pass currentFolderId so auto-sync knows where the file is located
				whiteboardStore.connectToDrive(file.id, currentFolderId || undefined);
				whiteboardStore.setSyncSuccess(file.id, result.modifiedTime!);
				toaster.success('Document chargé');
				selectedFileId = null;
				// Close drawer after loading
				whiteboardStore.toggleFileDrawer();
			} else {
				toaster.error(result.error || 'Erreur de chargement');
			}
		} finally {
			loadingFileId = null;
		}
	}

	/**
	 * Handle user choice to load original file (not autosave)
	 */
	async function handleLoadOriginal() {
		if (!pendingFileToLoad) return;

		isLoadingRecovery = true;
		const file = pendingFileToLoad;

		try {
			await loadFileDirectly(file);
			// DON'T delete the autosave here - user might want to load it later
			// Autosave will only be deleted when user manually saves
			autosaveRecoveryDialogOpen = false;
		} finally {
			isLoadingRecovery = false;
			pendingFileToLoad = null;
			pendingAutosaveInfo = null;
		}
	}

	/**
	 * Handle user choice to load autosave
	 */
	async function handleLoadAutosave() {
		if (!pendingFileToLoad || !pendingAutosaveInfo?.autosave) return;

		isLoadingRecovery = true;
		const originalFile = pendingFileToLoad;
		const autosaveFileId = pendingAutosaveInfo.autosave.id;

		try {
			// Load the autosave content
			const result = await driveSyncService.loadFromDrive(autosaveFileId);

			if (result.success && result.document) {
				whiteboardStore.loadDocument(result.document);
				// Connect to the ORIGINAL file but preserve the autosave file ID
				// This way:
				// 1. Manual saves go to the original file
				// 2. Auto-sync updates the existing autosave (not create new)
				// 3. Status stays 'modified' so user knows to save
				whiteboardStore.connectToDriveWithAutosave(
					originalFile.id,
					currentFolderId || undefined,
					autosaveFileId
				);
				toaster.success(
					'Autosave récupéré - pensez à sauvegarder pour conserver les modifications'
				);
				selectedFileId = null;
				autosaveRecoveryDialogOpen = false;
				// Close drawer after loading
				whiteboardStore.toggleFileDrawer();
			} else {
				toaster.error(result.error || 'Erreur de chargement');
			}
		} finally {
			isLoadingRecovery = false;
			pendingFileToLoad = null;
			pendingAutosaveInfo = null;
		}
	}

	/**
	 * Handle cancel of autosave recovery dialog
	 */
	function handleCancelRecovery() {
		autosaveRecoveryDialogOpen = false;
		pendingFileToLoad = null;
		pendingAutosaveInfo = null;
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
				}
			}

			const fileIdToUse = syncState.driveFileId || undefined;
			const folderIdToUse = currentFolderId || undefined;

			const result = await driveSyncService.saveToDrive({
				document: doc,
				fileName: doc.title || 'Sans titre',
				fileId: fileIdToUse,
				folderId: folderIdToUse,
				thumbnail: thumbnailDataUrl
			});

			if (result.success) {
				whiteboardStore.setSyncSuccess(result.fileId!, result.modifiedTime!);
				toaster.success('Sauvegardé sur Drive');
				// Delete autosave file (user has manually saved, autosave no longer needed)
				await whiteboardStore.deleteAutosaveIfExists();
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
				folderId: currentFolderId || undefined,
				thumbnail: thumbnailDataUrl
			});

			if (result.success) {
				whiteboardStore.setTitle(fileName.replace(/\.ubw$/, ''));
				whiteboardStore.connectToDrive(result.fileId, currentFolderId || undefined);
				whiteboardStore.setSyncSuccess(result.fileId!, result.modifiedTime!);
				toaster.success('Document créé sur Drive');
				// Delete any previous autosave (new file, fresh start)
				await whiteboardStore.deleteAutosaveIfExists();
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
		// Open the create document dialog
		createDocumentDialogOpen = true;
	}

	/**
	 * Parse document name to extract class join code and date
	 * Expected format: "{JOIN_CODE} - {YYYY-MM-DD}" or "{JOIN_CODE} - {YYYY-MM-DD} - ..."
	 * @returns { joinCode, date } or null if parsing fails
	 */
	function parseDocumentName(title: string): { joinCode: string; date: string } | null {
		// Pattern: "anything - YYYY-MM-DD" - capture everything before the date
		const match = title.match(/^(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})/);
		if (!match) return null;
		return {
			joinCode: match[1].trim(),
			date: match[2]
		};
	}

	/**
	 * Direct export to Classroom without modal
	 * Parses document name to extract class and date, then exports directly
	 */
	async function handleExportToClassroom() {
		const doc = whiteboardStore.document;
		if (!doc) {
			toaster.error('Aucun document à exporter');
			return;
		}

		// Parse document name
		const parsed = parseDocumentName(doc.title);
		if (!parsed) {
			toaster.error(
				'Le nom du document doit être au format "CODE - YYYY-MM-DD" (ex: 6AWB - 2026-01-17)'
			);
			return;
		}

		isExportingToClassroom = true;

		try {
			// Fetch classes to find the matching one
			const classesResponse = await fetch('/api/whiteboard/classes-with-course');
			if (!classesResponse.ok) {
				if (classesResponse.status === 401) {
					toaster.error('Veuillez vous connecter');
				} else {
					toaster.error('Impossible de charger les classes');
				}
				return;
			}

			const classesData = await classesResponse.json();
			const classesWithCourse = classesData.classes || [];

			// Find class by join code
			const matchingClass = classesWithCourse.find(
				(c: { join_code: string }) => c.join_code.toUpperCase() === parsed.joinCode
			);

			if (!matchingClass) {
				toaster.error(`Classe "${parsed.joinCode}" non trouvée ou non associée à Classroom`);
				return;
			}

			// Export to PDF
			const pdfResult = await exportToPdf(doc, {
				format: 'pdf',
				pages: 'all',
				includeInstruments: true
			});

			if (!pdfResult.success || !pdfResult.blob) {
				toaster.error(pdfResult.error || "Échec de l'export PDF");
				return;
			}

			// Check PDF size (max 3MB)
			const MAX_PDF_SIZE = 3 * 1024 * 1024;
			if (pdfResult.blob.size > MAX_PDF_SIZE) {
				const sizeMB = (pdfResult.blob.size / 1024 / 1024).toFixed(1);
				toaster.error(`Le PDF est trop volumineux (${sizeMB} Mo). Maximum: 3 Mo.`);
				return;
			}

			// Convert to base64
			const pdfBase64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(pdfResult.blob!);
			});

			// Call export API
			const response = await fetch('/api/whiteboard/export-to-classroom', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					pdfBase64,
					classId: matchingClass.id,
					date: parsed.date
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				toaster.error(errorData.message || `Erreur ${response.status}`);
				return;
			}

			const result = await response.json();
			toaster.success('Document publié sur Google Classroom');

			// Open in new tab
			if (result.alternateLink) {
				window.open(result.alternateLink, '_blank', 'noopener,noreferrer');
			}
		} catch (err) {
			console.error('[FileDrawer] Export to Classroom failed:', err);
			toaster.error("Une erreur est survenue lors de l'export");
		} finally {
			isExportingToClassroom = false;
		}
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
				// Close drawer
				whiteboardStore.toggleFileDrawer();
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

	/**
	 * Handle drawer open/close from Sheet component
	 * Follows: UI event → handler → side effect (explicit flow)
	 */
	function handleOpenChange(open: boolean) {
		if (open !== fileDrawerVisible) {
			whiteboardStore.toggleFileDrawer();
		}
		// When opening, trigger initial load
		if (open) {
			triggerInitialLoadIfNeeded();
		}
	}

	/**
	 * Handle drawer toggle from external button
	 * Follows: UI event → handler → side effect (explicit flow)
	 */
	function handleToggleDrawer() {
		const willOpen = !fileDrawerVisible;
		whiteboardStore.toggleFileDrawer();
		// When opening, trigger initial load
		if (willOpen) {
			triggerInitialLoadIfNeeded();
		}
	}

	/**
	 * Trigger initial data load (classes + files) if not already done
	 */
	function triggerInitialLoadIfNeeded() {
		if (googleConnected && !initialLoadDone) {
			initialLoadDone = true;
			loadClasses();
		}
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

<!-- Toggle button (always visible) -->
<button
	type="button"
	class="absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-md border border-border bg-background p-2 shadow-sm transition-all hover:bg-accent"
	onclick={handleToggleDrawer}
	aria-label="Ouvrir les fichiers"
>
	<PanelLeftOpen class="h-5 w-5" />
</button>

<!-- File Drawer Sheet -->
<Sheet.Root open={fileDrawerVisible} onOpenChange={handleOpenChange}>
	<Sheet.Content side="left" class="w-[450px] sm:max-w-[450px]">
		<Sheet.Header class="border-b pb-4">
			<div class="flex items-center justify-between pr-8">
				<Sheet.Title class="text-lg">Fichiers</Sheet.Title>
				{#if googleConnected && !isLoadingFiles}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={handleRefreshFiles}
						title="Actualiser"
						aria-label="Actualiser la liste"
						class="h-8 w-8 p-0"
					>
						<RefreshCw class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</Sheet.Header>

		<!-- Main content (scrollable) -->
		<div class="flex h-[calc(100vh-180px)] flex-col overflow-y-auto py-4">
			{#if isCheckingConnection}
				<!-- Loading connection status -->
				<div class="flex items-center justify-center py-12">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if googleConnected}
				<!-- Sync Status -->
				<div
					class="mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 {getSyncStatusColor(
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
					<span class="text-sm">{getSyncStatusLabel(syncState)}</span>
				</div>

				<!-- Class Selector -->
				{#if classes.length > 0}
					<div class="mb-4">
						<Label class="mb-2 block text-sm text-muted-foreground">Classe</Label>
						<div class="flex items-center gap-3">
							<div class="flex-1">
								<MySelect
									type="single"
									value={selectedClassId ?? ''}
									items={classItems}
									onValueChange={handleClassChange}
									placeholder="Toutes les classes"
								/>
							</div>
							{#if wasAutoDetected && selectedClassId}
								<div
									class="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
									title="Classe auto-détectée selon l'horaire"
								>
									<Sparkles class="h-3 w-3" />
									<span>Auto</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Subfolder Breadcrumb -->
				{#if isInSubfolder && currentSubfolderName}
					<div class="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
						<button
							type="button"
							onclick={handleGoBack}
							class="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
							title="Retour"
						>
							<ArrowLeft class="h-4 w-4" />
						</button>
						<Folder class="h-4 w-4 text-muted-foreground" />
						<span class="font-medium">{currentSubfolderName}</span>
					</div>
				{/if}

				<!-- Drive Actions -->
				<div class="mb-4 grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant="outline"
						onclick={handleSaveToDrive}
						disabled={isSavingToDrive}
						class="h-10 gap-2"
					>
						{#if isSavingToDrive}
							<Loader2 class="h-4 w-4 animate-spin" />
						{:else}
							<Cloud class="h-4 w-4" />
						{/if}
						<span>Sauvegarder</span>
					</Button>
					<Button type="button" variant="outline" onclick={handleSaveAsToDrive} class="h-10 gap-2">
						<Save class="h-4 w-4" />
						<span>Enregistrer sous...</span>
					</Button>
				</div>

				<!-- Export to Classroom -->
				<Button
					type="button"
					variant="secondary"
					onclick={handleExportToClassroom}
					disabled={isExportingToClassroom}
					class="mb-4 h-10 w-full gap-2"
				>
					{#if isExportingToClassroom}
						<Loader2 class="h-4 w-4 animate-spin" />
						<span>Publication...</span>
					{:else}
						<GraduationCap class="h-4 w-4" />
						<span>Publier sur Classroom</span>
					{/if}
				</Button>

				<!-- Folders Grid -->
				{#if folders.length > 0 && !isInSubfolder}
					<div class="mb-4">
						<span class="mb-2 block text-sm text-muted-foreground">Dossiers</span>
						<div class="grid grid-cols-3 gap-2">
							{#each folders as folder (folder.id)}
								<button
									type="button"
									class="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent active:scale-95"
									onclick={() => handleOpenFolder(folder)}
									title="Ouvrir le dossier"
								>
									<Folder class="h-5 w-5 shrink-0 text-amber-500" />
									<span class="truncate text-xs font-medium">{folder.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Create Folder Button -->
				{#if canCreateSubfolder}
					<div class="mb-4">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => (createFolderDialogOpen = true)}
							class="h-9 w-full gap-2"
						>
							<FolderPlus class="h-4 w-4" />
							<span>Nouveau dossier</span>
						</Button>
					</div>
				{/if}

				<!-- Gallery Preview -->
				<div class="flex-1">
					<span class="mb-3 block text-sm text-muted-foreground">
						{#if selectedClassId && !isInSubfolder}
							Documents de la classe
						{:else if isInSubfolder}
							Documents du dossier
						{:else}
							Documents récents
						{/if}
					</span>
					{#if isLoadingFiles}
						<div class="flex items-center justify-center py-8">
							<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					{:else if driveFiles.length === 0}
						<p class="py-8 text-center text-sm text-muted-foreground">Aucun document</p>
					{:else}
						<div class="grid grid-cols-3 gap-3">
							{#each driveFiles.slice(0, 9) as file (file.id)}
								<button
									type="button"
									class="relative flex aspect-[3/4] flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary hover:shadow-md"
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
											<Loader2 class="h-8 w-8 animate-spin text-blue-500" />
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
											<FileText class="h-10 w-10 text-muted-foreground" />
										{/if}
									</div>
									<!-- File info -->
									<div class="w-full border-t bg-card p-2">
										<span class="block w-full truncate text-center text-xs font-medium">
											{file.name.replace(/\.ubw$/, '')}
										</span>
										<span class="block text-center text-[10px] text-muted-foreground">
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
								disabled={loadingFileId !== null}
								onclick={() => {
									const file = driveFiles.find((f) => f.id === selectedFileId);
									if (file) handleOpenFile(file);
								}}
								class="mt-4 w-full"
							>
								{#if loadingFileId === selectedFileId}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Chargement...
								{:else}
									Ouvrir le document
								{/if}
							</Button>
						{/if}
						{#if driveFiles.length > 9}
							<p class="mt-3 text-center text-sm text-muted-foreground">
								+{driveFiles.length - 9} autres documents
							</p>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- Not connected to Google -->
				<div class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
					<CloudOff class="h-12 w-12 text-muted-foreground" />
					<div>
						<p class="mb-1 font-medium">Google Drive non connecté</p>
						<p class="text-sm text-muted-foreground">
							Connectez votre compte pour synchroniser vos documents
						</p>
					</div>
					<Button type="button" variant="default" onclick={handleConnectGoogle} class="gap-2">
						<LogIn class="h-4 w-4" />
						<span>Se connecter</span>
					</Button>
				</div>
			{/if}
		</div>

		<!-- Footer - Local operations -->
		<Sheet.Footer class="border-t pt-4">
			<div class="grid w-full grid-cols-4 gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={handleNewDocument}
					class="h-9 flex-col gap-1 p-1"
					title="Nouveau document"
				>
					<FilePlus class="h-4 w-4" />
					<span class="text-[10px]">Nouveau</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={handleSaveDocument}
					class="h-9 flex-col gap-1 p-1"
					title="Enregistrer localement"
				>
					<Save class="h-4 w-4" />
					<span class="text-[10px]">Local</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={handleOpenDocument}
					class="h-9 flex-col gap-1 p-1"
					title="Ouvrir un fichier local"
				>
					<FolderOpen class="h-4 w-4" />
					<span class="text-[10px]">Ouvrir</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onclick={() => (exportDialogOpen = true)}
					class="h-9 flex-col gap-1 p-1"
					title="Exporter (PDF, image...)"
				>
					<Download class="h-4 w-4" />
					<span class="text-[10px]">Export</span>
				</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

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
<ExportToClassroomDialog
	bind:open={createDocumentDialogOpen}
	mode="create"
	preselectedClassId={selectedClassId}
/>
<SaveAsDialog
	bind:open={saveAsDialogOpen}
	defaultName={whiteboardStore.document?.title || 'Sans titre'}
	saving={isSavingToDrive}
	onSave={handleSaveAsConfirm}
	onClose={() => (saveAsDialogOpen = false)}
/>
<CreateFolderDialog
	bind:open={createFolderDialogOpen}
	isCreating={isCreatingFolder}
	onFolderCreated={handleCreateFolder}
/>
{#if pendingFileToLoad && pendingAutosaveInfo?.autosave}
	<AutosaveRecoveryDialog
		bind:open={autosaveRecoveryDialogOpen}
		originalFileName={pendingFileToLoad.name.replace(/\.ubw$/, '')}
		originalModifiedTime={pendingAutosaveInfo.originalModifiedTime || ''}
		autosaveModifiedTime={pendingAutosaveInfo.autosave.modifiedTime}
		loading={isLoadingRecovery}
		onLoadOriginal={handleLoadOriginal}
		onLoadAutosave={handleLoadAutosave}
		onCancel={handleCancelRecovery}
	/>
{/if}
