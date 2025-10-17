<!--
	ClassStatsCard Component
	========================

	Displays statistics for a class with an "Edit Schedule" button.
	Currently shows student count, expandable for future stats.

	Props:
	- studentCount: number - Number of students in the class
	- onEditSchedule: () => void - Callback when edit button is clicked
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CalendarClock, Users } from 'lucide-svelte';

	interface Props {
		studentCount: number;
		onEditSchedule: () => void;
	}

	let { studentCount, onEditSchedule }: Props = $props();
</script>

<div class="bg-card rounded-lg border border-border shadow-sm p-6">
	<div class="flex items-center justify-between">
		<!-- Stats Section -->
		<div class="flex items-center gap-6">
			<!-- Student Count -->
			<div class="flex items-center gap-3">
				<div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
					<Users class="w-6 h-6 text-primary" />
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Élèves</p>
					<p class="text-2xl font-bold text-foreground">{studentCount}</p>
				</div>
			</div>

			<!-- Future stats can be added here -->
			<!-- Example:
			<div class="flex items-center gap-3">
				<div class="flex items-center justify-center w-12 h-12 rounded-full bg-secondary/10">
					<ClipboardList class="w-6 h-6 text-secondary" />
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Devoirs Actifs</p>
					<p class="text-2xl font-bold text-foreground">12</p>
				</div>
			</div>
			-->
		</div>

		<!-- Edit Schedule Button -->
		<Button onclick={onEditSchedule} class="gap-2">
			<CalendarClock class="w-4 h-4" />
			Modifier l'Emploi du Temps
		</Button>
	</div>
</div>
