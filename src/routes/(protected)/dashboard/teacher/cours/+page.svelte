<script lang="ts">
	/**
	 * Teacher Chapters Overview Page
	 * ===============================
	 *
	 * Displays all chapters grouped by class.
	 * Quick access to create new chapters and manage existing ones.
	 */

	import { navigating } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ChapterCard } from '$lib/components/cours';
	import { Book, FolderOpen, GraduationCap, Plus, EyeOff } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let isNavigating = $derived(!!$navigating);
	let hasClasses = $derived(data.classes.length > 0);
</script>

<svelte:head>
	<title>Gestion des cours | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<Book class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Gestion des cours</h1>
				<p class="text-muted-foreground">
					{data.totalChapters} chapitre{data.totalChapters > 1 ? 's' : ''} au total
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
	{:else if !hasClasses}
		<!-- No classes state -->
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<GraduationCap class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
				<h2 class="text-xl font-semibold">Aucune classe</h2>
				<p class="mt-2 text-muted-foreground">
					Vous devez d'abord creer une classe pour ajouter des chapitres.
				</p>
				<Button href="/dashboard/teacher/classes" class="mt-4">Gerer les classes</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Classes with chapters -->
		<div class="space-y-10">
			{#each data.classesWithChapters as classData (classData.classId)}
				<section>
					<!-- Class header -->
					<div class="mb-4 flex items-center justify-between gap-3 border-b pb-3">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
								<GraduationCap class="h-5 w-5 text-secondary-foreground" />
							</div>
							<div>
								<h2 class="text-xl font-semibold">{classData.className}</h2>
								<p class="text-sm text-muted-foreground">
									{classData.chapters.length} chapitre{classData.chapters.length !== 1 ? 's' : ''}
								</p>
							</div>
						</div>
						<Button href="/dashboard/teacher/cours/{classData.classId}" variant="outline" size="sm">
							<Plus class="mr-2 h-4 w-4" />
							Ajouter un chapitre
						</Button>
					</div>

					<!-- Chapter cards or empty state -->
					{#if classData.chapters.length === 0}
						<Card.Root class="border-dashed">
							<Card.Content class="py-8 text-center">
								<FolderOpen class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
								<p class="text-muted-foreground">Aucun chapitre pour cette classe</p>
								<Button
									href="/dashboard/teacher/cours/{classData.classId}"
									variant="ghost"
									size="sm"
									class="mt-2"
								>
									Creer le premier chapitre
								</Button>
							</Card.Content>
						</Card.Root>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{#each classData.chapters as chapter (chapter.id)}
								<div class="relative">
									<!-- Visibility badge -->
									{#if !chapter.isVisible}
										<div class="absolute top-2 right-2 z-10">
											<Badge variant="secondary" class="flex items-center gap-1">
												<EyeOff class="h-3 w-3" />
												Masque
											</Badge>
										</div>
									{/if}
									<ChapterCard
										{chapter}
										href="/dashboard/teacher/cours/{classData.classId}/{chapter.id}"
									/>
								</div>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</main>
