<script lang="ts">
	/**
	 * DocumentUpload Component
	 * ========================
	 *
	 * Upload documents (PDF, images) or add Google Drive links to a chapter.
	 * Features:
	 * - Drag & drop file upload
	 * - File type and size validation
	 * - Google Drive URL input
	 * - Upload progress feedback
	 */

	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Upload, Link, FileText, Image, X, Loader2 } from 'lucide-svelte';

	interface Props {
		chapterId: string;
		onSuccess?: () => void;
	}

	let { chapterId, onSuccess }: Props = $props();

	// Tab state
	let activeTab = $state<'upload' | 'google_drive'>('upload');

	// Upload state
	let isDragging = $state(false);
	let selectedFile = $state<File | null>(null);
	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let isUploading = $state(false);
	let uploadError = $state('');

	// Google Drive state
	let googleDriveUrl = $state('');
	let googleDriveTitle = $state('');
	let googleDriveDescription = $state('');
	let isAddingGoogleDrive = $state(false);

	// Constants
	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
	const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
	const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'gif'];

	// Validate file
	function validateFile(file: File): string | null {
		if (!ALLOWED_TYPES.includes(file.type)) {
			const ext = file.name.split('.').pop()?.toLowerCase();
			if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
				return `Type de fichier non supporte. Utilisez: ${ALLOWED_EXTENSIONS.join(', ')}`;
			}
		}
		if (file.size > MAX_FILE_SIZE) {
			return `Le fichier est trop volumineux (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)`;
		}
		return null;
	}

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const error = validateFile(file);
			if (error) {
				uploadError = error;
				selectedFile = null;
			} else {
				uploadError = '';
				selectedFile = file;
				// Auto-fill title from filename if empty
				if (!uploadTitle) {
					uploadTitle = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
				}
			}
		}
	}

	// Handle drag events
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (file) {
			const error = validateFile(file);
			if (error) {
				uploadError = error;
				selectedFile = null;
			} else {
				uploadError = '';
				selectedFile = file;
				if (!uploadTitle) {
					uploadTitle = file.name.replace(/\.[^/.]+$/, '');
				}
			}
		}
	}

	// Clear selected file
	function clearFile() {
		selectedFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadError = '';
	}

	// Get file icon based on type
	function getFileIcon(file: File) {
		if (file.type === 'application/pdf') return FileText;
		if (file.type.startsWith('image/')) return Image;
		return FileText;
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Validate Google Drive URL
	function isValidGoogleDriveUrl(url: string): boolean {
		return url.includes('drive.google.com') || url.includes('docs.google.com');
	}

	// Reset forms after success
	function resetUploadForm() {
		selectedFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadError = '';
		isUploading = false;
	}

	function resetGoogleDriveForm() {
		googleDriveUrl = '';
		googleDriveTitle = '';
		googleDriveDescription = '';
		isAddingGoogleDrive = false;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-lg">Ajouter un document</Card.Title>
		<Card.Description>Uploadez un fichier ou ajoutez un lien Google Drive</Card.Description>
	</Card.Header>
	<Card.Content>
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="upload" class="flex items-center gap-2">
					<Upload class="h-4 w-4" />
					Upload
				</Tabs.Trigger>
				<Tabs.Trigger value="google_drive" class="flex items-center gap-2">
					<Link class="h-4 w-4" />
					Google Drive
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Upload Tab -->
			<Tabs.Content value="upload" class="mt-4">
				<form
					method="POST"
					action="?/uploadDocument"
					enctype="multipart/form-data"
					use:enhance={() => {
						isUploading = true;
						uploadError = '';
						return async ({ result, update }) => {
							isUploading = false;
							if (result.type === 'success') {
								resetUploadForm();
								onSuccess?.();
							} else if (result.type === 'failure') {
								uploadError =
									(result.data as { error?: string })?.error || "Erreur lors de l'upload";
							}
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="chapterId" value={chapterId} />

					<!-- Drop zone -->
					{#if !selectedFile}
						<div
							role="button"
							tabindex="0"
							class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
								{isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							onkeydown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
						>
							<Upload class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
							<p class="text-sm text-muted-foreground">
								Glissez un fichier ici ou
								<button
									type="button"
									class="text-primary underline"
									onclick={() => document.getElementById('file-input')?.click()}
								>
									parcourez
								</button>
							</p>
							<p class="mt-2 text-xs text-muted-foreground">PDF, PNG, JPG, GIF (max 10MB)</p>
							<input
								id="file-input"
								type="file"
								name="file"
								accept=".pdf,.png,.jpg,.jpeg,.gif,application/pdf,image/png,image/jpeg,image/gif"
								class="hidden"
								onchange={handleFileSelect}
							/>
						</div>
					{:else}
						{@const IconComponent = getFileIcon(selectedFile)}
						<!-- Selected file preview -->
						<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
							<div class="flex h-10 w-10 items-center justify-center rounded bg-muted">
								<IconComponent class="h-5 w-5 text-muted-foreground" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">{selectedFile.name}</p>
								<p class="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onclick={clearFile}
								disabled={isUploading}
							>
								<X class="h-4 w-4" />
							</Button>
						</div>
						<!-- Hidden file input for form submission -->
						<input type="hidden" name="fileName" value={selectedFile.name} />
						<input type="hidden" name="fileType" value={selectedFile.type} />
						<input type="hidden" name="fileSize" value={selectedFile.size} />
					{/if}

					{#if uploadError}
						<p class="text-sm text-destructive">{uploadError}</p>
					{/if}

					{#if selectedFile}
						<div class="space-y-3">
							<div class="space-y-2">
								<Label for="upload-title">Titre *</Label>
								<Input
									id="upload-title"
									name="title"
									bind:value={uploadTitle}
									placeholder="Titre du document"
									required
								/>
							</div>

							<div class="space-y-2">
								<Label for="upload-description">Description</Label>
								<Textarea
									id="upload-description"
									name="description"
									bind:value={uploadDescription}
									placeholder="Description optionnelle"
									rows={2}
								/>
							</div>

							<Button type="submit" class="w-full" disabled={isUploading || !uploadTitle.trim()}>
								{#if isUploading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									Upload en cours...
								{:else}
									<Upload class="mr-2 h-4 w-4" />
									Uploader
								{/if}
							</Button>
						</div>
					{/if}
				</form>
			</Tabs.Content>

			<!-- Google Drive Tab -->
			<Tabs.Content value="google_drive" class="mt-4">
				<form
					method="POST"
					action="?/addGoogleDriveDocument"
					use:enhance={() => {
						isAddingGoogleDrive = true;
						return async ({ result, update }) => {
							isAddingGoogleDrive = false;
							if (result.type === 'success') {
								resetGoogleDriveForm();
								onSuccess?.();
							}
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="chapterId" value={chapterId} />

					<div class="space-y-2">
						<Label for="google-drive-url">URL Google Drive *</Label>
						<Input
							id="google-drive-url"
							name="googleDriveUrl"
							type="url"
							bind:value={googleDriveUrl}
							placeholder="https://drive.google.com/..."
							required
						/>
						{#if googleDriveUrl && !isValidGoogleDriveUrl(googleDriveUrl)}
							<p class="text-sm text-amber-600">
								Cette URL ne semble pas etre un lien Google Drive valide
							</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="google-drive-title">Titre *</Label>
						<Input
							id="google-drive-title"
							name="title"
							bind:value={googleDriveTitle}
							placeholder="Titre du document"
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="google-drive-description">Description</Label>
						<Textarea
							id="google-drive-description"
							name="description"
							bind:value={googleDriveDescription}
							placeholder="Description optionnelle"
							rows={2}
						/>
					</div>

					<Button
						type="submit"
						class="w-full"
						disabled={isAddingGoogleDrive || !googleDriveUrl.trim() || !googleDriveTitle.trim()}
					>
						{#if isAddingGoogleDrive}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Ajout en cours...
						{:else}
							<Link class="mr-2 h-4 w-4" />
							Ajouter le lien
						{/if}
					</Button>
				</form>
			</Tabs.Content>
		</Tabs.Root>
	</Card.Content>
</Card.Root>
