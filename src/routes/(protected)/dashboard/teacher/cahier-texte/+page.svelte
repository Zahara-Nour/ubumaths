<script lang="ts">
	/**
	 * Teacher Class Journal (Cahier de Texte) Main Page
	 * ==================================================
	 *
	 * Weekly view of journal entries for the teacher's classes.
	 * - Select class via dropdown
	 * - Navigate between weeks
	 * - View entries with status indicators (planned/done/published)
	 * - Click on day to create/edit entry
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import JournalWeekGrid from '$lib/components/journal/JournalWeekGrid.svelte';
	import JournalDatePicker from '$lib/components/journal/JournalDatePicker.svelte';
	import { BookOpen, GraduationCap, Calendar } from 'lucide-svelte';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let hasClasses = $derived(data.classes.length > 0);

	// Class items for the selector
	let classItems = $derived(
		data.classes.map((c) => ({
			value: c.id,
			label: `${c.name}${!c.is_active ? ' (inactive)' : ''}`
		}))
	);

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
		updateUrl({ class: classId });
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
	 * Navigate to entry editor
	 */
	function goToEntry(date: Date) {
		if (!data.selectedClassId) return;
		const dateStr = date.toISOString().split('T')[0];
		goto(`/dashboard/teacher/cahier-texte/${data.selectedClassId}/${dateStr}`);
	}

	/**
	 * Check if current week includes today
	 */
	let isCurrentWeek = $derived(data.weekView?.days.some((d) => d.isToday) ?? false);

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
				<p class="text-muted-foreground">Gerez le contenu des seances et les devoirs</p>
			</div>
		</div>
	</div>

	{#if !hasClasses}
		<!-- No classes state -->
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<GraduationCap class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
				<h2 class="text-xl font-semibold">Aucune classe</h2>
				<p class="mt-2 text-muted-foreground">
					Vous devez d'abord creer une classe pour utiliser le cahier de texte.
				</p>
				<Button href="/dashboard/teacher/classes" class="mt-4">Gerer les classes</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Controls bar -->
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<!-- Class selector -->
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-muted-foreground">Classe :</span>
				<MySelect
					type="single"
					value={data.selectedClassId || ''}
					items={classItems}
					onValueChange={handleClassChange}
					placeholder="Selectionner une classe"
				/>
			</div>

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
			{#if data.weekView}
				<p class="text-sm text-muted-foreground">
					{data.weekView.className}{#if data.weekView.classGrade}
						- {GRADES[data.weekView.classGrade as GradeCode]?.displayName ??
							data.weekView.classGrade}{/if}
				</p>
			{/if}
		</div>

		<!-- Week grid -->
		{#if data.weekView}
			<JournalWeekGrid days={data.weekView.days} onDayClick={goToEntry} />
		{:else}
			<!-- No class selected or error loading -->
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<Calendar class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
					<p class="text-muted-foreground">Selectionnez une classe pour voir le cahier de texte</p>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</main>
