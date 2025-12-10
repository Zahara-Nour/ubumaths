<!--
	Template Detail Page
	====================

	View and manage a specific chapter template.
	Shows: metadata, content snapshot, versions, instantiation options.
-->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ArrowLeft,
		FileText,
		HelpCircle,
		CheckSquare,
		BookOpen,
		Upload,
		Archive,
		PlayCircle,
		Clock
	} from 'lucide-svelte';
	import { getContentCounts } from '$lib/types/chapter-templates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isPublishing = $state(false);
	let isArchiving = $state(false);
	let isInstantiating = $state(false);
	let showInstantiateDialog = $state(false);
	let selectedClassId = $state<string>('');
	let chapterTitle = $state('');

	const contentCounts = $derived(getContentCounts(data.template.contentSnapshot));

	function getStatusBadgeColor(status: string) {
		switch (status) {
			case 'draft':
				return 'bg-gray-500';
			case 'published':
				return 'bg-green-500';
			case 'archived':
				return 'bg-amber-500';
			default:
				return 'bg-gray-500';
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'draft':
				return 'Brouillon';
			case 'published':
				return 'Publié';
			case 'archived':
				return 'Archivé';
			default:
				return status;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Show success/error toasts
	$effect(() => {
		if (form?.success) {
			if (form.action === 'publish') {
				toaster.success('Template publié avec succès');
			} else if (form.action === 'archive') {
				toaster.success('Template archivé');
			} else if (form.action === 'update') {
				toaster.success('Template mis à jour');
			} else if (form.action === 'instantiate') {
				toaster.success('Chapitre créé avec succès');
				showInstantiateDialog = false;
				if (form.chapterId && selectedClassId) {
					goto(`/dashboard/teacher/cours/${selectedClassId}/${form.chapterId}`);
				}
			}
		}
		if (form?.error) {
			toaster.error(form.error);
		}
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<Button variant="ghost" href="/dashboard/teacher/templates" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux templates
		</Button>
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<div class="mb-2 flex items-center gap-2">
					<h1 class="text-3xl font-bold tracking-tight">{data.template.title}</h1>
					<Badge class={getStatusBadgeColor(data.template.status)}>
						{getStatusLabel(data.template.status)}
					</Badge>
					{#if data.template.isPublic}
						<Badge variant="outline">Public</Badge>
					{/if}
				</div>
				{#if data.template.description}
					<p class="mt-1 text-muted-foreground">{data.template.description}</p>
				{/if}
			</div>

			<!-- Actions (owner only) -->
			{#if data.isOwner}
				<div class="flex items-center gap-2">
					{#if data.template.status === 'draft'}
						<form
							method="POST"
							action="?/publish"
							use:enhance={() => {
								isPublishing = true;
								return async ({ update }) => {
									isPublishing = false;
									await update();
								};
							}}
						>
							<input type="hidden" name="isPublic" value="false" />
							<Button type="submit" disabled={isPublishing}>
								<Upload class="mr-2 h-4 w-4" />
								{isPublishing ? 'Publication...' : 'Publier'}
							</Button>
						</form>
					{/if}

					{#if data.template.status === 'published'}
						<form
							method="POST"
							action="?/archive"
							use:enhance={() => {
								isArchiving = true;
								return async ({ update }) => {
									isArchiving = false;
									await update();
								};
							}}
						>
							<Button type="submit" variant="outline" disabled={isArchiving}>
								<Archive class="mr-2 h-4 w-4" />
								{isArchiving ? 'Archivage...' : 'Archiver'}
							</Button>
						</form>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Template Info -->
	<Card>
		<CardHeader>
			<CardTitle>Informations</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Grades -->
			{#if data.template.grades.length > 0}
				<div>
					<p class="mb-2 text-sm font-medium">Niveaux :</p>
					<div class="flex flex-wrap gap-2">
						{#each data.template.grades as grade (grade)}
							<Badge variant="outline">
								{grade === 'T' ? 'Terminale' : `${grade}ème`}
							</Badge>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<div class="flex items-center gap-2">
					<FileText class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.documentCount}</p>
						<p class="text-xs text-muted-foreground">Documents</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<HelpCircle class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.quizQuestionCount}</p>
						<p class="text-xs text-muted-foreground">Questions Quiz</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<CheckSquare class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.checklistItemCount}</p>
						<p class="text-xs text-muted-foreground">Tâches</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<BookOpen class="h-5 w-5 text-muted-foreground" />
					<div>
						<p class="text-2xl font-bold">{contentCounts.exerciseCount}</p>
						<p class="text-xs text-muted-foreground">Exercices</p>
					</div>
				</div>
			</div>

			<!-- Meta -->
			<div class="space-y-1 border-t pt-4 text-sm text-muted-foreground">
				<p>Version actuelle : v{data.template.currentVersion}</p>
				<p>Utilisations : {data.template.instantiationCount}</p>
				<p>Créé le {formatDate(data.template.createdAt)}</p>
				<p>Dernière modification : {formatDate(data.template.updatedAt)}</p>
			</div>
		</CardContent>
	</Card>

	<!-- Instantiate -->
	{#if data.template.status === 'published' && data.classes.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Utiliser ce Template</CardTitle>
				<CardDescription>
					Créez un chapitre depuis ce template dans une de vos classes
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button onclick={() => (showInstantiateDialog = true)}>
					<PlayCircle class="mr-2 h-4 w-4" />
					Créer un Chapitre
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Versions History -->
	{#if data.versions.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Historique des Versions</CardTitle>
				<CardDescription>{data.versions.length} versions</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each data.versions as version (version.id)}
						<div class="flex items-start gap-3 rounded-lg border p-3">
							<Clock class="mt-0.5 h-5 w-5 text-muted-foreground" />
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<p class="font-medium">Version {version.versionNumber}</p>
									{#if version.versionNumber === data.template.currentVersion}
										<Badge variant="outline" class="text-xs">Actuelle</Badge>
									{/if}
								</div>
								{#if version.changeSummary}
									<p class="mt-1 text-sm text-muted-foreground">{version.changeSummary}</p>
								{/if}
								<p class="mt-1 text-xs text-muted-foreground">
									{formatDate(version.createdAt)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Instantiate Dialog -->
<Dialog.Root bind:open={showInstantiateDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Créer un Chapitre</Dialog.Title>
			<Dialog.Description>
				Instanciez ce template dans une de vos classes pour créer un nouveau chapitre.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/instantiate"
			use:enhance={() => {
				isInstantiating = true;
				return async ({ update }) => {
					isInstantiating = false;
					await update();
				};
			}}
		>
			<div class="space-y-4">
				<!-- Class selection -->
				<div class="space-y-2">
					<Label for="classId">
						Classe<span class="text-destructive">*</span>
					</Label>
					<MySelect
						type="single"
						bind:value={selectedClassId}
						items={data.classes.map((cls) => ({
							value: cls.id,
							label: `${cls.name} (${cls.grade})`
						}))}
						placeholder="Sélectionnez une classe"
					/>
					<input type="hidden" name="classId" value={selectedClassId} />
				</div>

				<!-- Custom title -->
				<div class="space-y-2">
					<Label for="title">Titre du Chapitre (optionnel)</Label>
					<Input
						id="title"
						name="title"
						type="text"
						placeholder={data.template.title}
						bind:value={chapterTitle}
					/>
					<p class="text-xs text-muted-foreground">
						Laissez vide pour utiliser le titre du template
					</p>
				</div>

				<!-- Visibility -->
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="isVisible"
						name="isVisible"
						value="true"
						class="h-4 w-4 rounded border-gray-300"
					/>
					<Label for="isVisible" class="cursor-pointer">
						Rendre le chapitre visible immédiatement
					</Label>
				</div>
			</div>

			<Dialog.Footer class="mt-6">
				<Button
					type="button"
					variant="outline"
					onclick={() => (showInstantiateDialog = false)}
					disabled={isInstantiating}
				>
					Annuler
				</Button>
				<Button type="submit" disabled={isInstantiating || !selectedClassId}>
					{isInstantiating ? 'Création...' : 'Créer le Chapitre'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
