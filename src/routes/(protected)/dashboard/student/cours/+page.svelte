<script lang="ts">
	/**
	 * Student Chapters List Page
	 * ==========================
	 *
	 * Displays all visible chapters grouped by class.
	 * Each chapter card shows progress indicators and links to the detail view.
	 */

	import { navigating } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ChapterCard } from '$lib/components/cours';
	import { Book, FolderOpen, GraduationCap } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let isNavigating = $derived(!!$navigating);
	let hasChapters = $derived(data.totalChapters > 0);
</script>

<svelte:head>
	<title>Mes cours | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<Book class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Mes cours</h1>
				<p class="text-muted-foreground">
					{data.totalChapters} chapitre{data.totalChapters > 1 ? 's' : ''} disponible{data.totalChapters >
					1
						? 's'
						: ''}
				</p>
			</div>
		</div>
	</div>

	<!-- Loading state -->
	{#if isNavigating}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="text-muted-foreground">Chargement...</p>
			</div>
		</div>
	{:else if !hasChapters}
		<!-- Empty state -->
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<FolderOpen class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
				<h2 class="text-xl font-semibold">Aucun chapitre disponible</h2>
				<p class="mt-2 text-muted-foreground">
					Vos professeurs n'ont pas encore publié de chapitres pour vos cours.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Classes with chapters -->
		<div class="space-y-10">
			{#each data.classesWithChapters as classData (classData.classId)}
				<section>
					<!-- Class header -->
					<div class="mb-4 flex items-center gap-3 border-b pb-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
							<GraduationCap class="h-5 w-5 text-secondary-foreground" />
						</div>
						<div class="flex-1">
							<h2 class="text-xl font-semibold">{classData.className}</h2>
							<p class="text-sm text-muted-foreground">{classData.teacherName}</p>
						</div>
						<Badge variant="outline">
							{classData.chapters.length} chapitre{classData.chapters.length > 1 ? 's' : ''}
						</Badge>
					</div>

					<!-- Chapter cards grid -->
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each classData.chapters as chapter (chapter.id)}
							<ChapterCard {chapter} href="/dashboard/student/cours/{chapter.id}" />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</main>
