<!--
	ClassScheduleGrid Component
	===========================

	Custom weekly schedule grid displaying class schedules from Sunday to Thursday.
	Grid rows are dynamically generated from the school's timetable periods.
	Entries can span multiple periods for multi-period sessions.

	FEATURES:
	- Visual grid with day columns and period row headers
	- Rows generated from school timetable periods (not hardcoded hours)
	- Visual break indicators between non-consecutive periods (e.g., lunch break)
	- Click empty cells to create new schedule entries
	- Click existing entries to edit them
	- Multi-period entries automatically span multiple rows (rowspan)
	- Color-coded entries with subject and room information
	- Empty state when no schedules or timetable exists

	GRID STRUCTURE:
	- 5 columns: Sunday (0) through Thursday (4)
	- Dynamic rows: Based on school's timetable periods
	- Each period shows: Period name + time range
	- Entries use rowspan for sessions longer than 1 period

	Props:
	- schedules: ClassSchedule[] - Array of schedule entries to display
	- periods: SchoolPeriod[] - School timetable periods (defines grid rows)
	- onCellClick?: (day: number, time: string, entry?: ClassSchedule) => void - Callback when cell is clicked
	  * day: 0-4 (Sunday-Thursday)
	  * time: HH:MM:SS format (e.g., "08:00:00")
	  * entry: undefined for empty cells, ClassSchedule object for existing entries
	- readonly?: boolean - If true, disable clicking and hover effects (default: false)

	USAGE:
	<ClassScheduleGrid
		schedules={classSchedules}
		periods={school.timetable.periods}
		onCellClick={(day, time, entry) => {
			if (entry) {
				// Edit existing entry
				openEditModal(entry);
			} else {
				// Create new entry at this day/time
				openCreateModal(day, time);
			}
		}}
	/>
-->

<script lang="ts">
	import type { ClassSchedule, SchoolPeriod } from '$lib/types/database';
	import { getDayName, formatScheduleDisplay, formatTimeDisplay } from '$lib/utils/schedule';
	import { formatPeriodName, formatPeriodTimes } from '$lib/utils/timetable';

	interface Props {
		schedules: ClassSchedule[];
		periods: SchoolPeriod[];
		onCellClick?: (day: number, time: string, entry?: ClassSchedule) => void;
		readonly?: boolean;
	}

	let { schedules, periods, onCellClick, readonly = false }: Props = $props();

	// Generate time slots from school timetable periods
	// Each period becomes a row in the grid
	const timeSlots = $derived(
		periods.map((period) => ({
			time: period.start_time,
			display: formatPeriodName(period),
			period: period
		}))
	);

	// Days array: Sunday (0) through Thursday (4)
	const days = [0, 1, 2, 3, 4];

	/**
	 * Check if there's a break/gap between current period and previous period
	 * Returns true if previous period's end_time doesn't match current period's start_time
	 */
	function hasBreakBefore(currentPeriod: SchoolPeriod, index: number): boolean {
		if (index === 0) return false; // No break before first period
		const previousPeriod = periods[index - 1];
		return previousPeriod.end_time !== currentPeriod.start_time;
	}

	/**
	 * Calculate break duration in minutes between two periods
	 */
	function getBreakDuration(previousEndTime: string, currentStartTime: string): number {
		const prevEnd = new Date(`2000-01-01T${previousEndTime}`);
		const currStart = new Date(`2000-01-01T${currentStartTime}`);
		return (currStart.getTime() - prevEnd.getTime()) / 1000 / 60; // minutes
	}

	/**
	 * Handle cell click event
	 * Calls parent callback unless component is readonly or callback not provided
	 */
	function handleCellClick(day: number, time: string, entry?: ClassSchedule) {
		if (readonly || !onCellClick) return;
		onCellClick(day, time, entry);
	}

	/**
	 * Calculate how many periods a schedule entry spans
	 * Counts how many consecutive periods from start_time to end_time
	 */
	function calculatePeriodSpan(entry: ClassSchedule): number {
		const startPeriodIndex = periods.findIndex((p) => p.start_time === entry.start_time);
		const endPeriodIndex = periods.findIndex((p) => p.end_time === entry.end_time);

		if (startPeriodIndex === -1 || endPeriodIndex === -1) {
			// Fallback: if period not found, return 1
			return 1;
		}

		return endPeriodIndex - startPeriodIndex + 1;
	}

	/**
	 * Check if a cell should be skipped during rendering
	 * Returns true if this cell is part of a multi-period entry that started in a previous row
	 */
	function shouldSkipCell(day: number, period: SchoolPeriod): boolean {
		const entry = schedules.find(
			(s) =>
				s.day_of_week === day && s.start_time <= period.start_time && s.end_time > period.start_time
		);
		if (!entry) return false;
		// Skip if there's an entry but it doesn't start at this period
		return entry.start_time !== period.start_time;
	}

	/**
	 * Get the schedule entry to render at a specific cell
	 * Returns the entry only if it starts at this period
	 */
	function getEntryToRender(day: number, period: SchoolPeriod): ClassSchedule | undefined {
		return schedules.find((s) => s.day_of_week === day && s.start_time === period.start_time);
	}
