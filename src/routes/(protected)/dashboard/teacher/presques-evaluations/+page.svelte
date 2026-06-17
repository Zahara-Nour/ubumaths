<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { FileText, Upload, Pencil, Trash2, Calendar, User, Loader2, Eye } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatGradeShort } from '$lib/utils/grades';
	import { GRADE_CODES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	type Evaluation = (typeof data.evaluations)[number];

	// Upload dialog state
	let showUploadDialog = $state(false);
	let uploadFile = $state<File | null>(null);
	let uploadTitle = $state('');
	let uploadDescription = $state('');
	let uploadGradeLevels = $state<GradeCode[]>([]);
	let uploadTags = $state<string[]>([]);
	let isUploading = $state(false);
	let uploadError = $state('');

	// Edit dialog state
	let showEditDialog = $state(false);
	let editTarget = $state<Evaluation | null>(null);
	let editTitle = $state('');
	let editDescription = $state('');
	let editGradeLevels = $state<GradeCode[]>([]);
	let editTags = $state<string[]>([]);
	let isEditing = $state(false);
	let editError = $state('');

	// Delete dialog state
	let showDeleteDialog = $state(false);
	let deleteTarget = $state<Evaluation | null>(null);
	let isDeleting = $state(false);

	const MAX_SIZE_MB = 10;
	const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

	function isGradeCode(value: string): value is GradeCode {
		return (GRADE_CODES as readonly string[]).includes(value);
	}

	function toGradeCodes(values: readonly string[]): GradeCode[] {
		return values.filter(isGradeCode);
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function creatorName(evaluation: Evaluation): string {
		const creator = evaluation.creator as { firstname?: string; lastname?: string } | null;
		if (!creator) return 'Auteur inconnu';
		const parts = [creator.firstname, creator.lastname].filter(Boolean);
		return parts.length ? parts.join(' ') : 'Auteur inconnu';
	}

	function isOwner(evaluation: Evaluation): boolean {
		return evaluation.created_by === data.currentUserId;
	}

	function openUploadDialog() {
		uploadFile = null;
		uploadTitle = '';
		uploadDescription = '';
		uploadGradeLevels = [];
		uploadTags = [];
		uploadError = '';
		showUploadDialog = true;
	}

	function handleFilePick(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		uploadError = '';
		if (!file) {
			uploadFile = null;
			return;
		}
		if (file.type !== 'application/pdf') {
			uploadError = 'Seuls les fichiers PDF sont acceptés';
			uploadFile = null;
			return;
		}
		if (file.size > MAX_SIZE_BYTES) {
			uploadError = `Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`;
			uploadFile = null;
			return;
		}
		uploadFile = file;
		if (!uploadTitle) {
			uploadTitle = file.name.replace(/\.pdf$/i, '');
		}
	}

	function openEditDialog(evaluation: Evaluation) {
		editTarget = evaluation;
		editTitle = evaluation.title;
		editDescription = evaluation.description ?? '';
		editGradeLevels = toGradeCodes(evaluation.grade_levels ?? []);
		editTags = [...(evaluation.tags ?? [])];
		editError = '';
		showEditDialog = true;
	}

	function openDeleteDialog(evaluation: Evaluation) {
		deleteTarget = evaluation;
		showDeleteDialog = true;
	}
</script>

<svelte:head>
	<title>Les presques évaluations · UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight md:text-3xl">Les presques évaluations</h1>
			<p class="text-sm text-muted-foreground">
				Gérez la collection partagée de parodies d'évaluations. Les fichiers que vous uploadez sont
				visibles publiquement.
			</p>
		</div>
		<Button onclick={openUploadDialog}>
			<Upload class="mr-2 h-4 w-4" />
			Ajouter une parodie
		</Button>
	</div>

	{#if data.evaluations.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center gap-3 py-12">
				<FileText class="h-10 w-10 text-muted-foreground/50" />
				<p class="text-muted-foreground">Aucune parodie pour le moment.</p>
				<Button onclick={openUploadDialog} variant="outline">
					<Upload class="mr-2 h-4 w-4" />
					Ajouter la première
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.evaluations as evaluation (evaluation.id)}
				<Card.Root class="flex flex-col">
					<Card.Header class="space-y-2">
						<div class="flex items-start gap-2">
							<FileText class="mt-1 h-5 w-5 shrink-0 text-primary" />
							<Card.Title class="text-base leading-tight">{evaluation.title}</Card.Title>
						</div>
						{#if evaluation.description}
							<Card.Description class="line-clamp-3 text-sm">
								{evaluation.description}
							</Card.Description>
						{/if}
					</Card.Header>

					<Card.Content class="flex-1 space-y-3 text-sm">
						{#if (evaluation.grade_levels ?? []).length > 0}
							<div class="flex flex-wrap gap-1">
								{#each toGradeCodes(evaluation.grade_levels ?? []) as grade (grade)}
									<Badge variant="secondary" class="text-xs">{formatGradeShort(grade)}</Badge>
								{/each}
							</div>
						{/if}

						{#if (evaluation.tags ?? []).length > 0}
							<div class="flex flex-wrap gap-1">
								{#each evaluation.tags ?? [] as tag (tag)}
									<Badge variant="outline" class="text-xs">{tag}</Badge>
								{/each}
							</div>
						{/if}

						<div class="space-y-1 pt-1 text-xs text-muted-foreground">
							<div class="flex items-center gap-1">
								<Calendar class="h-3 w-3" />
								{formatDate(evaluation.created_at)}
							</div>
							<div class="flex items-center gap-1">
								<User class="h-3 w-3" />
								{creatorName(evaluation)}
							</div>
							<div>{formatFileSize(evaluation.file_size)}</div>
						</div>
					</Card.Content>

					<Card.Footer class="flex-wrap gap-2">
						{#if evaluation.publicUrl}
							<Button
								variant="outline"
								size="sm"
								class="flex-1"
								href={evaluation.publicUrl}
								target="_blank"
								rel="noopener"
							>
								<Eye class="mr-1 h-3.5 w-3.5" />
								Aperçu
							</Button>
						{/if}
						{#if isOwner(evaluation)}
							<Button variant="outline" size="sm" onclick={() => openEditDialog(evaluation)}>
								<Pencil class="mr-1 h-3.5 w-3.5" />
								Modifier
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="text-destructive hover:bg-destructive/10 hover:text-destructive"
								onclick={() => openDeleteDialog(evaluation)}
							>
								<Trash2 class="h-3.5 w-3.5" />
								<span class="sr-only">Supprimer</span>
							</Button>
						{:else}
							<span class="w-full text-xs text-muted-foreground italic">
								Uploadé par un autre enseignant
							</span>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Upload Dialog -->
<Dialog.Root bind:open={showUploadDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Ajouter une parodie d'évaluation</Dialog.Title>
			<Dialog.Description>
				PDF uniquement, taille max {MAX_SIZE_MB} Mo. Au moins un niveau requis.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={() => {
				isUploading = true;
				uploadError = '';
				return async ({ result, update }) => {
					isUploading = false;
					if (result.type === 'success') {
						toaster.success('Parodie ajoutée');
						showUploadDialog = false;
					} else if (result.type === 'failure') {
						uploadError = (result.data as { error?: string })?.error ?? "Erreur lors de l'upload";
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="gradeLevels" value={JSON.stringify(uploadGradeLevels)} />
			<input type="hidden" name="tags" value={JSON.stringify(uploadTags)} />

			<div class="space-y-2">
				<Label for="upload-file">Fichier PDF *</Label>
				<input
					id="upload-file"
					type="file"
					name="file"
					accept="application/pdf,.pdf"
					required
					onchange={handleFilePick}
					class="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
				/>
				{#if uploadFile}
					<p class="text-xs text-muted-foreground">
						{uploadFile.name} · {formatFileSize(uploadFile.size)}
					</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="upload-title">Titre *</Label>
				<Input
					id="upload-title"
					name="title"
					bind:value={uploadTitle}
					placeholder="Ex: La presque évaluation de Pataphysique"
					required
					maxlength={200}
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
					maxlength={2000}
				/>
			</div>

			<div class="space-y-2">
				<Label>Niveaux *</Label>
				<GradeBadgeSelector bind:value={uploadGradeLevels} placeholder="Choisir les niveaux" />
			</div>

			<div class="space-y-2">
				<Label>Thèmes</Label>
				<TagBadgeSelector
					bind:value={uploadTags}
					placeholder="Ajouter des thèmes"
					maxSelections={20}
				/>
			</div>

			{#if uploadError}
				<p class="text-sm text-destructive">{uploadError}</p>
			{/if}

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => (showUploadDialog = false)}
					disabled={isUploading}
				>
					Annuler
				</Button>
				<Button
					type="submit"
					disabled={isUploading ||
						!uploadFile ||
						!uploadTitle.trim() ||
						uploadGradeLevels.length === 0}
				>
					{#if isUploading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Upload en cours…
					{:else}
						<Upload class="mr-2 h-4 w-4" />
						Uploader
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Dialog -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Modifier la parodie</Dialog.Title>
			<Dialog.Description>
				Le fichier PDF lui-même n'est pas modifiable. Supprimez et ré-uploadez pour remplacer.
			</Dialog.Description>
		</Dialog.Header>

		{#if editTarget}
			<form
				method="POST"
				action="?/update"
				use:enhance={() => {
					isEditing = true;
					editError = '';
					return async ({ result, update }) => {
						isEditing = false;
						if (result.type === 'success') {
							toaster.success('Parodie modifiée');
							showEditDialog = false;
						} else if (result.type === 'failure') {
							editError =
								(result.data as { error?: string })?.error ?? 'Erreur lors de la modification';
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<input type="hidden" name="id" value={editTarget.id} />
				<input type="hidden" name="gradeLevels" value={JSON.stringify(editGradeLevels)} />
				<input type="hidden" name="tags" value={JSON.stringify(editTags)} />

				<div class="space-y-2">
					<Label for="edit-title">Titre *</Label>
					<Input id="edit-title" name="title" bind:value={editTitle} required maxlength={200} />
				</div>

				<div class="space-y-2">
					<Label for="edit-description">Description</Label>
					<Textarea
						id="edit-description"
						name="description"
						bind:value={editDescription}
						rows={2}
						maxlength={2000}
					/>
				</div>

				<div class="space-y-2">
					<Label>Niveaux *</Label>
					<GradeBadgeSelector bind:value={editGradeLevels} placeholder="Choisir les niveaux" />
				</div>

				<div class="space-y-2">
					<Label>Thèmes</Label>
					<TagBadgeSelector bind:value={editTags} maxSelections={20} />
				</div>

				{#if editError}
					<p class="text-sm text-destructive">{editError}</p>
				{/if}

				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (showEditDialog = false)}
						disabled={isEditing}
					>
						Annuler
					</Button>
					<Button
						type="submit"
						disabled={isEditing || !editTitle.trim() || editGradeLevels.length === 0}
					>
						{#if isEditing}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Enregistrement…
						{:else}
							Enregistrer
						{/if}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Supprimer la parodie</Dialog.Title>
			<Dialog.Description>
				{#if deleteTarget}
					Cette action est irréversible. La parodie « {deleteTarget.title} » sera supprimée définitivement.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if deleteTarget}
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					return async ({ result, update }) => {
						isDeleting = false;
						if (result.type === 'success') {
							toaster.success('Parodie supprimée');
							showDeleteDialog = false;
						} else if (result.type === 'failure') {
							toaster.error(
								(result.data as { error?: string })?.error ?? 'Erreur lors de la suppression'
							);
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={deleteTarget.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (showDeleteDialog = false)}
						disabled={isDeleting}
					>
						Annuler
					</Button>
					<Button type="submit" variant="destructive" disabled={isDeleting}>
						{#if isDeleting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Suppression…
						{:else}
							<Trash2 class="mr-2 h-4 w-4" />
							Supprimer
						{/if}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
