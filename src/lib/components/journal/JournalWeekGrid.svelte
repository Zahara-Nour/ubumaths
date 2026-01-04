<!--
	Journal Week Grid Component
	============================

	Weekly grid view for class journal entries.

	Props:
	- days: JournalWeekDay[] - Array of 7 days (Sun-Sat or Mon-Fri configurable)
	- onDayClick?: (date: Date) => void - Callback when clicking on a day
	- readonly?: boolean - Read-only mode (for students)
	- className?: string - Additional CSS classes

	Features:
	- 7-column grid (or 5 for weekdays only)
	- Highlights current day
	- Status indicators (planned/done/published)
	- Preview of lesson content (truncated)
	- Homework indicator
	- Responsive design
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, BookCheck, Globe, Plus, Calendar } from 'lucide-svelte';
	import type { JournalWeekDay } from '$lib/types/journal';
	import { cn } from '$lib/utils';

	interface Props {
		/** Days of the week with entries */
		days: JournalWeekDay[];
		/** Callback when clicking on a day */
		onDayClick?: (date: Date) => void;
		/** Read-only mode (no click, no add button) */
		readonly?: boolean;
		/** Additional CSS classes */
		className?: string;
	}

	let { days, onDayClick, readonly = false, className }: Props = $props();

	// Day names (short form)
	const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

	/**
	 * Get entry status badge configuration
	 */
	function getEntryStatus(entry: JournalWeekDay['entry']): {
		variant: 'default' | 'secondary' | 'outline';
		label: string;
		color: string;
	} {
		if (!entry) {
			return { variant: 'outline', label: 'Vide', color: 'text-muted-foreground' };
		}
		if (entry.isPublished) {
			return { variant: 'default', label: 'Publié', color: 'text-blue-600' };
		}
		if (entry.lessonContent) {
			return { variant: 'secondary', label: 'Fait', color: 'text-green-600' };
		}
		return { variant: 'secondary', label: 'Prévu', color: 'text-orange-500' };
	}

	/**
	 * Handle day click
	 */
	function handleDayClick(day: JournalWeekDay) {
		if (readonly || day.isWeekend || !onDayClick) return;
		onDayClick(day.date);
	}

	/**
	 * Strip HTML tags from content
	 */
	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '');
	}
</script>

<div class={cn('grid gap-4 md:grid-cols-5 lg:grid-cols-7', className)}>
	{#each days as day (day.date.toISOString())}
		{@const status = getEntryStatus(day.entry)}
		{@const isClickable = !readonly && !day.isWeekend && onDayClick}

		<Card.Root
			class={cn(
				'relative transition-all',
				day.isWeekend && 'opacity-50',
				isClickable && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
				day.isToday && 'ring-2 ring-primary'
			)}
			onclick={() => handleDayClick(day)}
			onkeydown={(e) => e.key === 'Enter' && handleDayClick(day)}
			role={isClickable ? 'button' : undefined}
			tabindex={isClickable ? 0 : -1}
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
				{#if day.isWeekend}
					<!-- Weekend -->
					<p class="text-xs text-muted-foreground">Week-end</p>
				{:else if day.entry}
					<!-- Entry exists -->
					<div class="space-y-2">
						<!-- Status badge -->
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

						<!-- Lesson content preview -->
						{#if day.entry.lessonContent}
							<p class="line-clamp-2 text-xs text-muted-foreground">
								{stripHtml(day.entry.lessonContent).slice(0, 50)}...
							</p>
						{/if}

						<!-- Homework indicator -->
						{#if day.entry.homeworkContent}
							<div class="flex items-center gap-1 text-xs text-orange-600">
								<FileText class="h-3 w-3" />
								<span>Devoir</span>
							</div>
						{/if}
					</div>
				{:else}
					<!-- No entry -->
					{#if !readonly}
						<div class="flex flex-col items-center justify-center py-2 text-muted-foreground/60">
							<Plus class="h-5 w-5" />
							<span class="text-xs">Ajouter</span>
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">Aucune entrée</p>
					{/if}
				{/if}

				<!-- Scheduled class indicator -->
				{#if day.hasScheduledClass && !day.isWeekend}
					<div class="mt-2 flex items-center gap-1 text-xs text-primary/60">
						<Calendar class="h-3 w-3" />
						<span>Cours prévu</span>
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
		<span>Prévu</span>
	</div>
	<div class="flex items-center gap-2">
		<div class="h-3 w-3 rounded-full bg-green-500"></div>
		<span>Fait</span>
	</div>
	<div class="flex items-center gap-2">
		<div class="h-3 w-3 rounded-full bg-blue-500"></div>
		<span>Publié</span>
	</div>
</div>
