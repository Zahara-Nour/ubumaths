<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Users, Check, X } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedClassIds = $state<string[]>([]);
	let isSubmitting = $state(false);

	function handleBack() {
		goto('/dashboard/teacher/assessments');
	}

	function toggleClass(classId: string) {
		if (selectedClassIds.includes(classId)) {
			selectedClassIds = selectedClassIds.filter((id) => id !== classId);
		} else {
			selectedClassIds = [...selectedClassIds, classId];
		}
	}

	async function handleAssign() {
		if (selectedClassIds.length === 0) {
			toaster.error('Sélectionnez au moins une classe');
			return;
		}

		isSubmitting = true;

		try {
			const form = new FormData();
			form.append('class_ids', JSON.stringify(selectedClassIds));

			const response = await fetch('?/assign', {
				method: 'POST',
				body: form
			});

			const result = await response.json();

			if (result.type === 'success' || result.data?.success) {
				toaster.success(
					`Évaluation assignée à ${selectedClassIds.length} classe${selectedClassIds.length > 1 ? 's' : ''}`
				);
				selectedClassIds = [];
				await invalidateAll();
			} else {
				toaster.error(result.data?.error || 'Échec de l\'assignation');
			}
		} catch (error) {
			console.error('Assignment failed:', error);
			toaster.error('Échec de l\'assignation');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleUnassign(assignmentId: string) {
		if (!confirm('Supprimer cette assignation ?')) return;

		try {
			const form = new FormData();
			form.append('assignment_id', assignmentId);

			const response = await fetch('?/unassign', {
				method: 'POST',
				body: form
			});

			const result = await response.json();

			if (result.type === 'success' || result.data?.success) {
				toaster.success('Assignation supprimée');
				await invalidateAll();
			} else {
				toaster.error(result.data?.error || 'Échec de la suppression');
			}
		} catch (error) {
			console.error('Unassignment failed:', error);
			toaster.error('Échec de la suppression');
		}
	}
</script>

<svelte:head>
	<title>Assigner l'Évaluation | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-8">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Assigner l'Évaluation</h1>
			<p class="text-muted-foreground mt-2">{data.assessment.title}</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Available Classes -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Vos Classes</Card.Title>
				<Card.Description>Sélectionnez les classes à assigner</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.classes.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<Users class="mx-auto h-12 w-12 mb-3 opacity-50" />
						<p>Aucune classe trouvée</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.classes as classData (classData.id)}
							<div
								class="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
								onclick={() => toggleClass(classData.id)}
							>
								<div class="flex items-center gap-4">
									<Checkbox checked={selectedClassIds.includes(classData.id)} />
									<div>
										<div class="font-medium">{classData.name}</div>
										<div class="text-sm text-muted-foreground">
											{classData.student_count} élève{classData.student_count > 1 ? 's' : ''}
										</div>
									</div>
								</div>
								{#if classData.is_assigned}
									<Badge variant="secondary">
										<Check class="h-3 w-3 mr-1" />
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
					{data.existingAssignments.length} assignation{data.existingAssignments.length > 1 ? 's' : ''}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if data.existingAssignments.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<p>Aucune assignation</p>
						<p class="text-sm mt-2">Sélectionnez des classes pour commencer</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each data.existingAssignments as assignment (assignment.id)}
							<div
								class="flex items-center justify-between p-4 rounded-lg border bg-accent/20"
							>
								<div>
									{#if assignment.class_id}
										<div class="font-medium">{assignment.class?.name || 'Classe'}</div>
										<div class="text-sm text-muted-foreground">
											Classe entière
										</div>
									{:else if assignment.student_id}
										<div class="font-medium">
											{assignment.student?.firstname}
											{assignment.student?.lastname}
										</div>
										<div class="text-sm text-muted-foreground">
											Élève individuel
										</div>
									{/if}
								</div>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => handleUnassign(assignment.id)}
								>
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
