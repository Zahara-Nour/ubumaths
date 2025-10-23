<!--
	Teacher - Assign SRS Deck
	=========================

	Teacher page to assign an SRS deck to students or classes.

	Features:
	- View deck details
	- Select students or classes
	- Assign deck (creates copies)
	- View assignment history
-->

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, Users, UserCheck, Send, Loader2 } from 'lucide-svelte';
	import type { AssignDeckRequest } from '$lib/srs/types';

	interface Props {
		data: {
			deck: any;
			students: any[];
			classes: any[];
		};
	}

	let { data }: Props = $props();

	const deckId = $derived(page.params.id);

	// State
	let selectedStudents = $state<string[]>([]);
	let selectedClasses = $state<string[]>([]);
	let isAssigning = $state(false);

	// Derived
	const hasSelection = $derived(selectedStudents.length > 0 || selectedClasses.length > 0);

	/**
	 * Toggle student selection
	 */
	function toggleStudent(studentId: string) {
		const index = selectedStudents.indexOf(studentId);
		if (index >= 0) {
			selectedStudents.splice(index, 1);
		} else {
			selectedStudents.push(studentId);
		}
	}

	/**
	 * Toggle class selection
	 */
	function toggleClass(classId: string) {
		const index = selectedClasses.indexOf(classId);
		if (index >= 0) {
			selectedClasses.splice(index, 1);
		} else {
			selectedClasses.push(classId);
		}
	}

	/**
	 * Select all students
	 */
	function selectAllStudents() {
		if (selectedStudents.length === data.students.length) {
			selectedStudents = [];
		} else {
			selectedStudents = data.students.map((s) => s.id);
		}
	}

	/**
	 * Select all classes
	 */
	function selectAllClasses() {
		if (selectedClasses.length === data.classes.length) {
			selectedClasses = [];
		} else {
			selectedClasses = data.classes.map((c) => c.id);
		}
	}

	/**
	 * Assign deck
	 */
	async function assignDeck() {
		if (!hasSelection || isAssigning) return;

		isAssigning = true;

		try {
			// Assign to students
			if (selectedStudents.length > 0) {
				const request: AssignDeckRequest = {
					targetType: 'student',
					targetIds: selectedStudents
				};

				const response = await fetch(`/api/srs/decks/${deckId}/assign`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request)
				});

				if (!response.ok) {
					throw new Error('Failed to assign to students');
				}
			}

			// Assign to classes
			if (selectedClasses.length > 0) {
				const request: AssignDeckRequest = {
					targetType: 'class',
					targetIds: selectedClasses
				};

				const response = await fetch(`/api/srs/decks/${deckId}/assign`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(request)
				});

				if (!response.ok) {
					throw new Error('Failed to assign to classes');
				}
			}

			toaster.success('Deck attribué avec succès !');
			goto('/dashboard/teacher/srs/decks');
		} catch (error) {
			console.error('Error assigning deck:', error);
			toaster.error("Erreur lors de l'attribution du deck");
		} finally {
			isAssigning = false;
		}
	}

	/**
	 * Navigate back
	 */
	function goBack() {
		goto('/dashboard/teacher/srs/decks');
	}
</script>

<svelte:head>
	<title>Attribuer un deck - UbuMaths</title>
</svelte:head>

