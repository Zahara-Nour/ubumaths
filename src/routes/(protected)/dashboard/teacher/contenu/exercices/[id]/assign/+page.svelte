<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { formatUserError } from '$lib/utils/errors';
	import { formatDeadlineFull } from '$lib/utils/dates';
	import { ArrowLeft, Users, User, Globe, X, Calendar } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State for student assignment
	let selectedStudents = $state<string[]>([]);
	let studentDeadline = $state<string>('');
	let studentNotes = $state<string>('');

	// State for class assignment
	let selectedClasses = $state<string[]>([]);
	let classDeadline = $state<string>('');
	let classNotes = $state<string>('');

	// State for public assignment
	let publicNotes = $state<string>('');

	// Loading state
	let loading = $state(false);
	let assignmentsLoading = $state(false);

	// Check if exercise is already public
	let hasPublicAssignment = $derived(
		data.assignments.some((a: { assigned_to_type: string }) => a.assigned_to_type === 'public')
	);

	// Confirm dialog state
	let deleteDialogOpen = $state(false);
	let assignmentToDelete = $state<string | null>(null);

	/**
	 * Navigate back to exercise detail
	 */
	function handleBack() {
		goto(`/dashboard/teacher/contenu/exercices/${data.exercise.id}`);
	}

	/**
	 * Toggle student selection
	 */
	function toggleStudent(studentId: string) {
		if (selectedStudents.includes(studentId)) {
			selectedStudents = selectedStudents.filter((id) => id !== studentId);
		} else {
			selectedStudents = [...selectedStudents, studentId];
		}
	}

	/**
	 * Toggle class selection
	 */
	function toggleClass(classId: string) {
		if (selectedClasses.includes(classId)) {
			selectedClasses = selectedClasses.filter((id) => id !== classId);
		} else {
			selectedClasses = [...selectedClasses, classId];
		}
	}

	/**
	 * Assign to selected students
	 */
	async function assignToStudents() {
		if (selectedStudents.length === 0) {
			toaster.error(`Sélectionnez au moins un ${lore.entities.student}`);
			return;
		}

		loading = true;

		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					students: selectedStudents,
					optional_deadline: studentDeadline || null,
					notes: studentNotes || null
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Échec de l'assignation");
			}

			toaster.success(`${result.count} assignation(s) créée(s)`);

			// Reset form
			selectedStudents = [];
			studentDeadline = '';
			studentNotes = '';

			// Reload data
			await invalidateAll();
		} catch (err) {
			toaster.error(formatUserError(err));
		} finally {
			loading = false;
		}
	}

	/**
	 * Assign to selected classes
	 */
	async function assignToClasses() {
		if (selectedClasses.length === 0) {
			toaster.error('Sélectionnez au moins une classe');
			return;
		}

		loading = true;

		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					classes: selectedClasses,
					optional_deadline: classDeadline || null,
					notes: classNotes || null
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Échec de l'assignation");
			}

			toaster.success(`${result.count} assignation(s) créée(s)`);

			// Reset form
			selectedClasses = [];
			classDeadline = '';
			classNotes = '';

			// Reload data
			await invalidateAll();
		} catch (err) {
			toaster.error(formatUserError(err));
		} finally {
			loading = false;
		}
	}

	/**
	 * Make exercise public
	 */
	async function makePublic() {
		loading = true;

		try {
			const response = await fetch(`/api/exercises/${data.exercise.id}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					make_public: true,
					notes: publicNotes || null
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Échec de publication');
			}

			toaster.success('Exercice rendu public');

			// Reset form
			publicNotes = '';

			// Reload data
			await invalidateAll();
		} catch (err) {
			toaster.error(formatUserError(err));
		} finally {
			loading = false;
		}
	}

	/**
	 * Confirm delete assignment
	 */
	function confirmDeleteAssignment(assignmentId: string) {
		assignmentToDelete = assignmentId;
		deleteDialogOpen = true;
	}

	/**
	 * Perform assignment deletion
	 */
	async function performDelete() {
		if (!assignmentToDelete) return;

		assignmentsLoading = true;

		try {
			const response = await fetch(`/api/exercises/assignments/${assignmentToDelete}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Échec de la suppression');
			}

			toaster.success('Assignation supprimée');
			await invalidateAll();
		} catch (err) {
			toaster.error(formatUserError(err));
		} finally {
			assignmentsLoading = false;
			assignmentToDelete = null;
		}
	}

	/**
	 * Get assignment type icon
	 */
	function getTypeIcon(type: string) {
		switch (type) {
			case 'student':
				return User;
			case 'class':
				return Users;
			case 'public':
				return Globe;
			default:
				return Users;
		}
	}
</script>

