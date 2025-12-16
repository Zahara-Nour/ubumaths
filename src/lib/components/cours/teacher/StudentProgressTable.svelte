<!--
	StudentProgressTable Component
	==============================

	Table showing student progress on checklist.
	Rows are students, columns are checklist items.
	Shows checkmarks for completed items with completion percentage per student.

	@module components/cours/teacher/StudentProgressTable
-->
<script lang="ts">
	import type { ChapterChecklistItem } from '$lib/types/chapters';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import { Check, X, Users } from 'lucide-svelte';

	// Props
	interface Student {
		id: string;
		name: string;
	}

	// Progress data structure from getStudentChecklistProgress
	interface StudentProgress {
		studentId: string;
		items: (ChapterChecklistItem & { isCompleted: boolean; completedAt: string | null })[];
	}

	interface Props {
		students: Student[];
		checklistItems: ChapterChecklistItem[];
		progress: StudentProgress[];
	}

	let { students, checklistItems, progress }: Props = $props();

	// Sort checklist items by display order
	const sortedItems = $derived([...checklistItems].sort((a, b) => a.displayOrder - b.displayOrder));

	// Create a lookup map for quick progress checking
	// Convert from StudentProgress[] to Map<studentId-itemId, isCompleted>
	const progressMap = $derived.by(() => {
		const map = new Map<string, boolean>();
		for (const studentProgress of progress) {
			for (const item of studentProgress.items) {
				map.set(`${studentProgress.studentId}-${item.id}`, item.isCompleted);
			}
		}
		return map;
	});

	// Check if a student has completed an item
	function isItemCompleted(studentId: string, itemId: string): boolean {
		return progressMap.get(`${studentId}-${itemId}`) ?? false;
	}

	// Calculate completion percentage for a student
	function getStudentCompletionPercent(studentId: string): number {
		if (checklistItems.length === 0) return 0;

		const completed = checklistItems.filter((item) => isItemCompleted(studentId, item.id)).length;

		return Math.round((completed / checklistItems.length) * 100);
	}

	// Calculate completion percentage for an item (across all students)
	function getItemCompletionPercent(itemId: string): number {
		if (students.length === 0) return 0;

		const completed = students.filter((student) => isItemCompleted(student.id, itemId)).length;

		return Math.round((completed / students.length) * 100);
	}

	// Calculate overall completion percentage
	const overallCompletion = $derived.by(() => {
		if (students.length === 0 || checklistItems.length === 0) return 0;

		const totalPossible = students.length * checklistItems.length;
		let totalCompleted = 0;
		for (const studentProgress of progress) {
			totalCompleted += studentProgress.items.filter((item) => item.isCompleted).length;
		}

		return Math.round((totalCompleted / totalPossible) * 100);
	});

	// Sort students by name
	const sortedStudents = $derived([...students].sort((a, b) => a.name.localeCompare(b.name, 'fr')));

	// Color for percentage
	function getPercentColor(percent: number): string {
		if (percent >= 80) return 'text-green-600 dark:text-green-400';
		if (percent >= 50) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Users class="h-5 w-5 text-primary" />
				<Card.Title>Progression des eleves</Card.Title>
			</div>
			<div class="flex items-center gap-4 text-sm">
				<span class="text-muted-foreground">
					{students.length} eleve{students.length > 1 ? 's' : ''}
				</span>
				<span class={cn('font-medium', getPercentColor(overallCompletion))}>
					{overallCompletion}% global
				</span>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if students.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">Aucun eleve dans cette classe.</p>
		{:else if checklistItems.length === 0}
			<p class="py-6 text-center text-sm text-muted-foreground">
				Aucun objectif defini pour ce chapitre.
			</p>
		{:else}
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="sticky left-0 z-10 min-w-[150px] bg-card">Eleve</Table.Head>
							{#each sortedItems as item (item.id)}
								<Table.Head class="min-w-[80px] text-center">
									<div class="flex flex-col items-center gap-1">
										<span class="line-clamp-2 text-xs" title={item.content}>
											{item.content.length > 20
												? item.content.substring(0, 20) + '...'
												: item.content}
										</span>
										<span class={cn('text-xs', getPercentColor(getItemCompletionPercent(item.id)))}>
											{getItemCompletionPercent(item.id)}%
										</span>
									</div>
								</Table.Head>
							{/each}
							<Table.Head class="sticky right-0 z-10 min-w-[100px] bg-card text-center">
								Total
							</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#each sortedStudents as student (student.id)}
							{@const completionPercent = getStudentCompletionPercent(student.id)}
							<Table.Row>
								<Table.Cell class="sticky left-0 z-10 bg-card font-medium">
									{student.name}
								</Table.Cell>

								{#each sortedItems as item (item.id)}
									{@const completed = isItemCompleted(student.id, item.id)}
									<Table.Cell class="text-center">
										{#if completed}
											<div class="flex justify-center">
												<div class="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
													<Check class="h-4 w-4 text-green-600 dark:text-green-400" />
												</div>
											</div>
										{:else}
											<div class="flex justify-center">
												<div class="rounded-full bg-muted p-1">
													<X class="h-4 w-4 text-muted-foreground/50" />
												</div>
											</div>
										{/if}
									</Table.Cell>
								{/each}

								<Table.Cell class="sticky right-0 z-10 bg-card">
									<div class="flex flex-col items-center gap-1">
										<span class={cn('font-bold', getPercentColor(completionPercent))}>
											{completionPercent}%
										</span>
										<Progress value={completionPercent} max={100} class="h-1.5 w-16" />
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Legend -->
			<div
				class="mt-4 flex items-center justify-center gap-6 border-t pt-4 text-sm text-muted-foreground"
			>
				<div class="flex items-center gap-2">
					<div class="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
						<Check class="h-3 w-3 text-green-600 dark:text-green-400" />
					</div>
					<span>Complete</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="rounded-full bg-muted p-1">
						<X class="h-3 w-3 text-muted-foreground/50" />
					</div>
					<span>Non complete</span>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
