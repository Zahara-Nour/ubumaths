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
	import { Badge } from '$lib/components/ui/badge';
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		BookOpen,
		GraduationCap,
		ChevronLeft,
		ChevronRight,
		Calendar,
		FileText,
		BookCheck,
		Globe,
		Plus
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let hasClasses = $derived(data.classes.length > 0);

	// Day names for the week grid (Sunday-Thursday for French school system)
	const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

	// Class items for the selector
	let classItems = $derived(
		data.classes.map((c) => ({
			value: c.id,
			label: `${c.name}${!c.is_active ? ' (inactive)' : ''}`
		}))
	);

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
	 * Get entry status badge
	 */
	function getEntryStatus(
		entry: { isPublished: boolean; lessonContent: string | null } | undefined
	): {
		variant: 'default' | 'secondary' | 'outline';
		label: string;
		color: string;
	} {
		if (!entry) {
			return { variant: 'outline', label: 'Vide', color: 'text-muted-foreground' };
		}
		if (entry.isPublished) {
			return { variant: 'default', label: 'Publie', color: 'text-blue-600' };
		}
		if (entry.lessonContent) {
			return { variant: 'secondary', label: 'Fait', color: 'text-green-600' };
		}
		return { variant: 'secondary', label: 'Prevu', color: 'text-orange-500' };
	}

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
			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon" onclick={goToPreviousWeek} title="Semaine precedente">
					<ChevronLeft class="h-4 w-4" />
				</Button>

				<Button
					variant={isCurrentWeek() ? 'secondary' : 'outline'}
					size="sm"
					onclick={goToCurrentWeek}
					title="Semaine actuelle"
				>
					<Calendar class="mr-2 h-4 w-4" />
					Aujourd'hui
				</Button>

				<Button variant="outline" size="icon" onclick={goToNextWeek} title="Semaine suivante">
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>

		<!-- Week indicator -->
		<div class="mb-6">
			<h2 class="text-lg font-semibold">{formatWeekRange(data.weekStart)}</h2>
			{#if data.weekView}
				<p class="text-sm text-muted-foreground">
					{data.weekView.className} - {data.weekView.classLevel}
				</p>
			{/if}
		</div>

		<!-- Week grid -->
		{#if data.weekView}
			<div class="grid gap-4 md:grid-cols-5 lg:grid-cols-7">
				{#each data.weekView.days as day (day.date.toISOString())}
					{@const status = getEntryStatus(day.entry)}
					{@const isWeekend = day.isWeekend}
					{@const hasClass = day.hasScheduledClass}

					<Card.Root
						class="relative transition-all {isWeekend
							? 'opacity-50'
							: 'cursor-pointer hover:border-primary/50 hover:shadow-md'} {day.isToday
							? 'ring-2 ring-primary'
							: ''}"
						onclick={() => !isWeekend && goToEntry(day.date)}
						onkeydown={(e) => e.key === 'Enter' && !isWeekend && goToEntry(day.date)}
						role="button"
						tabindex={isWeekend ? -1 : 0}
					>
						<Card.Header class="p-3 pb-2">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium {day.isToday ? 'text-primary' : ''}">
									{DAY_SHORT[day.dayOfWeek]}
								</span>
								{#if day.isToday}
									<Badge variant="default" class="text-xs">Aujourd'hui</Badge>
								{/if}
							</div>
							<span class="text-2xl font-bold">{day.date.getDate()}</span>
						</Card.Header>

						<Card.Content class="p-3 pt-0">
							{#if isWeekend}
								<p class="text-xs text-muted-foreground">Week-end</p>
							{:else if day.entry}
								<!-- Entry exists -->
								<div class="space-y-2">
									<Badge variant={status.variant} class="text-xs {status.color}">
										{#if day.entry.isPublished}
											<Globe class="mr-1 h-3 w-3" />
										{:else if day.entry.lessonContent}
											<BookCheck class="mr-1 h-3 w-3" />
										{:else}
											<FileText class="mr-1 h-3 w-3" />
										{/if}
										{status.label}
									</Badge>

									{#if day.entry.lessonContent}
										<p class="line-clamp-2 text-xs text-muted-foreground">
											{day.entry.lessonContent.replace(/<[^>]*>/g, '').slice(0, 50)}...
										</p>
									{/if}

									{#if day.entry.homeworkContent}
										<div class="flex items-center gap-1 text-xs text-orange-600">
											<FileText class="h-3 w-3" />
											<span>Devoir</span>
										</div>
									{/if}
								</div>
							{:else}
								<!-- No entry -->
								<div
									class="flex flex-col items-center justify-center py-2 text-muted-foreground/60"
								>
									<Plus class="h-5 w-5" />
									<span class="text-xs">Ajouter</span>
								</div>
							{/if}

							{#if hasClass && !isWeekend}
								<div class="mt-2 flex items-center gap-1 text-xs text-primary/60">
									<Calendar class="h-3 w-3" />
									<span>Cours prevu</span>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>

			<!-- Legend -->
			<div class="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-orange-500"></div>
					<span>Prevu</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-green-500"></div>
					<span>Fait</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-3 w-3 rounded-full bg-blue-500"></div>
					<span>Publie</span>
				</div>
			</div>
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
