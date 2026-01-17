<!--
	Teacher Templates Gallery
	=========================

	Lists all templates accessible to the teacher.
	Provides filtering by grade, search, and navigation to create/view templates.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Plus, Search, FileText, HelpCircle, CheckSquare, BookOpen } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedGrades = $state<string[]>([]);

	const gradeOptions = ['6', '5', '4', '3', '2', '1', 'T'];

	function toggleGrade(grade: string) {
		if (selectedGrades.includes(grade)) {
			selectedGrades = selectedGrades.filter((g) => g !== grade);
		} else {
			selectedGrades = [...selectedGrades, grade];
		}
		applyFilters();
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedGrades.length > 0) params.set('grades', selectedGrades.join(','));
		goto(`/dashboard/teacher/contenu/templates?${params.toString()}`);
	}

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
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Templates de Chapitres</h1>
			<p class="mt-1 text-muted-foreground">
				Créez et gérez des templates réutilisables pour vos cours
			</p>
		</div>
		<Button href="/dashboard/teacher/contenu/templates/new">
			<Plus class="mr-2 h-4 w-4" />
			Nouveau Template
		</Button>
	</div>

	<!-- Filters -->
	<Card>
		<CardHeader>
			<CardTitle>Filtres</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Search -->
			<div class="flex gap-2">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Rechercher par titre..."
						bind:value={searchQuery}
						onkeydown={(e) => {
							if (e.key === 'Enter') applyFilters();
						}}
						class="pl-9"
					/>
				</div>
				<Button onclick={applyFilters}>Rechercher</Button>
			</div>

			<!-- Grade filters -->
			<div>
				<p class="mb-2 text-sm font-medium">Niveaux :</p>
				<div class="flex flex-wrap gap-2">
					{#each gradeOptions as grade (grade)}
						<Badge
							variant={selectedGrades.includes(grade) ? 'default' : 'outline'}
							class="cursor-pointer"
							onclick={() => toggleGrade(grade)}
						>
							{grade === 'T' ? 'Terminale' : `${grade}ème`}
						</Badge>
					{/each}
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Templates Grid -->
	{#if data.templates.length === 0}
		<Card>
			<CardContent class="py-12 text-center">
				<p class="text-muted-foreground">
					Aucun template trouvé. Créez votre premier template pour commencer.
				</p>
			</CardContent>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.templates as template (template.id)}
				<Card
					class="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
					onclick={() => goto(`/dashboard/teacher/contenu/templates/${template.id}`)}
				>
					<CardHeader>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<CardTitle class="line-clamp-2">{template.title}</CardTitle>
								{#if template.description}
									<CardDescription class="mt-2 line-clamp-2">
										{template.description}
									</CardDescription>
								{/if}
							</div>
							<Badge class={getStatusBadgeColor(template.status)}>
								{getStatusLabel(template.status)}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<!-- Grades -->
						{#if template.grades.length > 0}
							<div class="mb-3 flex flex-wrap gap-1">
								{#each template.grades as grade (grade)}
									<Badge variant="outline" class="text-xs">
										{grade === 'T' ? 'Term' : `${grade}ème`}
									</Badge>
								{/each}
							</div>
						{/if}

						<!-- Content counts -->
						<div class="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
							<div class="flex items-center gap-1">
								<FileText class="h-4 w-4" />
								<span>{template.documentCount} docs</span>
							</div>
							<div class="flex items-center gap-1">
								<HelpCircle class="h-4 w-4" />
								<span>{template.quizQuestionCount} quiz</span>
							</div>
							<div class="flex items-center gap-1">
								<CheckSquare class="h-4 w-4" />
								<span>{template.checklistItemCount} tâches</span>
							</div>
							<div class="flex items-center gap-1">
								<BookOpen class="h-4 w-4" />
								<span>{template.exerciseCount} exos</span>
							</div>
						</div>

						<!-- Meta info -->
						<div class="mt-4 border-t pt-4 text-xs text-muted-foreground">
							<div class="flex items-center justify-between">
								<span>{template.instantiationCount} utilisations</span>
								<span>v{template.currentVersion}</span>
							</div>
							{#if template.creatorName}
								<p class="mt-1">Par {template.creatorName}</p>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.total > data.limit}
			<div class="flex items-center justify-center gap-2">
				<Button
					variant="outline"
					disabled={data.page <= 1}
					onclick={() => {
						const params = new URLSearchParams(window.location.search);
						params.set('page', String(data.page - 1));
						goto(`/dashboard/teacher/contenu/templates?${params.toString()}`);
					}}
				>
					Précédent
				</Button>
				<span class="text-sm text-muted-foreground">
					Page {data.page} sur {Math.ceil(data.total / data.limit)}
				</span>
				<Button
					variant="outline"
					disabled={data.page >= Math.ceil(data.total / data.limit)}
					onclick={() => {
						const params = new URLSearchParams(window.location.search);
						params.set('page', String(data.page + 1));
						goto(`/dashboard/teacher/contenu/templates?${params.toString()}`);
					}}
				>
					Suivant
				</Button>
			</div>
		{/if}
	{/if}
</div>
