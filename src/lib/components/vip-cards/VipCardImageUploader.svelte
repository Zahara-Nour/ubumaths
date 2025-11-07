<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';

	interface Props {
		cardId: string;
		currentImageUrl?: string;
		onComplete: (newUrl: string) => void;
		onCancel?: () => void;
	}

	let { cardId, currentImageUrl, onComplete, onCancel }: Props = $props();

	let uploading = $state(false);
	let preview = $state<string | null>(null);
	let fileInput: HTMLInputElement;
	let selectedFile = $state<File | null>(null);
	let dragOver = $state(false);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			validateAndPreview(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;

		const file = event.dataTransfer?.files[0];
		if (file) {
			validateAndPreview(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function validateAndPreview(file: File) {
		// Validate file type
		if (!file.type.startsWith('image/')) {
			toaster.error('Le fichier doit être une image');
			return;
		}

		// Validate file size (2MB max)
		if (file.size > 2 * 1024 * 1024) {
			toaster.error("L'image doit faire moins de 2MB");
			return;
		}

		selectedFile = file;

		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			preview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function handleUpload() {
		if (!selectedFile) {
			toaster.error('Veuillez sélectionner une image');
			return;
		}

		uploading = true;

		try {
			const formData = new FormData();
			formData.append('image', selectedFile);

			const response = await fetch(`/api/admin/vip-cards/templates/${cardId}/image`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Upload failed');
			}

			const { imageUrl } = await response.json();
			onComplete(imageUrl);
			toaster.success('Image uploadée avec succès');
		} catch (error) {
			console.error('Upload error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'upload");
		} finally {
			uploading = false;
		}
	}
</script>

<div class="space-y-4">
	<!-- Current Image -->
	{#if currentImageUrl}
		<div>
			<p class="mb-2 text-sm font-medium">Image actuelle :</p>
			<img
				src={currentImageUrl}
				alt="Carte VIP actuelle"
				class="h-32 w-32 rounded border object-cover"
			/>
		</div>
	{/if}

	<!-- Drop Zone -->
	<div
		class="rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
			? 'border-primary bg-primary/5'
			: 'border-muted-foreground/25'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
		role="button"
		tabindex="0"
		aria-label="Zone de dépôt d'image : glissez-déposez une image ici ou appuyez sur Entrée pour sélectionner un fichier"
	>
		{#if preview}
			<img
				src={preview}
				alt="Aperçu de la nouvelle image : {selectedFile?.name || 'image sélectionnée'}"
				class="mx-auto mb-4 h-48 w-48 rounded object-cover"
			/>
			<p class="mb-2 text-sm text-muted-foreground">{selectedFile?.name}</p>
			<p class="text-xs text-muted-foreground">
				{((selectedFile?.size || 0) / 1024).toFixed(1)} KB
			</p>
		{:else}
			<div class="space-y-2">
				<div class="text-4xl">📷</div>
				<p class="text-sm text-muted-foreground">
					Glissez-déposez une image ici ou cliquez pour sélectionner
				</p>
				<p class="text-xs text-muted-foreground">PNG, JPG, WebP - Max 2MB</p>
			</div>
		{/if}

		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			onchange={handleFileSelect}
			class="hidden"
		/>

		<Button
			type="button"
			variant="outline"
			onclick={() => fileInput.click()}
			class="mt-4"
			disabled={uploading}
		>
			{preview ? "Changer l'image" : 'Sélectionner une image'}
		</Button>
	</div>

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2">
		{#if onCancel}
			<Button variant="outline" onclick={onCancel} disabled={uploading}>Annuler</Button>
		{/if}
		<Button onclick={handleUpload} disabled={!selectedFile || uploading}>
			{uploading ? 'Upload en cours...' : "Uploader l'image"}
		</Button>
	</div>
</div>
