<script lang="ts">
	import { lore } from '$lib/config/lore';
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
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Badge } from '$lib/components/ui/badge';
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
		Calendar,
		ListTodo,
		ChevronRight,
		ChevronDown,
		Plus
	} from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	// Snapshot for $state inits below.
	// svelte-ignore state_referenced_locally
	const initialData = data;

	// Form state
	let lessonContent = $state(initialData.entry?.lessonContent || '');
	let homeworkContent = $state(initialData.entry?.homeworkContent || '');
	let homeworkDueDate = $state(initialData.entry?.homeworkDueDate || '');
	let isPublished = $state(initialData.entry?.isPublished || false);
	let isSaving = $state(false);
	let isDeleting = $state(false);

	// Delete confirmation dialog
	let showDeleteDialog = $state(false);

	// --- Programme travaillé (coverage) --------------------------------------
	const initialCovered: Record<string, string> = {};
	for (const c of initialData.coveredPoints) initialCovered[c.point_id] = c.source;
	let coveredSource = $state<Record<string, string>>(initialCovered);
	let openProgThemes = $state<Record<string, boolean>>({});
	let openProgItems = $state<Record<string, boolean>>({});
	let coveredCount = $derived(Object.keys(coveredSource).length);

	function isCovered(pointId: string): boolean {
		return coveredSource[pointId] !== undefined;
	}

	async function covApi(url: string, method: string, body?: unknown): Promise<boolean> {
		try {
			const res = await fetch(url, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				toaster.error(j?.error ?? 'Une erreur est survenue');
				return false;
			}
			return true;
		} catch {
			toaster.error('Erreur réseau');
			return false;
		}
	}

	/**
	 * Coche ou décoche un point de programme pour cette séance.
	 *
	 * Sur une séance NEUVE, il n'y a pas encore d'entrée à référencer : on garde
	 * la sélection en mémoire et l'action `create` l'écrit après avoir créé
	 * l'entrée, via le champ caché `coveredPointIds`. Sans ça, il fallait
	 * enregistrer d'abord puis revenir cocher — une seconde visite que personne
	 * ne fait, au moment où la séance n'est déjà plus en tête.
	 */
	async function togglePoint(point: { id: string }) {
		const entryId = data.entry?.id;

		if (!entryId) {
			const next = { ...coveredSource };
			if (next[point.id] !== undefined) delete next[point.id];
			else next[point.id] = 'manual';
			coveredSource = next;
			return;
		}

		if (isCovered(point.id)) {
			const prev = coveredSource[point.id];
			const next = { ...coveredSource };
			delete next[point.id];
			coveredSource = next;
			const ok = await covApi(
				`/api/teacher/curriculum/coverage?entry_id=${entryId}&point_id=${point.id}`,
				'DELETE'
			);
			if (!ok) coveredSource = { ...coveredSource, [point.id]: prev };
		} else {
			coveredSource = { ...coveredSource, [point.id]: 'manual' };
			const ok = await covApi('/api/teacher/curriculum/coverage', 'POST', {
				entry_id: entryId,
				point_id: point.id
			});
			if (!ok) {
				const next = { ...coveredSource };
				delete next[point.id];
				coveredSource = next;
			}
		}
	}

	// --- Activités (5b) -------------------------------------------------------
	let activities = $state(initialData.activities);
	let selectedExercise = $state('');

	function exerciseLabel(id: string | null): string {
		if (!id) return lore.learning.exercise;
		return data.exerciseOptions.find((o) => o.value === id)?.label ?? lore.learning.exercise;
	}

	function activityLabel(a: PageData['activities'][number]): string {
		if (a.kind === 'exercise') return exerciseLabel(a.exercise_id);
		if (a.kind === 'textbook')
			return (a.textbook_ref as { label?: string } | null)?.label ?? 'Référence manuel';
		return a.label ?? 'Point de cours';
	}

	function kindShort(kind: string): string {
		if (kind === 'exercise') return 'Exo';
		if (kind === 'textbook') return 'Manuel';
		return 'Cours';
	}

	async function refreshActivities() {
		const entryId = data.entry?.id;
		if (!entryId) return;
		const res = await fetch(`/api/teacher/curriculum/activities?entry_id=${entryId}`);
		if (res.ok) activities = (await res.json()).activities ?? [];
	}

	async function refreshCoverage() {
		const entryId = data.entry?.id;
		if (!entryId) return;
		const res = await fetch(`/api/teacher/curriculum/coverage?entry_id=${entryId}`);
		if (!res.ok) return;
		const next: Record<string, string> = {};
		for (const c of (await res.json()).coverage ?? []) next[c.point_id] = c.source;
		coveredSource = next;
	}

	async function addExercise() {
		const entryId = data.entry?.id;
		if (!entryId || !selectedExercise) return;
		const ok = await covApi('/api/teacher/curriculum/activities', 'POST', {
			entry_id: entryId,
			kind: 'exercise',
			exercise_id: selectedExercise
		});
		if (ok) {
			selectedExercise = '';
			toaster.success(`${lore.learning.exercise} ajoutée`);
			await refreshActivities();
			await refreshCoverage();
		}
	}

	async function deleteActivity(a: PageData['activities'][number]) {
		const ok = await covApi(`/api/teacher/curriculum/activities/${a.id}`, 'DELETE');
		if (ok) {
			toaster.success('Activité retirée');
			await refreshActivities();
			if (a.kind === 'exercise') await refreshCoverage();
		}
	}

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
		{isEditing ? 'Modifier' : 'Nouvelle'} entree - {data.classData.name} | Chiphre
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
		{:else}
			<!-- Séance neuve : la couverture cochée avant enregistrement voyage
			     avec la création. La carte « Programme travaillé » vit hors de ce
			     formulaire, seul ce champ a besoin d'y être. -->
			<input type="hidden" name="coveredPointIds" value={Object.keys(coveredSource).join(',')} />
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
						Corvées Domestiques et {lore.learning.exercise}s a faire pour le prochain cours
						(optionnel)
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
					<Button type="button" variant="outline" onclick={goBack}>{lore.actions.cancel}</Button>
					<Button type="submit" disabled={isSaving}>
						<Save class="mr-2 h-4 w-4" />
						{isSaving ? 'Enregistrement...' : 'Enregistrer'}
					</Button>
				</div>
			</div>
		</div>
	</form>

	<!-- Programme travaillé (coverage) -->
	<div class="mt-6">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ListTodo class="h-5 w-5 text-primary" />
					Programme travaillé
				</Card.Title>
				<Card.Description>
					Cochez les points du programme abordés pendant cette séance.
					{#if coveredCount > 0}
						<span class="font-medium text-foreground">
							{coveredCount} point{coveredCount > 1 ? 's' : ''} coché{coveredCount > 1 ? 's' : ''}.
						</span>
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<!-- Activités de la séance — elles pointent vers l'entrée, donc
					     impossible avant qu'elle existe. Le reste de la carte, si. -->
				{#if isEditing}
					<div class="mb-4 space-y-3">
						<p class="text-sm font-medium">Activités</p>
						{#if activities.length > 0}
							<ul class="space-y-1">
								{#each activities as a (a.id)}
									<li class="flex items-center gap-2 text-sm">
										<Badge variant="secondary" class="shrink-0">{kindShort(a.kind)}</Badge>
										<span class="flex-1 truncate">{activityLabel(a)}</span>
										<Button variant="ghost" size="sm" onclick={() => deleteActivity(a)}>
											<Trash2 class="h-4 w-4 text-destructive" />
										</Button>
									</li>
								{/each}
							</ul>
						{/if}
						<div class="space-y-2">
							{#if data.exerciseOptions.length > 0}
								<div class="flex gap-2">
									<MySelect
										type="single"
										bind:value={selectedExercise}
										items={data.exerciseOptions}
										placeholder="{lore.learning.exercise} du système…"
										triggerClass="flex-1"
									/>
									<Button
										variant="outline"
										size="sm"
										disabled={!selectedExercise}
										onclick={addExercise}
									>
										<Plus class="h-4 w-4" />
									</Button>
								</div>
							{/if}
						</div>
					</div>
					<Separator class="mb-4" />
				{/if}

				{#if data.curriculumTree.length === 0}
					<p class="text-sm text-muted-foreground">
						Aucun programme défini pour le niveau de cette classe.
						<a class="underline" href={resolve('/dashboard/teacher/programme')}
							>Le créer dans Programme</a
						>.
					</p>
				{:else}
					<div class="space-y-1">
						{#each data.curriculumTree as theme (theme.id)}
							<div class="rounded-md border">
								<button
									class="flex w-full items-center gap-2 p-2 text-left font-medium"
									onclick={() => (openProgThemes[theme.id] = !openProgThemes[theme.id])}
								>
									{#if openProgThemes[theme.id]}
										<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
									{:else}
										<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
									{/if}
									<InlineMarkdown content={theme.name} />
								</button>
								{#if openProgThemes[theme.id]}
									<div class="space-y-1 border-t p-2 pl-4">
										{#each theme.objectives as item (item.id)}
											<div>
												<button
													class="flex w-full items-center gap-2 py-1 text-left text-sm"
													onclick={() => (openProgItems[item.id] = !openProgItems[item.id])}
												>
													{#if openProgItems[item.id]}
														<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
													{:else}
														<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
													{/if}
													<span class="font-medium"><InlineMarkdown content={item.name} /></span>
													<span class="text-xs text-muted-foreground">
														({item.points.filter((p) => isCovered(p.id)).length}/{item.points
															.length})
													</span>
												</button>
												{#if openProgItems[item.id]}
													<div class="space-y-1 py-1 pl-6">
														{#each item.points as point (point.id)}
															<MyCheckbox
																checked={isCovered(point.id)}
																onchange={() => togglePoint(point)}
															>
																<InlineMarkdown content={point.name} />
																{#if coveredSource[point.id] === 'auto'}
																	<span class="text-muted-foreground">(auto)</span>
																{/if}
															</MyCheckbox>
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

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
	confirmLabel={lore.actions.delete}
	variant="destructive"
	onConfirm={handleDeleteConfirm}
/>
