<script lang="ts">
	/**
	 * Mathoux des élèves, par classe : une carte par classe, dépliée à la
	 * demande ; chaque élève mène à sa Chatterie (lecture seule).
	 *
	 * Les compteurs viennent de la mémoire : un Mathou né depuis la dernière
	 * séance de l'élève n'y paraît qu'à la suivante (validé par David le
	 * 2026-10-21), d'où la phrase d'aide.
	 *
	 * Onglet de la Gamification : pas de bouton retour (page de navigation).
	 */

	import { resolve } from '$app/paths';
	import { ChevronDown, ChevronUp } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { lore } from '$lib/config/lore';
	import { memoryCountsPhrase } from '$lib/mathoux/collection-logic';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedClass = $state<string | null>(null);

	function toggleClass(classId: string) {
		expandedClass = expandedClass === classId ? null : classId;
	}

	/** Totaux d'une classe, pour son en-tête. */
	function classTotals(students: { born: number; grandMatous: number }[]) {
		return {
			born: students.reduce((sum, s) => sum + s.born, 0),
			grandMatous: students.reduce((sum, s) => sum + s.grandMatous, 0)
		};
	}
</script>

<div class="space-y-6">
	<h1 class="sr-only">Mathoux des élèves</h1>
	<p class="text-sm text-muted-foreground">
		Les Mathoux retenus à la dernière séance de chaque élève. Ouvrez la Chatterie d’un élève pour
		voir ses Mathoux à jour et ceux qui font la sieste.
	</p>

	{#if data.unavailable}
		<p class="rounded-lg border border-border bg-muted/40 p-4" role="status">
			Les Mathoux sont illisibles pour l’instant : réessayez dans un moment.
		</p>
	{:else if data.classesData.length === 0}
		<Card.Root>
			<Card.Content class="py-8 text-center text-muted-foreground">
				Aucun {lore.entities.class} actif.
			</Card.Content>
		</Card.Root>
	{:else}
		{#each data.classesData as cls (cls.classId)}
			{@const expanded = expandedClass === cls.classId}
			<Card.Root>
				<button
					type="button"
					class="w-full text-left"
					aria-expanded={expanded}
					onclick={() => toggleClass(cls.classId)}
				>
					<Card.Header class="pb-3">
						<div class="flex items-center justify-between gap-3">
							<div>
								<Card.Title class="text-base">{cls.className}</Card.Title>
								<p class="text-sm text-muted-foreground">
									{cls.students.length}
									{cls.students.length === 1 ? 'élève' : 'élèves'} · {memoryCountsPhrase(
										classTotals(cls.students)
									)}
								</p>
							</div>
							{#if expanded}
								<ChevronUp class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
							{:else}
								<ChevronDown class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
							{/if}
						</div>
					</Card.Header>
				</button>

				{#if expanded}
					<Card.Content class="pt-0">
						{#if cls.students.length === 0}
							<p class="py-2 text-sm text-muted-foreground">
								Aucun élève dans ce {lore.entities.class}.
							</p>
						{:else}
							<ul class="divide-y">
								{#each cls.students as student (student.studentId)}
									<li>
										<a
											href={resolve(
												'/(protected)/dashboard/teacher/students/[studentId]/chatterie',
												{
													studentId: student.studentId
												}
											)}
											class="flex items-center justify-between gap-3 py-2.5 hover:underline"
										>
											<span class="min-w-0 truncate text-sm font-medium">{student.fullName}</span>
											<span class="shrink-0 text-sm text-muted-foreground">
												{memoryCountsPhrase(student)}
											</span>
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</Card.Content>
				{/if}
			</Card.Root>
		{/each}
	{/if}
</div>