<svelte:head>
	<title>Assigner l'exercice - Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-3xl font-bold tracking-tight">Assigner l'exercice</h1>
			<p class="mt-2 text-muted-foreground">{data.exercise.title || '(Sans titre)'}</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Assignment Creation Panel -->
		<div>
			<Tabs.Root value="students">
				<Tabs.List class="grid w-full grid-cols-3">
					<Tabs.Trigger value="students">
						<User class="mr-2 h-4 w-4" />
						{lore.entities.student}s
					</Tabs.Trigger>
					<Tabs.Trigger value="classes">
						<Users class="mr-2 h-4 w-4" />
						{lore.entities.class}s
					</Tabs.Trigger>
					<Tabs.Trigger value="public">
						<Globe class="mr-2 h-4 w-4" />
						Public
					</Tabs.Trigger>
				</Tabs.List>

				<!-- Students Tab -->
				<Tabs.Content value="students">
					<Card.Root>
						<Card.Header>
							<Card.Title>Assigner à des {lore.entities.student}s</Card.Title>
							<Card.Description>
								Sélectionnez les {lore.entities.student}s qui auront accès à cet exercice
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<!-- Student selection -->
								<div>
									<Label class="mb-2 block text-sm font-medium">
										{lore.entities.student}s ({data.students.length} disponibles)
									</Label>
									{#if data.students.length === 0}
										<div
											class="rounded-md border border-dashed p-8 text-center text-muted-foreground"
										>
											<Users class="mx-auto mb-2 h-8 w-8 opacity-50" />
											<p>Aucun {lore.entities.student} trouvé</p>
											<p class="mt-1 text-sm">
												Ajoutez des {lore.entities.student}s à vos {lore.entities.class}s
											</p>
										</div>
									{:else}
										<div class="max-h-60 overflow-y-auto rounded-md border">
											{#each data.students as student (student.id)}
												<button
													type="button"
													class="flex w-full cursor-pointer items-center gap-3 border-b p-3 text-left transition-colors last:border-b-0 hover:bg-accent"
													onclick={() => toggleStudent(student.id)}
													aria-label="Sélectionner le {lore.entities.student} {student.full_name}"
												>
													<Checkbox checked={selectedStudents.includes(student.id)} />
													<div class="flex-1">
														<div class="font-medium">{student.full_name}</div>
														<div class="text-xs text-muted-foreground">{student.email}</div>
													</div>
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Deadline -->
								<div>
									<Label for="student-deadline" class="mb-2 block text-sm font-medium">
										Échéance (optionnelle)
									</Label>
									<Input id="student-deadline" type="datetime-local" bind:value={studentDeadline} />
								</div>

								<!-- Notes -->
								<div>
									<Label for="student-notes" class="mb-2 block text-sm font-medium">
										Notes pour les {lore.entities.student}s
									</Label>
									<Textarea
										id="student-notes"
										bind:value={studentNotes}
										rows={3}
										placeholder="Instructions ou remarques..."
									/>
								</div>
							</div>
						</Card.Content>
						<Card.Footer>
							<Button
								onclick={assignToStudents}
								disabled={loading || selectedStudents.length === 0}
								class="w-full"
							>
								{loading
									? 'Assignation...'
									: `Assigner à ${selectedStudents.length} ${lore.entities.student}(s)`}
							</Button>
						</Card.Footer>
					</Card.Root>
				</Tabs.Content>

				<!-- Classes Tab -->
				<Tabs.Content value="classes">
					<Card.Root>
						<Card.Header>
							<Card.Title>Assigner à des {lore.entities.class}s</Card.Title>
							<Card.Description>
								Sélectionnez les {lore.entities.class}s qui auront accès à cet exercice
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								<!-- Class selection -->
								<div>
									<Label class="mb-2 block text-sm font-medium">
										{lore.entities.class}s ({data.classes.length} disponibles)
									</Label>
									{#if data.classes.length === 0}
										<div
											class="rounded-md border border-dashed p-8 text-center text-muted-foreground"
										>
											<Users class="mx-auto mb-2 h-8 w-8 opacity-50" />
											<p>Aucun {lore.entities.class} trouvé</p>
											<p class="mt-1 text-sm">Créez un {lore.entities.class} pour commencer</p>
										</div>
									{:else}
										<div class="space-y-2">
											{#each data.classes as classItem (classItem.id)}
												<button
													type="button"
													class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
													onclick={() => toggleClass(classItem.id)}
													aria-label="Sélectionner le {lore.entities.class} {classItem.name}"
												>
													<Checkbox checked={selectedClasses.includes(classItem.id)} />
													<div class="flex-1">
														<div class="font-medium">{classItem.name}</div>
														<div class="text-xs text-muted-foreground">
															{classItem.student_count}
															{lore.entities.student}{classItem.student_count > 1 ? 's' : ''}
														</div>
													</div>
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Deadline -->
								<div>
									<Label for="class-deadline" class="mb-2 block text-sm font-medium">
										Échéance (optionnelle)
									</Label>
									<Input id="class-deadline" type="datetime-local" bind:value={classDeadline} />
								</div>

								<!-- Notes -->
								<div>
									<Label for="class-notes" class="mb-2 block text-sm font-medium">
										Notes pour les {lore.entities.student}s
									</Label>
									<Textarea
										id="class-notes"
										bind:value={classNotes}
										rows={3}
										placeholder="Instructions ou remarques..."
									/>
								</div>
							</div>
						</Card.Content>
						<Card.Footer>
							<Button
								onclick={assignToClasses}
								disabled={loading || selectedClasses.length === 0}
								class="w-full"
							>
								{loading ? 'Assignation...' : `Assigner à ${selectedClasses.length} classe(s)`}
							</Button>
						</Card.Footer>
					</Card.Root>
				</Tabs.Content>

				<!-- Public Tab -->
				<Tabs.Content value="public">
					<Card.Root>
						<Card.Header>
							<Card.Title>Rendre public</Card.Title>
							<Card.Description>
								Tous les {lore.entities.student}s de la plateforme pourront accéder à cet exercice
							</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if hasPublicAssignment}
								<div
									class="rounded-md bg-green-50 p-4 text-green-800 dark:bg-green-950 dark:text-green-100"
								>
									<div class="flex items-center gap-2">
										<Globe class="h-5 w-5" />
										<p class="font-medium">Cet exercice est déjà public</p>
									</div>
								</div>
							{:else}
								<div class="space-y-4">
									<div>
										<Label for="public-notes" class="mb-2 block text-sm font-medium">
											Notes pour les {lore.entities.student}s
										</Label>
										<Textarea
											id="public-notes"
											bind:value={publicNotes}
											rows={3}
											placeholder="Informations pour tous les {lore.entities.student}s..."
										/>
									</div>
								</div>
							{/if}
						</Card.Content>
						{#if !hasPublicAssignment}
							<Card.Footer>
								<Button onclick={makePublic} disabled={loading} class="w-full">
									{loading ? 'Création...' : 'Rendre public'}
								</Button>
							</Card.Footer>
						{/if}
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<!-- Current Assignments Panel -->
		<div>
			<Card.Root>
				<Card.Header>
					<Card.Title>Assignations actuelles</Card.Title>
					<Card.Description>
						{data.assignments.length} assignation{data.assignments.length > 1 ? 's' : ''}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.assignments.length === 0}
						<div class="py-12 text-center text-muted-foreground">
							<Users class="mx-auto mb-3 h-12 w-12 opacity-50" />
							<p class="font-medium">Aucune assignation</p>
							<p class="mt-2 text-sm">
								Sélectionnez des {lore.entities.student}s ou {lore.entities.class}s pour commencer
							</p>
						</div>
					{:else}
						<div class="space-y-3">
							{#each data.assignments as assignment (assignment.id)}
								{@const TypeIcon = getTypeIcon(assignment.assigned_to_type)}
								<div class="rounded-lg border bg-accent/20 p-4">
									<div class="flex items-start justify-between gap-4">
										<div class="flex-1">
											<div class="flex items-center gap-2">
												<TypeIcon class="h-4 w-4 text-muted-foreground" />
												<div class="font-medium">{assignment.assigned_to_name}</div>
											</div>
											<div class="mt-1 flex items-center gap-2">
												<Badge variant="outline" class="text-xs">
													{assignment.assigned_to_type === 'student'
														? lore.entities.student
														: assignment.assigned_to_type === 'class'
															? lore.entities.class
															: 'Public'}
												</Badge>
												{#if assignment.optional_deadline}
													<div
														class="flex items-center gap-1 text-xs text-muted-foreground"
														title={formatDeadlineFull(assignment.optional_deadline)}
													>
														<Calendar class="h-3 w-3" />
														{formatDeadlineFull(assignment.optional_deadline)}
													</div>
												{/if}
											</div>
											{#if assignment.notes}
												<div class="mt-2 text-sm text-muted-foreground italic">
													"{assignment.notes}"
												</div>
											{/if}
										</div>

										<Button
											variant="ghost"
											size="icon"
											onclick={() => confirmDeleteAssignment(assignment.id)}
											disabled={assignmentsLoading}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<!-- Confirm Delete Dialog -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Supprimer l'assignation"
	description="Êtes-vous sûr de vouloir supprimer cette assignation ? Cette action ne peut pas être annulée."
	confirmLabel={lore.actions.delete}
	variant="destructive"
	onConfirm={performDelete}
/>
