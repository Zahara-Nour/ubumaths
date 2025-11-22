<!--
	ImageUploader Component
	=======================

	Drag-and-drop image uploader for exercise images.

	Features:
	- Drag-and-drop zone for images
	- Click-to-upload via file input
	- Upload progress indicator
	- Preview of uploaded image with dimensions
	- Error handling with user-friendly messages
	- Uses /api/exercises/images endpoint

	@see src/routes/api/exercises/images/+server.ts
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Upload, X, Image, Loader2, AlertCircle, CheckCircle } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	// Types
	interface UploadResult {
		success: boolean;
		data?: {
			url: string;
			width: number;
			height: number;
			aspectRatio: number;
			filename: string;
			size: number;
			mimeType: string;
		};
		error?: string;
	}

	type UploadStatus = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

	// Props
	interface Props {
		onUploadComplete?: (result: UploadResult['data']) => void;
		accept?: string;
		maxSize?: number; // in MB
	}

	let {
		onUploadComplete,
		accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
		maxSize = 5
	}: Props = $props();

	// State
	let status = $state<UploadStatus>('idle');
	let progress = $state(0);
	let uploadedData = $state<UploadResult['data'] | null>(null);
	let errorMessage = $state<string | null>(null);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let dropZoneEl = $state<HTMLDivElement | null>(null);

	// Derived
	const isUploading = $derived(status === 'uploading');
	const isDragging = $derived(status === 'dragging');
	const _hasResult = $derived(status === 'success' || status === 'error');

	/**
	 * Validate file before upload
	 */
	function validateFile(file: File): string | null {
		// Check file type
		const allowedTypes = accept.split(',').map((t) => t.trim());
		if (!allowedTypes.includes(file.type)) {
			return `Type de fichier non autorise. Types acceptes : JPEG, PNG, GIF, WebP, SVG`;
		}

		// Check file size
		const maxBytes = maxSize * 1024 * 1024;
		if (file.size > maxBytes) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
			return `Fichier trop volumineux (${sizeMB} Mo). Maximum : ${maxSize} Mo`;
		}

		return null;
	}

	/**
	 * Upload file to server
	 */
	async function uploadFile(file: File) {
		// Validate file
		const validationError = validateFile(file);
		if (validationError) {
			status = 'error';
			errorMessage = validationError;
			return;
		}

		// Reset state
		status = 'uploading';
		progress = 0;
		errorMessage = null;
		uploadedData = null;

		try {
			// Create form data
			const formData = new FormData();
			formData.append('image', file);

			// Simulate progress for better UX (actual upload doesn't report progress with fetch)
			const progressInterval = setInterval(() => {
				if (progress < 90) {
					progress += 10;
				}
			}, 100);

			// Upload to API
			const response = await fetch('/api/exercises/images', {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);

			// Check HTTP response status
			if (!response.ok) {
				throw new Error(`Erreur serveur (${response.status})`);
			}

			progress = 100;

			const result: UploadResult = await response.json();

			if (result.success && result.data) {
				status = 'success';
				uploadedData = result.data;
				onUploadComplete?.(result.data);
				toaster.success('Image telechargee avec succes');
			} else {
				status = 'error';
				errorMessage = result.error || "Erreur lors du telechargement de l'image";
				toaster.error(errorMessage);
			}
		} catch (err) {
			console.error('Upload error:', err);
			status = 'error';
			errorMessage = 'Erreur de connexion au serveur';
			toaster.error(errorMessage);
		}
	}

	/**
	 * Handle file selection from input
	 */
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			uploadFile(file);
		}
		// Reset input for re-selection of same file
		if (target) target.value = '';
	}

	/**
	 * Handle drag events
	 */
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		if (status !== 'uploading') {
			status = 'dragging';
		}
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();
		// Only reset if leaving the drop zone entirely
		if (dropZoneEl && !dropZoneEl.contains(event.relatedTarget as Node)) {
			if (status === 'dragging') {
				status = 'idle';
			}
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (status === 'uploading') return;

		status = 'idle';
		const file = event.dataTransfer?.files[0];
		if (file) {
			uploadFile(file);
		}
	}

	/**
	 * Open file picker
	 */
	function openFilePicker() {
		if (status !== 'uploading') {
			fileInputEl?.click();
		}
	}

	/**
	 * Reset uploader to initial state
	 */
	function reset() {
		status = 'idle';
		progress = 0;
		uploadedData = null;
		errorMessage = null;
	}

	/**
	 * Format file size for display
	 */
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} o`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Drop zone -->
	<div
		bind:this={dropZoneEl}
		role="button"
		tabindex="0"
		aria-label="Zone de telechargement pour images. Glissez-deposez ou appuyez sur Entree pour selectionner"
		aria-pressed={isDragging}
		class="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary {isDragging
			? 'border-primary bg-primary/10'
			: status === 'error'
				? 'border-destructive bg-destructive/5'
				: status === 'success'
					? 'border-green-500 bg-green-50 dark:bg-green-950/20'
					: 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={openFilePicker}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openFilePicker();
			}
		}}
	>
		{#if isUploading}
			<!-- Uploading state -->
			<div
				class="flex flex-col items-center gap-4"
				role="status"
				aria-live="polite"
				aria-label="Progression du telechargement"
			>
				<Loader2 class="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
				<p class="text-sm font-medium text-foreground">Telechargement en cours...</p>
				<div class="w-48">
					<Progress
						value={progress}
						max={100}
						aria-label="Barre de progression du telechargement"
					/>
				</div>
				<p class="text-xs text-muted-foreground" aria-live="assertive" aria-atomic="true">
					{progress}%
				</p>
			</div>
		{:else if status === 'success' && uploadedData}
			<!-- Success state with preview -->
			<div class="flex flex-col items-center gap-4">
				<div class="relative">
					<img
						src={uploadedData.url}
						alt={uploadedData.filename}
						class="max-h-32 max-w-full rounded-md object-contain shadow-sm"
					/>
					<button
						type="button"
						class="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
						onclick={(e) => {
							e.stopPropagation();
							reset();
						}}
						aria-label="Supprimer l'image"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<CheckCircle class="h-4 w-4" />
					<span class="text-sm font-medium">Image telechargee</span>
				</div>
				<div class="text-center text-xs text-muted-foreground">
					<p class="font-medium">{uploadedData.filename}</p>
					<p>
						{uploadedData.width} x {uploadedData.height} px - {formatFileSize(uploadedData.size)}
					</p>
				</div>
			</div>
		{:else if status === 'error'}
			<!-- Error state -->
			<div class="flex flex-col items-center gap-4" role="alert">
				<AlertCircle class="h-12 w-12 text-destructive" aria-hidden="true" />
				<p class="text-sm font-medium text-destructive">{errorMessage}</p>
				<Button
					variant="outline"
					size="sm"
					onclick={(e: MouseEvent) => {
						e.stopPropagation();
						reset();
					}}
				>
					Reessayer
				</Button>
			</div>
		{:else}
			<!-- Idle/dragging state -->
			<div class="flex flex-col items-center gap-4">
				{#if isDragging}
					<Upload class="h-12 w-12 text-primary" />
					<p class="text-sm font-medium text-primary">Deposez l'image ici</p>
				{:else}
					<Image class="h-12 w-12 text-muted-foreground" />
					<div class="text-center">
						<p class="text-sm font-medium text-foreground">
							Glissez-deposez une image ou cliquez pour selectionner
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							JPEG, PNG, GIF, WebP, SVG - Max {maxSize} Mo
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInputEl}
		type="file"
		{accept}
		onchange={handleFileSelect}
		class="hidden"
		aria-label="Selectionner une image pour telecharger"
	/>
</div>
