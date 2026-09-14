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
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Upload, Link, FileText, Image, X, Loader2 } from '@lucide/svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/database';

	interface Props {
		chapterId: string;
		/**
		 * Client Supabase du navigateur (`data.supabase` du layout).
		 *
		 * Le fichier ne passe plus par le serveur : c'est ce client qui le pousse
		 * dans le stockage, muni d'une autorisation à usage unique.
		 */
		supabase: SupabaseClient<Database>;
		onSuccess?: () => void;
	}

	let { chapterId, supabase, onSuccess }: Props = $props();

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
	// Doit rester d'accord avec l'action d'envoi et avec le bucket
	// `chapter-documents` : trois plafonds pour un seul refus possible.
	const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo
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
			return `Le fichier est trop volumineux (max ${MAX_FILE_SIZE / (1024 * 1024)} Mo)`;
		}
		return null;
	}

	/** L'élément qui porte le fichier choisi. */
	let fileInput = $state<HTMLInputElement | null>(null);

	/** Chemin du fichier déposé, transmis à l'enregistrement. */
	let metaStoragePath = $state('');

	/**
	 * Retenir le fichier, et le poser dans l'input quand il vient d'un
	 * glisser-déposer : le navigateur n'y met que ce qu'on a choisi par la boîte
	 * de dialogue, et c'est l'input que le formulaire regarde.
	 */
	function retenirFichier(file: File, viaGlisserDeposer: boolean) {
		const error = validateFile(file);
		if (error) {
			uploadError = error;
			selectedFile = null;
			if (fileInput) fileInput.value = '';
			return;
		}

		uploadError = '';
		selectedFile = file;

		if (viaGlisserDeposer && fileInput) {
			const transfert = new DataTransfer();
			transfert.items.add(file);
			fileInput.files = transfert.files;
		}

		// Auto-fill title from filename if empty
		if (!uploadTitle) {
			uploadTitle = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
		}
	}

	/**
	 * Déposer le fichier avant que le formulaire ne parte.
	 *
	 * Le fichier ne traverse plus le serveur : au-delà de quelques mégaoctets,
	 * la plateforme refusait la requête d'un 413 avant même que le code ne
	 * s'exécute. Le navigateur demande une autorisation, pousse le fichier
	 * directement dans le stockage, puis laisse le formulaire poster les seules
	 * métadonnées — quelques centaines d'octets.
	 */
	async function envoyerDocument(event: SubmitEvent) {
		// Le fichier est déjà en place : cette soumission-là est celle des
		// métadonnées, on la laisse partir.
		if (metaStoragePath) return;

		event.preventDefault();

		const file = selectedFile;
		if (!file) {
			uploadError = 'Fichier requis';
			return;
		}

		isUploading = true;
		uploadError = '';

		try {
			// 1. L'autorisation : le serveur vérifie les droits et choisit le
			//    chemin, que le navigateur ne décide jamais lui-même.
			const reponse = await fetch(`/api/teacher/chapters/${chapterId}/document-upload-url`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ fileName: file.name, fileType: file.type })
			});

			if (!reponse.ok) {
				uploadError = "Erreur lors de la préparation de l'envoi";
				return;
			}

			const { storagePath, token } = (await reponse.json()) as {
				storagePath: string;
				token: string;
			};

			// 2. Le fichier, directement du navigateur au stockage.
			const { error: envoiError } = await supabase.storage
				.from('chapter-documents')
				.uploadToSignedUrl(storagePath, token, file, { contentType: file.type });

			if (envoiError) {
				console.error('[DocumentUpload] Envoi impossible :', envoiError);
				uploadError = "Erreur lors de l'upload";
				return;
			}

			// 3. Les métadonnées suivent, par le formulaire lui-même.
			metaStoragePath = storagePath;
			await tick();
			(event.target as HTMLFormElement).requestSubmit();
		} catch (err) {
			console.error('[DocumentUpload] Erreur inattendue :', err);
			uploadError = 'Erreur inattendue';
		} finally {
			isUploading = false;
		}
	}

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) retenirFichier(file, false);
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
		if (file) retenirFichier(file, true);
	}

	// Clear selected file
	function clearFile() {
		selectedFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadError = '';
		if (fileInput) fileInput.value = '';
		metaStoragePath = '';
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
		// L'input garde son fichier après l'envoi : sans ce nettoyage, le
		// suivant repartirait avec l'ancien.
		if (fileInput) fileInput.value = '';
		metaStoragePath = '';
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
					onsubmit={envoyerDocument}
					use:enhance={() => {
						isUploading = true;
						return async ({ result, update }) => {
							isUploading = false;
							if (result.type === 'success') {
								resetUploadForm();
								onSuccess?.();
							} else if (result.type === 'failure') {
								uploadError =
									(result.data as { error?: string })?.error || "Erreur lors de l'upload";
							}
							await update({ reset: false });
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="storagePath" value={metaStoragePath} />
					<input type="hidden" name="chapterId" value={chapterId} />

					<!--
						Toujours monté, jamais dans le bloc conditionnel : c'est lui qui
						porte le fichier jusqu'au serveur, et le retirer du DOM dès la
						sélection le faisait disparaître de l'envoi.
					-->
					<input
						id="file-input"
						bind:this={fileInput}
						type="file"
						name="file"
						accept=".pdf,.png,.jpg,.jpeg,.gif,application/pdf,image/png,image/jpeg,image/gif"
						class="hidden"
						onchange={handleFileSelect}
					/>

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
							<p class="mt-2 text-xs text-muted-foreground">PDF, PNG, JPG, GIF (max 25 Mo)</p>
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
								aria-label="Retirer le fichier"
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