<div class="assign-deck-page">
	<!-- Header -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour
		</Button>

		<h1 class="mb-2 text-3xl font-bold">Attribuer un deck</h1>
		<p class="text-muted-foreground">Sélectionnez les élèves ou classes qui recevront ce deck</p>
	</div>

	<!-- Deck Info -->
	<Card.Root class="mb-6">
		<Card.Header>
			<div class="flex items-start justify-between">
				<div>
					<Card.Title>{data.deck?.name || 'Deck'}</Card.Title>
					{#if data.deck?.description}
						<Card.Description class="mt-2">{data.deck.description}</Card.Description>
					{/if}
				</div>
				<Badge variant={data.deck?.deckType === 'official' ? 'default' : 'secondary'}>
					{data.deck?.deckType === 'official' ? 'Officiel' : 'Personnel'}
				</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center gap-6 text-sm text-muted-foreground">
				<span>
					<strong>{data.deck?.stats?.total_cards || 0}</strong> cartes
				</span>
				<span>
					Rétention: <strong>{(data.deck?.config?.desiredRetention || 0.9) * 100}%</strong>
				</span>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Selection Tabs -->
	<Tabs defaultValue="students" class="w-full">
		<TabsList class="mb-6 w-full">
			<TabsTrigger value="students" class="flex-1">
				<Users class="mr-2 h-4 w-4" />
				Élèves ({data.students?.length || 0})
			</TabsTrigger>
			<TabsTrigger value="classes" class="flex-1">
				<UserCheck class="mr-2 h-4 w-4" />
				Classes ({data.classes?.length || 0})
			</TabsTrigger>
		</TabsList>

		<!-- Students Tab -->
		<TabsContent value="students">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Sélectionner des élèves</Card.Title>
						<Button onclick={selectAllStudents} variant="outline" size="sm">
							{selectedStudents.length === data.students.length
								? 'Tout désélectionner'
								: 'Tout sélectionner'}
						</Button>
					</div>
					<Card.Description>
						{selectedStudents.length} élève{selectedStudents.length > 1 ? 's' : ''} sélectionné{selectedStudents.length >
						1
							? 's'
							: ''}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if !data.students || data.students.length === 0}
						<div class="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
							<p class="text-muted-foreground">Aucun élève disponible</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each data.students as student}
								<div
									class="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
								>
									<Checkbox
										checked={selectedStudents.includes(student.id)}
										onCheckedChange={() => toggleStudent(student.id)}
									/>
									<div class="flex-1">
										<p class="font-medium">
											{student.first_name}
											{student.last_name}
										</p>
										{#if student.email}
											<p class="text-sm text-muted-foreground">{student.email}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</TabsContent>

		<!-- Classes Tab -->
		<TabsContent value="classes">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Sélectionner des classes</Card.Title>
						<Button onclick={selectAllClasses} variant="outline" size="sm">
							{selectedClasses.length === data.classes.length
								? 'Tout désélectionner'
								: 'Tout sélectionner'}
						</Button>
					</div>
					<Card.Description>
						{selectedClasses.length} classe{selectedClasses.length > 1 ? 's' : ''} sélectionnée{selectedClasses.length >
						1
							? 's'
							: ''}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if !data.classes || data.classes.length === 0}
						<div class="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
							<p class="text-muted-foreground">Aucune classe disponible</p>
						</div>
					{:else}
						<div class="space-y-2">
							{#each data.classes as classItem}
								<div
									class="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
								>
									<Checkbox
										checked={selectedClasses.includes(classItem.id)}
										onCheckedChange={() => toggleClass(classItem.id)}
									/>
									<div class="flex-1">
										<p class="font-medium">{classItem.name}</p>
										{#if classItem.description}
											<p class="text-sm text-muted-foreground">{classItem.description}</p>
										{/if}
									</div>
									<Badge variant="outline">
										{classItem.student_count || 0} élève{(classItem.student_count || 0) > 1
											? 's'
											: ''}
									</Badge>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</TabsContent>
	</Tabs>

	<!-- Actions -->
	<div class="mt-6 flex items-center justify-between">
		<Button onclick={goBack} variant="outline">Annuler</Button>

		<Button onclick={assignDeck} disabled={!hasSelection || isAssigning} size="lg">
			{#if isAssigning}
				<Loader2 class="mr-2 h-5 w-5 animate-spin" />
				Attribution en cours...
			{:else}
				<Send class="mr-2 h-5 w-5" />
				Attribuer le deck
			{/if}
		</Button>
	</div>
</div>

<style>
	.assign-deck-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
