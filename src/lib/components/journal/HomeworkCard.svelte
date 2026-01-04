<!--
	Homework Card Component
	=======================

	Displays a homework assignment (student view).

	Props:
	- homework: UpcomingHomework - The homework assignment
	- onclick?: () => void - Click handler

	Features:
	- Class name and level
	- Homework content (truncated)
	- Due date with countdown ("Dans 2 jours")
	- Urgency badge (red if < 2 days)
	- Assignment date
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ClipboardList, Calendar, Clock, AlertCircle } from 'lucide-svelte';
	import type { UpcomingHomework } from '$lib/types/journal';
	import { cn } from '$lib/utils';

	interface Props {
		/** The homework assignment */
		homework: UpcomingHomework;
		/** Click handler */
		onclick?: () => void;
	}

	let { homework, onclick }: Props = $props();

	/**
	 * Truncate HTML content
	 */
	function truncateContent(html: string, maxLength: number): string {
		const text = html.replace(/<[^>]*>/g, '');
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}

	/**
	 * Format due date countdown (e.g., "Dans 2 jours", "Demain", "Aujourd'hui")
	 */
	let dueDateCountdown = $derived.by(() => {
		const days = homework.daysUntilDue;
		if (days === 0) return "Aujourd'hui";
		if (days === 1) return 'Demain';
		if (days < 0) return `En retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
		return `Dans ${days} jour${days > 1 ? 's' : ''}`;
	});

	/**
	 * Check if homework is urgent (< 2 days)
	 */
	let isUrgent = $derived(homework.daysUntilDue <= 2);

	/**
	 * Check if homework is late
	 */
	let isLate = $derived(homework.daysUntilDue < 0);

	/**
	 * Format assignment date (e.g., "Donné le 15 Jan")
	 */
	let assignmentDate = $derived.by(() => {
		const date = new Date(homework.entryDate);
		return `Donné le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
	});

	/**
	 * Format due date (e.g., "20 Jan 2024")
	 */
	let formattedDueDate = $derived.by(() => {
		const date = new Date(homework.homeworkDueDate);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	});
</script>

<Card.Root
	class={cn(
		'transition-all',
		onclick && 'cursor-pointer hover:border-primary/50 hover:shadow-md',
		isUrgent && 'border-orange-300 dark:border-orange-700',
		isLate && 'border-destructive dark:border-destructive'
	)}
	{onclick}
	onkeydown={(e) => e.key === 'Enter' && onclick?.()}
	role={onclick ? 'button' : undefined}
	tabindex={onclick ? 0 : undefined}
>
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1">
				<!-- Class name -->
				<h3 class="font-semibold">{homework.className}</h3>
				<p class="text-sm text-muted-foreground">{homework.classLevel}</p>
			</div>

			<!-- Urgency badge -->
			{#if isLate}
				<Badge variant="destructive" class="gap-1 text-xs">
					<AlertCircle class="h-3 w-3" />
					En retard
				</Badge>
			{:else if isUrgent}
				<Badge variant="destructive" class="gap-1 text-xs">
					<Clock class="h-3 w-3" />
					Urgent
				</Badge>
			{:else}
				<Badge variant="secondary" class="gap-1 text-xs">
					<ClipboardList class="h-3 w-3" />
					Devoir
				</Badge>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="space-y-3">
		<!-- Homework content preview -->
		<div class="rounded-md bg-muted/50 p-3">
			<p class="text-sm">
				{truncateContent(homework.homeworkContent, 150)}
			</p>
		</div>

		<!-- Due date and countdown -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Calendar class="h-4 w-4" />
				<span>{assignmentDate}</span>
			</div>

			<div
				class={cn(
					'flex items-center gap-1 text-sm font-medium',
					isLate ? 'text-destructive' : isUrgent ? 'text-orange-600' : 'text-muted-foreground'
				)}
			>
				<Clock class="h-4 w-4" />
				<span>{dueDateCountdown}</span>
			</div>
		</div>

		<!-- Due date detail -->
		<div class="border-t pt-2">
			<p class="text-xs text-muted-foreground">À rendre : {formattedDueDate}</p>
		</div>
	</Card.Content>
</Card.Root>
