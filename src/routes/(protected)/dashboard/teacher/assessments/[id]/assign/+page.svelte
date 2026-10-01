<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Users, Check, X } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction, refreshPageData } from '$lib/utils/form-action';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedClassIds = $state<string[]>([]);
	let isSubmitting = $state(false);

	function handleBack() {
		goto('/dashboard/teacher/assessments').then(() => {});
	}

	function setClassSelected(classId: string, isChecked: boolean) {
		const others = selectedClassIds.filter((id) => id !== classId);
		selectedClassIds = isChecked ? [...others, classId] : others;
	}

	async function handleAssign() {
		if (selectedClassIds.length === 0) {
			toaster.error(`Sélectionnez au moins un ${lore.entities.class}`);
			return;
		}

		isSubmitting = true;

		try {
			const form = new FormData();
			form.append('class_ids', JSON.stringify(selectedClassIds));

			const outcome = await submitAction('?/assign', form);

			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}

			toaster.success(
				`Évaluation assignée à ${selectedClassIds.length} classe${selectedClassIds.length > 1 ? 's' : ''}`
			);
			selectedClassIds = [];
			await refreshPageData();
		} finally {
			isSubmitting = false;
		}
	}

	async function handleUnassign(assignmentId: string) {
		if (!confirm('Supprimer cette assignation ?')) return;

		const form = new FormData();
		form.append('assignment_id', assignmentId);

		const outcome = await submitAction('?/unassign', form);

		if (!outcome.ok) {
			toaster.error(outcome.message);
			return;
		}

		toaster.success('Assignation supprimée');
		await refreshPageData();
	}
</script>

<svelte:head>
	<title>Assigner l'Évaluation | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Assigner l'Évaluation</h1>
			<p class="mt-2 text-muted-foreground">{data.evaluation.series.title}</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Available Classes -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Vos {lore.entities.class}s</Card.Title>
				<Card.Description>Sélectionnez les {lore.entities.class}s à assigner</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.classes.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<Users class="mx-auto mb-3 h-12 w-12 opacity-50" />
						<p>Aucun {lore.entities.class} trouvé</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.classes as classData (classData.id)}
							<!-- Ligne entière : la case et son libellé (nom, effectif) ; plus de case à
							     cocher imbriquée dans un bouton (HTML invalide, double activation) -->
							<div
								class="flex w-full items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
							>
								<MyCheckbox
									checked={selectedClassIds.includes(classData.id)}
									onchange={(isChecked) => setClassSelected(classData.id, isChecked)}
									aria-label="Sélectionner le {lore.entities.class} {classData.name}"
								>
									<span class="block">
										<span class="block font-medium">{classData.name}</span>
										<span class="block text-sm text-muted-foreground">
											{classData.student_count}
											{lore.entities.student}{classData.student_count > 1 ? 's' : ''}
										</span>
									</span>
								</MyCheckbox>
								{#if classData.is_assigned}
									<Badge variant="secondary">
										<Check class="mr-1 h-3 w-3" />
										Déjà assignée
									</Badge>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button
					onclick={handleAssign}
					disabled={selectedClassIds.length === 0 || isSubmitting}
					class="w-full"
				>
					Assigner {selectedClassIds.length > 0 ? `(${selectedClassIds.length})` : ''}
				</Button>
			</Card.Footer>
		</Card.Root>

		<!-- Current Assignments -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Assignations Actuelles</Card.Title>
				<Card.Description>
					{data.existingAssignments.length} assignation{data.existingAssignments.length > 1
						? 's'
						: ''}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.existingAssignments.length === 0}
					<div class="py-12 text-center text-muted-foreground">
						<p>Aucune assignation</p>
						<p class="mt-2 text-sm">Sélectionnez des {lore.entities.class}s pour commencer</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.existingAssignments as assignment (assignment.id)}
							<div class="flex items-center justify-between rounded-lg border bg-accent/20 p-4">
								<div>
									{#if assignment.class_id}
										<div class="font-medium">{assignment.class?.name || lore.entities.class}</div>
										<div class="text-sm text-muted-foreground">{lore.entities.class} entier</div>
									{:else if assignment.student_id}
										<div class="font-medium">
											{assignment.student?.firstname}
											{assignment.student?.lastname}
										</div>
										<div class="text-sm text-muted-foreground">
											{lore.entities.student} individuel
										</div>
									{/if}
								</div>
								<Button variant="ghost" size="icon" onclick={() => handleUnassign(assignment.id)}>
									<X class="h-4 w-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
