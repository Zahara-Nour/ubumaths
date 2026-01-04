<!--
	Journal Entry Card Component
	=============================

	Displays a summary of a journal entry.

	Props:
	- entry: ClassJournalEntry - The journal entry
	- className?: string - Optional class name (if not included in entry)
	- showClass?: boolean - Whether to show class name
	- onclick?: () => void - Click handler

	Features:
	- Formatted date
	- Status badge (planned/done/published)
	- Lesson content preview (truncated to 100 chars)
	- Homework indicator with due date
	- Clickable card (if onclick provided)
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, BookCheck, Globe, Calendar, ClipboardList } from 'lucide-svelte';
	import type { ClassJournalEntry, JournalEntryWithClass } from '$lib/types/journal';
	import { cn } from '$lib/utils';

	interface Props {
		/** The journal entry */
		entry: ClassJournalEntry | JournalEntryWithClass;
		/** Additional class name for styling */
		className?: string;
		/** Show class name (requires JournalEntryWithClass) */
		showClass?: boolean;
		/** Click handler */
		onclick?: () => void;
	}

	let { entry, className, showClass = false, onclick }: Props = $props();

	/**
	 * Format date for display (e.g., "Lun 15 Jan")
	 */
	let formattedDate = $derived.by(() => {
		const date = new Date(entry.entryDate);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	});

	/**
	 * Get entry status
	 */
	let status = $derived.by(() => {
		if (entry.isPublished) {
			return { variant: 'default' as const, label: 'Publié', color: 'text-blue-600' };
		}
		if (entry.lessonContent) {
			return { variant: 'secondary' as const, label: 'Fait', color: 'text-green-600' };
		}
		return { variant: 'secondary' as const, label: 'Prévu', color: 'text-orange-500' };
	});

	/**
	 * Strip HTML and truncate content
	 */
	function truncateContent(html: string | null, maxLength: number): string {
		if (!html) return '';
		const text = html.replace(/<[^>]*>/g, '');
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}

	/**
	 * Format homework due date (e.g., "À rendre le 20 Jan")
	 */
	let homeworkDueDateText = $derived.by(() => {
		if (!entry.homeworkDueDate) return null;
		const date = new Date(entry.homeworkDueDate);
		return `À rendre le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
	});

	/**
	 * Check if entry has class info
	 */
	function hasClassInfo(e: ClassJournalEntry | JournalEntryWithClass): e is JournalEntryWithClass {
		return 'className' in e && 'classLevel' in e;
	}
</script>

<Card.Root
	class={cn(
		'transition-all',
		onclick && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
		className
	)}
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
>
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1">
				<!-- Date -->
				<div class="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
					<Calendar class="h-4 w-4" />
					<span>{formattedDate}</span>
				</div>

				<!-- Class name (if showClass) -->
				{#if showClass && hasClassInfo(entry)}
					<h3 class="font-semibold">{entry.className}</h3>
					<p class="text-sm text-muted-foreground">{entry.classLevel}</p>
				{/if}
			</div>

			<!-- Status badge -->
			<Badge variant={status.variant} class="text-xs {status.color}">
				{#if entry.isPublished}
					<Globe class="mr-1 h-3 w-3" />
				{:else if entry.lessonContent}
					<BookCheck class="mr-1 h-3 w-3" />
				{:else}
					<FileText class="mr-1 h-3 w-3" />
				{/if}
				{status.label}
			</Badge>
		</div>
	</Card.Header>

	<Card.Content class="space-y-2">
		<!-- Lesson content preview -->
		{#if entry.lessonContent}
			<div>
				<p class="text-sm text-muted-foreground">
					{truncateContent(entry.lessonContent, 100)}
				</p>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground/60 italic">Aucun contenu de séance</p>
		{/if}

		<!-- Homework indicator -->
		{#if entry.homeworkContent}
			<div class="flex items-start gap-2 rounded-md bg-orange-50 p-2 dark:bg-orange-950/20">
				<ClipboardList class="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
				<div class="flex-1 space-y-1">
					<p class="text-sm font-medium text-orange-900 dark:text-orange-100">Devoir assigné</p>
					{#if homeworkDueDateText}
						<p class="text-xs text-orange-700 dark:text-orange-300">{homeworkDueDateText}</p>
					{/if}
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
