<!--
	Journal Date Picker Component
	==============================

	Week navigation for the class journal.

	Props:
	- weekStart: Date - Start of the current week (Monday)
	- onPrevious: () => void - Callback for previous week
	- onNext: () => void - Callback for next week
	- onToday: () => void - Callback for current week
	- isCurrentWeek: boolean - Whether this is the current week

	Features:
	- Previous/Next week buttons
	- Week range display (e.g., "15 - 21 Jan 2024")
	- Today button (disabled if already on current week)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight, Calendar } from 'lucide-svelte';

	interface Props {
		/** Start of the week (Monday) */
		weekStart: Date;
		/** Navigate to previous week */
		onPrevious: () => void;
		/** Navigate to next week */
		onNext: () => void;
		/** Navigate to current week */
		onToday: () => void;
		/** Is this the current week? */
		isCurrentWeek: boolean;
	}

	let { weekStart, onPrevious, onNext, onToday, isCurrentWeek }: Props = $props();

	/**
	 * Format week range for display (e.g., "15 - 21 Jan 2024")
	 */
	let weekRange = $derived.by(() => {
		const start = new Date(weekStart);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);

		const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
		const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });

		if (startMonth === endMonth) {
			return `${start.getDate()} - ${end.getDate()} ${startMonth} ${start.getFullYear()}`;
		}
		return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`;
	});
</script>

<div class="flex items-center gap-2">
	<!-- Previous week -->
	<Button variant="outline" size="icon" onclick={onPrevious} title="Semaine précédente">
		<ChevronLeft class="h-4 w-4" />
		<span class="sr-only">Semaine précédente</span>
	</Button>

	<!-- Current week / Today button -->
	<Button
		variant={isCurrentWeek ? 'secondary' : 'outline'}
		size="sm"
		onclick={onToday}
		disabled={isCurrentWeek}
		title="Semaine actuelle"
		class="min-w-[180px]"
	>
		<Calendar class="mr-2 h-4 w-4" />
		{isCurrentWeek ? weekRange : "Aujourd'hui"}
	</Button>

	<!-- Next week -->
	<Button variant="outline" size="icon" onclick={onNext} title="Semaine suivante">
		<ChevronRight class="h-4 w-4" />
		<span class="sr-only">Semaine suivante</span>
	</Button>
</div>
