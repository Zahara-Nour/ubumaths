<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Upload, FileText, X, Loader2 } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { GRADE_OPTIONS, type GradeCode } from '$lib/types/grades';

	interface Props {
		onUploadComplete?: (documentId: string) => void;
	}

	let { onUploadComplete }: Props = $props();

	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let isUploading = $state(false);

	// Form fields
	let title = $state('');
	let description = $state('');
	let selectedGrades = $state<GradeCode[]>([]);
	let topics = $state('');

	const acceptedTypes = '.pdf,.txt,.md';
	const maxSizeMB = 10;

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			validateAndSetFile(files[0]);
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			validateAndSetFile(input.files[0]);
		}
	}

	function validateAndSetFile(file: File) {
		// Check file type
		const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/x-markdown'];
		const extension = file.name.split('.').pop()?.toLowerCase();

		if (!allowedTypes.includes(file.type) && !['pdf', 'txt', 'md'].includes(extension || '')) {
			toaster.error('Type de fichier non supporté. Formats acceptés: PDF, TXT, MD');
			return;
		}

		// Check file size
		if (file.size > maxSizeMB * 1024 * 1024) {
			toaster.error(`Le fichier est trop volumineux (max ${maxSizeMB}MB)`);
			return;
		}

		selectedFile = file;

		// Auto-fill title from filename
		if (!title) {
			title = file.name.replace(/\.[^/.]+$/, '');
		}
	}

	function clearFile() {
		selectedFile = null;
	}

	function toggleGrade(grade: GradeCode) {
		if (selectedGrades.includes(grade)) {
			selectedGrades = selectedGrades.filter((g) => g !== grade);
		} else {
			selectedGrades = [...selectedGrades, grade];
		}
	}

	async function handleUpload() {
		if (!selectedFile) {
			toaster.error('Veuillez sélectionner un fichier');
			return;
		}

		if (!title.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append(
				'metadata',
				JSON.stringify({
					title: title.trim(),
					description: description.trim() || undefined,
					grades: selectedGrades,
					topics: topics
						.split(',')
						.map((t) => t.trim())
						.filter((t) => t.length > 0),
					enabledForRag: true
				})
			);

			const response = await fetch('/api/documents/upload', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Erreur lors du téléversement');
			}

			toaster.success(result.message || 'Document téléversé avec succès');

			// Reset form
			selectedFile = null;
			title = '';
			description = '';
			selectedGrades = [];
			topics = '';

			// Notify parent
			onUploadComplete?.(result.documentId);
		} catch (error) {
			console.error('Upload error:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors du téléversement');
		} finally {
			isUploading = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Drop zone -->
	<div
		class="relative rounded-lg border-2 border-dashed p-8 text-center transition-colors {dragOver
			? 'border-primary bg-primary/5'
			: 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex="0"
	>
		{#if selectedFile}
			<div class="flex items-center justify-center gap-3">
				<FileText class="h-8 w-8 text-primary" />
				<div class="text-left">
					<p class="font-medium">{selectedFile.name}</p>
					<p class="text-sm text-muted-foreground">
						{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
					</p>
				</div>
				<Button variant="ghost" size="icon" onclick={clearFile}>
					<X class="h-4 w-4" />
				</Button>
			</div>
		{:else}
			<Upload class="mx-auto h-12 w-12 text-muted-foreground" />
			<p class="mt-2 font-medium">Glissez-déposez un fichier ici</p>
			<p class="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
			<p class="mt-1 text-xs text-muted-foreground">PDF, TXT, MD (max {maxSizeMB}MB)</p>
		{/if}

		<input
			type="file"
			accept={acceptedTypes}
			onchange={handleFileSelect}
			class="absolute inset-0 cursor-pointer opacity-0"
		/>
	</div>

	<!-- Metadata form -->
	{#if selectedFile}
		<div class="space-y-4">
			<div>
				<Label for="title">Titre *</Label>
				<Input id="title" bind:value={title} placeholder="Titre du document" maxlength={200} />
			</div>

			<div>
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Description optionnelle..."
					rows={2}
				/>
			</div>

			<div>
				<Label>Niveaux scolaires</Label>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each GRADE_OPTIONS as grade (grade.value)}
						<Button
							variant={selectedGrades.includes(grade.value) ? 'default' : 'outline'}
							size="sm"
							onclick={() => toggleGrade(grade.value)}
						>
							{grade.label}
						</Button>
					{/each}
				</div>
			</div>

			<div>
				<Label for="topics">Thèmes (séparés par des virgules)</Label>
				<Input
					id="topics"
					bind:value={topics}
					placeholder="algèbre, fractions, équations..."
					maxlength={500}
				/>
			</div>

			<Button onclick={handleUpload} disabled={isUploading} class="w-full">
				{#if isUploading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Téléversement...
				{:else}
					<Upload class="mr-2 h-4 w-4" />
					Téléverser le document
				{/if}
			</Button>
		</div>
	{/if}
</div>