</script>

<div class="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
	{#if periods.length === 0}
		<!-- No Timetable Configured -->
		<div class="p-8 text-center">
			<p class="text-muted-foreground">
				Aucune période n'est définie dans l'emploi du temps de l'école.
			</p>
			<p class="mt-2 text-sm text-muted-foreground">
				Contactez l'administrateur pour configurer les périodes.
			</p>
		</div>
	{:else}
		<!-- Schedule Grid -->
		<div class="overflow-x-auto">
			<table class="w-full border-collapse">
				<!-- Header Row: Day Names -->
				<thead>
					<tr class="bg-muted/50">
						<th class="w-20 border border-border p-2 text-xs font-semibold text-muted-foreground">
							Heure
						</th>
						{#each days as day (day)}
							<th
								class="min-w-[120px] border border-border p-3 text-sm font-semibold text-foreground"
							>
								{getDayName(day)}
							</th>
						{/each}
					</tr>
				</thead>

				<!-- Body: Time Slots (Periods) -->
				<tbody>
					{#each timeSlots as slot, index (slot.period.start_time)}
						<!-- Break Row (if there's a gap between periods) -->
						{#if hasBreakBefore(slot.period, index)}
							{@const previousPeriod = periods[index - 1]}
							{@const breakDuration = getBreakDuration(
								previousPeriod.end_time,
								slot.period.start_time
							)}
							<tr class="bg-yellow-50/50">
								<td colspan="6" class="border border-yellow-200 bg-yellow-50 p-2 text-center">
									<div class="flex items-center justify-center gap-2 text-xs text-yellow-700">
										<span class="font-medium">☕ Pause</span>
										<span class="text-yellow-600">
											({formatTimeDisplay(previousPeriod.end_time)} - {formatTimeDisplay(
												slot.period.start_time
											)})
										</span>
										<span class="text-yellow-600/70">
											• {breakDuration} min
										</span>
									</div>
								</td>
							</tr>
						{/if}

						<!-- Period Row -->
						<tr>
							<!-- Time Column (Period Name + Times) -->
							<td class="border border-border bg-muted/30 p-2 text-xs">
								<div class="font-medium text-muted-foreground">{slot.display}</div>
								<div class="mt-0.5 text-[10px] text-muted-foreground/70">
									{formatPeriodTimes(slot.period)}
								</div>
							</td>

							<!-- Day Columns -->
							{#each days as day (day)}
								{@const entry = getEntryToRender(day, slot.period)}
								{@const shouldSkip = shouldSkipCell(day, slot.period)}

								{#if !shouldSkip}
									{#if entry}
										{@const rowspan = calculatePeriodSpan(entry)}
										{@const isOptimistic = entry.id.startsWith('temp-')}
										<td
											{rowspan}
											class="cursor-pointer border border-border p-2 transition-all {isOptimistic
												? 'animate-pulse bg-primary/5'
												: 'bg-primary/10 hover:bg-primary/20'} {readonly ? '' : 'hover:shadow-md'}"
											onclick={() => handleCellClick(day, slot.time, entry)}
										>
											<div class="flex items-center gap-1">
												<div class="text-sm font-medium text-primary">
													{formatScheduleDisplay(entry)}
												</div>
												{#if isOptimistic}
													<div
														class="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"
														title="Enregistrement en cours..."
													></div>
												{/if}
											</div>
											<div class="mt-1 text-xs text-muted-foreground">
												{formatTimeDisplay(entry.start_time)} - {formatTimeDisplay(entry.end_time)}
											</div>
											{#if entry.notes}
												<div class="mt-1 truncate text-xs text-muted-foreground italic">
													{entry.notes}
												</div>
											{/if}
										</td>
									{:else}
										<td
											class="cursor-pointer border border-border p-2 transition-colors hover:bg-green-50 {readonly
												? ''
												: 'hover:border-green-200 hover:shadow-sm'}"
											onclick={() => handleCellClick(day, slot.time)}
											title="Cliquez pour ajouter un créneau Maths"
										>
											<div
												class="text-center text-xs font-medium text-green-600 opacity-0 transition-opacity hover:opacity-100"
											>
												+ Maths
											</div>
										</td>
									{/if}
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Empty State (shown when no schedules exist) -->
		{#if schedules.length === 0}
			<div class="p-8 text-center">
				<p class="text-muted-foreground">
					Aucun créneau d'emploi du temps défini pour cette classe.
				</p>
				{#if !readonly}
					<p class="mt-2 text-sm text-muted-foreground">
						Cliquez sur "Modifier l'Emploi du Temps" pour ajouter des créneaux.
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Ensure table cells don't wrap text unless necessary */
	table {
		table-layout: fixed;
	}

	td,
	th {
		vertical-align: top;
	}
</style>
