<!--
	EvaluationResultsTable
	======================
	Résultats d'une évaluation, un élève par ligne (E21, chantier 5) : la MEILLEURE
	note sur 20 (Q36) et le détail de chaque tentative (note, ou « en cours »).

	Props:
	- results: EvaluationResult[] - lignes de `getEvaluationResults`
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import {
		formatGrade,
		getStatusColor,
		getStatusLabel,
		type EvaluationResult
	} from '$lib/types/evaluation';

	interface Props {
		results: EvaluationResult[];
	}

	let { results }: Props = $props();

	const sortedResults = $derived(
		[...results].sort((a, b) => {
			const nameA = `${a.student_firstname} ${a.student_lastname}`.toLowerCase();
			const nameB = `${b.student_firstname} ${b.student_lastname}`.toLowerCase();
			return nameA.localeCompare(nameB);
		})
	);

	function formatDate(iso: string | null): string {
		return iso ? new Date(iso).toLocaleDateString('fr-FR') : '–';
	}
</script>

<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>{lore.entities.student}</Table.Head>
			<Table.Head>{lore.entities.class}</Table.Head>
			<Table.Head class="text-center">Statut</Table.Head>
			<Table.Head class="text-center">Meilleure note</Table.Head>
			<Table.Head>Tentatives</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each sortedResults as result (result.student_id)}
			<Table.Row>
				<Table.Cell class="font-medium" data-testid="student-name">
					{result.student_firstname}
					{result.student_lastname}
				</Table.Cell>
				<Table.Cell>{result.class_name || '–'}</Table.Cell>
				<Table.Cell class="text-center">
					<Badge class={getStatusColor(result.status)}>{getStatusLabel(result.status)}</Badge>
				</Table.Cell>
				<Table.Cell class="text-center">
					<span
						data-testid="best-grade"
						class="font-semibold {result.best_grade === null
							? 'text-muted-foreground'
							: result.best_grade >= 10
								? 'text-green-600 dark:text-green-400'
								: 'text-red-600 dark:text-red-400'}"
					>
						{formatGrade(result.best_grade)}
					</span>
				</Table.Cell>
				<Table.Cell>
					{#if result.attempts.length === 0}
						<span class="text-sm text-muted-foreground">Aucune</span>
					{:else}
						<ul class="space-y-1 text-sm">
							{#each result.attempts as attempt, index (index)}
								<li data-testid="attempt" class="flex flex-wrap items-center gap-2">
									{#if attempt.completed_at === null}
										<Badge variant="outline">en cours</Badge>
										<span class="text-muted-foreground">
											commencée le {formatDate(attempt.created_at)}
										</span>
									{:else}
										<span class="font-medium">{formatGrade(attempt.grade)}</span>
										{#if attempt.points_earned !== null && attempt.total_questions}
											<span class="text-muted-foreground">
												({Number(attempt.points_earned).toLocaleString('fr-FR')} / {attempt.total_questions}
												pts)
											</span>
										{/if}
										<span class="text-muted-foreground">le {formatDate(attempt.completed_at)}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
