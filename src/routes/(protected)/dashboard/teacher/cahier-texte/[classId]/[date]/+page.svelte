<script lang="ts">
	/**
	 * Teacher Class Journal Entry Editor Page
	 * ========================================
	 *
	 * Create or edit a journal entry for a specific date.
	 * - Rich text editor for lesson content
	 * - Rich text editor for homework content
	 * - Date picker for homework due date
	 * - Publish toggle for student visibility
	 */

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import RichTextEditor from '$lib/components/rich-text/RichTextEditor.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		BookOpen,
		Save,
		Trash2,
		ArrowLeft,
		FileText,
		ClipboardList,
		Globe,
		EyeOff,
		Calendar
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Form state
	let lessonContent = $state(data.entry?.lessonContent || '');
	let homeworkContent = $state(data.entry?.homeworkContent || '');
	let homeworkDueDate = $state(data.entry?.homeworkDueDate || '');
	let isPublished = $state(data.entry?.isPublished || false);
	let isSaving = $state(false);
	let isDeleting = $state(false);

	// Delete confirmation dialog
	let showDeleteDialog = $state(false);

	// Derived values
	let isEditing = $derived(!!data.entry);
	let formAction = $derived(isEditing ? '?/update' : '?/create');

	/**
	 * Format date for display (e.g., "Lundi 15 janvier 2024")
	 */
	function formatDateLong(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/**
	 * Handle form submission result
	 */
	function handleFormResult(result: ActionData) {
		isSaving = false;
		if (result?.success) {
			if (result.action === 'create') {
				toaster.success('Entree creee avec succes');
			} else if (result.action === 'update') {
				toaster.success('Entree mise a jour');
			} else if (result.action === 'publish') {
				toaster.success(result.isPublished ? 'Entree publiee' : 'Publication retiree');
			}
		} else if (result?.error) {
			toaster.error(result.error);
		}
	}

	/**
	 * Watch for form result changes
	 */
	$effect(() => {
		if (form) {
			handleFormResult(form);
		}
	});

	/**
	 * Navigate back to main view
	 */
	function goBack() {
		goto(`/dashboard/teacher/cahier-texte?class=${data.classData.id}`);
	}

	/**
	 * Handle delete confirmation
	 */
	function handleDeleteConfirm() {
		showDeleteDialog = false;
		isDeleting = true;
		// Form will be submitted programmatically
		const form = document.getElementById('delete-form') as HTMLFormElement;
		form?.submit();
	}
</script>

<svelte:head>
	<title>
		{isEditing ? 'Modifier' : 'Nouvelle'} entree - {data.classData.name} | UbuMaths
	</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Breadcrumb -->
	<Breadcrumb.Root class="mb-6">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/teacher/cahier-texte">Cahier de Texte</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/teacher/cahier-texte?class={data.classData.id}">
					{data.classData.name}
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{formatDateLong(data.entryDate)}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<div class="mb-8 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<Button variant="ghost" size="icon" onclick={goBack} title="Retour">
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<BookOpen class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">
					{isEditing ? 'Modifier' : 'Nouvelle'} entree
				</h1>
				<p class="text-muted-foreground">
					{data.classData.name} - {formatDateLong(data.entryDate)}
				</p>
			</div>
		</div>

		{#if isEditing}
			<!-- Publication toggle for existing entries -->
			<form
				method="POST"
				action="?/publish"
				use:enhance={() => {
					return async ({ result: actionResult, update: formUpdate }) => {
						if (actionResult.type === 'success') {
							isPublished = !isPublished;
						}
						await formUpdate();
					};
				}}
			>
				<input type="hidden" name="entryId" value={data.entry?.id} />
				<input type="hidden" name="isPublished" value={(!isPublished).toString()} />
				<Button
					type="submit"
					variant={isPublished ? 'default' : 'outline'}
					size="sm"
					title={isPublished ? 'Retirer la publication' : 'Publier aux eleves'}
				>
					{#if isPublished}
						<Globe class="mr-2 h-4 w-4" />
						Publie
					{:else}
						<EyeOff class="mr-2 h-4 w-4" />
						Non publie
					{/if}
				</Button>
			</form>
		{/if}
	</div>

	<!-- Main form -->
	<form
		method="POST"
		action={formAction}
		use:enhance={() => {
			isSaving = true;
			return async ({ update: formUpdate }) => {
				isSaving = false;
				await formUpdate();
			};
		}}
	>
		{#if isEditing}
			<input type="hidden" name="entryId" value={data.entry?.id} />
		{/if}

		<div class="space-y-6">
			<!-- Lesson Content -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<FileText class="h-5 w-5 text-primary" />
						Contenu de la seance
					</Card.Title>
					<Card.Description>
						Decrivez ce qui a ete fait pendant le cours (visible par les eleves si publie)
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<input type="hidden" name="lessonContent" value={lessonContent} />
					<RichTextEditor
						bind:htmlValue={lessonContent}
						preset="standard"
						minHeight="200px"
						maxHeight="400px"
					/>
				</Card.Content>
			</Card.Root>

			<!-- Homework Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ClipboardList class="h-5 w-5 text-orange-500" />
						Travail a faire
					</Card.Title>
					<Card.Description>
						Devoirs et exercices a faire pour le prochain cours (optionnel)
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<input type="hidden" name="homeworkContent" value={homeworkContent} />
					<RichTextEditor
						bind:htmlValue={homeworkContent}
						preset="standard"
						minHeight="150px"
						maxHeight="300px"
					/>

					<!-- Homework due date -->
					<div class="flex items-end gap-4">
						<div class="flex-1 space-y-2">
							<Label for="homeworkDueDate" class="flex items-center gap-2">
								<Calendar class="h-4 w-4" />
								Date limite (optionnel)
							</Label>
							<Input
								type="date"
								id="homeworkDueDate"
								name="homeworkDueDate"
								bind:value={homeworkDueDate}
								min={data.entryDate}
							/>
						</div>
						{#if homeworkDueDate}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onclick={() => (homeworkDueDate = '')}
							>
								Effacer
							</Button>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Publication toggle for new entries -->
			{#if !isEditing}
				<Card.Root>
					<Card.Content class="pt-6">
						<input type="hidden" name="isPublished" value={isPublished.toString()} />
						<MyCheckbox
							bind:checked={isPublished}
							label="Publier immediatement (visible par les eleves)"
						/>
						<p class="mt-2 text-sm text-muted-foreground">
							Si non coche, l'entree sera enregistree comme brouillon.
						</p>
					</Card.Content>
				</Card.Root>
			{/if}

			<Separator />

			<!-- Actions -->
			<div class="flex items-center justify-between">
				<div>
					{#if isEditing}
						<Button
							type="button"
							variant="destructive"
							onclick={() => (showDeleteDialog = true)}
							disabled={isDeleting}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							{isDeleting ? 'Suppression...' : 'Supprimer'}
						</Button>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					<Button type="button" variant="outline" onclick={goBack}>Annuler</Button>
					<Button type="submit" disabled={isSaving}>
						<Save class="mr-2 h-4 w-4" />
						{isSaving ? 'Enregistrement...' : 'Enregistrer'}
					</Button>
				</div>
			</div>
		</div>
	</form>

	<!-- Hidden delete form -->
	{#if isEditing}
		<form id="delete-form" method="POST" action="?/delete">
			<input type="hidden" name="entryId" value={data.entry?.id} />
		</form>
	{/if}
</main>

<!-- Delete confirmation dialog -->
<ConfirmDialog
	bind:open={showDeleteDialog}
	title="Supprimer cette entree ?"
	description="Cette action est irreversible. L'entree du {formatDateLong(
		data.entryDate
	)} sera definitivement supprimee."
	confirmText="Supprimer"
	confirmVariant="destructive"
	onConfirm={handleDeleteConfirm}
/>
