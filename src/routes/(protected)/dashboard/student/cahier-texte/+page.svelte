<script lang="ts">
	/**
	 * Student Class Journal (Cahier de Texte) Page
	 * =============================================
	 *
	 * Shows published journal entries and upcoming homework.
	 * - Weekly view with navigation
	 * - Class filter (if multiple classes)
	 * - Upcoming homework section
	 * - Click on entry to view details
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import { JournalDatePicker, HomeworkCard } from '$lib/components/journal';
	import { BookOpen, Calendar, ClipboardList, ChevronRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let hasClasses = $derived(data.classes.length > 0);
	let hasMultipleClasses = $derived(data.classes.length > 1);

	// Class items for the selector
	let classItems = $derived([
		{ value: '', label: 'Toutes les classes' },
		...data.classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	]);

	/**
	 * Navigate to previous week
	 */
	function goToPreviousWeek() {
		const current = new Date(data.weekStart);
		current.setDate(current.getDate() - 7);
		const newWeekStart = current.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Navigate to next week
	 */
	function goToNextWeek() {
		const current = new Date(data.weekStart);
		current.setDate(current.getDate() + 7);
		const newWeekStart = current.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Navigate to current week
	 */
	function goToCurrentWeek() {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const day = now.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		now.setDate(now.getDate() + diff);
		const newWeekStart = now.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Handle class selection change
	 */
	function handleClassChange(classId: string) {
		if (classId) {
			updateUrl({ class: classId });
		} else {
			// Remove class filter
			const url = new URL($page.url);
			url.searchParams.delete('class');
			goto(url.toString(), { replaceState: true });
		}
	}

	/**
	 * Update URL with new params
	 */
	function updateUrl(params: Record<string, string>) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		goto(url.toString(), { replaceState: true });
	}

	/**
	 * Navigate to entry detail
	 */
	function goToEntry(entryId: string) {
		goto(`/dashboard/student/cahier-texte/${entryId}`);
	}

	/**
	 * Check if current week includes today
	 */
	let isCurrentWeek = $derived(data.days.some((d) => d.isToday));

	/**
	 * Format week range for display
	 */
	function formatWeekRange(weekStart: string): string {
		const start = new Date(weekStart);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);

		const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
		const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });

		if (startMonth === endMonth) {
			return `${start.getDate()} - ${end.getDate()} ${startMonth} ${start.getFullYear()}`;
		}
		return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`;
	}

	/**
	 * Format date for display (e.g., "Lundi 15 janvier")
	 */
	function formatDateLong(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	/**
	 * Truncate HTML content for preview
	 */
	function truncateContent(html: string | null, maxLength: number = 150): string {
		if (!html) return '';
		// Strip HTML tags for preview
		const text = html.replace(/<[^>]*>/g, '');
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength).trim() + '...';
	}
</script>

<svelte:head>
	<title>Cahier de Texte | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<BookOpen class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Cahier de Texte</h1>
				<p class="text-muted-foreground">Contenu des seances et travail a faire</p>
			</div>
		</div>
	</div>

	{#if !hasClasses}
		<!-- No classes state -->
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<BookOpen class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
				<h2 class="text-xl font-semibold">Aucune classe</h2>
				<p class="mt-2 text-muted-foreground">Tu n'es inscrit dans aucune classe pour le moment.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-8 lg:grid-cols-3">
			<!-- Main content (2/3) -->
			<div class="lg:col-span-2">
				<!-- Controls bar -->
				<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
					<!-- Class selector (only if multiple classes) -->
					{#if hasMultipleClasses}
						<div class="flex items-center gap-3">
							<span class="text-sm font-medium text-muted-foreground">Classe :</span>
							<MySelect
								type="single"
								value={data.selectedClassId || ''}
								items={classItems}
								onValueChange={handleClassChange}
								placeholder="Toutes les classes"
							/>
						</div>
					{/if}

					<!-- Week navigation -->
					<JournalDatePicker
						weekStart={new Date(data.weekStart)}
						onPrevious={goToPreviousWeek}
						onNext={goToNextWeek}
						onToday={goToCurrentWeek}
						{isCurrentWeek}
					/>
				</div>

				<!-- Week indicator -->
				<div class="mb-6">
					<h2 class="text-lg font-semibold">{formatWeekRange(data.weekStart)}</h2>
				</div>

				<!-- Week entries -->
				{#if data.weekEntries.length === 0}
					<Card.Root>
						<Card.Content class="py-12 text-center">
							<Calendar class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
							<p class="text-muted-foreground">Aucune entree publiee pour cette semaine</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-4">
						{#each data.weekEntries as entry (entry.id)}
							<Card.Root
								class="cursor-pointer transition-shadow hover:shadow-md"
								onclick={() => goToEntry(entry.id)}
							>
								<Card.Header class="pb-2">
									<div class="flex items-start justify-between">
										<div>
											<Card.Title class="text-lg">
												{formatDateLong(entry.entryDate)}
											</Card.Title>
											<Card.Description>
												{entry.className} - {entry.classLevel}
											</Card.Description>
										</div>
										<div class="flex gap-2">
											{#if entry.lessonContent}
												<Badge variant="secondary">
													<BookOpen class="mr-1 h-3 w-3" />
													Cours
												</Badge>
											{/if}
											{#if entry.homeworkContent}
												<Badge variant="outline" class="text-orange-600">
													<ClipboardList class="mr-1 h-3 w-3" />
													Devoirs
												</Badge>
											{/if}
										</div>
									</div>
								</Card.Header>
								<Card.Content>
									{#if entry.lessonContent}
										<p class="text-sm text-muted-foreground">
											{truncateContent(entry.lessonContent)}
										</p>
									{/if}
								</Card.Content>
								<Card.Footer class="pt-0">
									<Button variant="ghost" size="sm" class="ml-auto">
										Voir le detail
										<ChevronRight class="ml-1 h-4 w-4" />
									</Button>
								</Card.Footer>
							</Card.Root>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Sidebar - Upcoming homework (1/3) -->
			<div class="lg:col-span-1">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<ClipboardList class="h-5 w-5 text-orange-500" />
							Travail a faire
						</Card.Title>
						<Card.Description>Prochains devoirs et exercices</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if data.upcomingHomework.length === 0}
							<p class="py-4 text-center text-sm text-muted-foreground">Aucun devoir a venir</p>
						{:else}
							<div class="space-y-3">
								{#each data.upcomingHomework as homework (homework.id)}
									<HomeworkCard {homework} onclick={() => goToEntry(homework.id)} />
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</main>
