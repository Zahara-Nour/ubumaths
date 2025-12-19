<!--
	ImageGalleryModal Component
	===========================

	Modal that displays existing exercise images as a gallery.
	Users can select an existing image or choose to upload a new one.

	USAGE:
	<ImageGalleryModal
		open={galleryOpen}
		images={existingImages}
		isLoading={isLoadingImages}
		onSelectImage={(image) => { ... }}
		onUploadNew={() => { ... }}
		onClose={() => { ... }}
	/>
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Upload, ImageIcon, Loader2 } from 'lucide-svelte';
	import type { GalleryImageInfo } from './types';

	interface Props {
		/** Whether the modal is open */
		open: boolean;
		/** List of existing images to display */
		images: GalleryImageInfo[];
		/** Whether images are being loaded */
		isLoading?: boolean;
		/** Called when user selects an existing image */
		onSelectImage: (image: GalleryImageInfo) => void;
		/** Called when user wants to upload a new image */
		onUploadNew: () => void;
		/** Called when modal is closed */
		onClose: () => void;
	}

	let {
		open = $bindable(),
		images,
		isLoading = false,
		onSelectImage,
		onUploadNew,
		onClose
	}: Props = $props();

	function handleSelectImage(image: GalleryImageInfo) {
		onSelectImage(image);
	}

	function handleUploadNew() {
		onUploadNew();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen) {
			onClose();
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<ImageIcon class="h-5 w-5" />
				Images de l'exercice
			</Dialog.Title>
			<Dialog.Description>
				Selectionnez une image existante ou ajoutez-en une nouvelle.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#if isLoading}
				<!-- Loading state -->
				<div class="flex items-center justify-center py-12">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if images.length === 0}
				<!-- No images -->
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<ImageIcon class="mb-4 h-12 w-12 text-muted-foreground" />
					<p class="text-muted-foreground">Aucune image pour cet exercice.</p>
				</div>
			{:else}
				<!-- Image gallery grid -->
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
					{#each images as image (image.url)}
						<button
							type="button"
							class="group relative aspect-square overflow-hidden rounded-lg border-2 border-transparent transition-all hover:border-primary focus:border-primary focus:outline-none"
							onclick={() => handleSelectImage(image)}
						>
							<img
								src={image.url}
								alt={image.name}
								class="h-full w-full object-cover transition-transform group-hover:scale-105"
							/>
							<div
								class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2"
							>
								<p class="truncate text-xs font-medium text-white">
									{image.name}
								</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Upload new button -->
			<div class="flex justify-center border-t pt-4">
				<Button variant="outline" onclick={handleUploadNew} class="gap-2">
					<Upload class="h-4 w-4" />
					Ajouter une nouvelle image
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
