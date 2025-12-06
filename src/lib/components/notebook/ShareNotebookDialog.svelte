<!--
	ShareNotebookDialog Component
	==============================

	Dialog for teachers to share their Python notebooks with their classes.
	Fetches teacher's classes and shows which ones already have the notebook shared.

	Props:
		- open: boolean (bindable)
		- notebookId: string (UUID of the notebook to share)
		- notebookTitle: string (Title of the notebook for display)
		- onSuccess: () => void (Callback after successful share)

	Features:
		- Load teacher's classes with student counts
		- Show which classes already have the notebook shared
		- Toggle readonly mode (default: true)
		- Share with multiple classes at once using checkboxes
		- Toast notifications for success/error
		- French UI text
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Share2, Users, Lock, Unlock } from 'lucide-svelte';
	import type { ClassWithData } from '$lib/server/students';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { SvelteSet } from 'svelte/reactivity';

	// Component Props
	interface Props {
		open: boolean;
		notebookId: string;
		notebookTitle: string;
		onSuccess?: () => void;
	}

	let { open = $bindable(), notebookId, notebookTitle, onSuccess }: Props = $props();

	// Component State
	interface ClassAssignment {
		classId: string;
		className: string;
		studentCount: number;
		isShared: boolean;
		isSelected: boolean;
	}

	let classes = $state<ClassAssignment[]>([]);
	let isLoadingClasses = $state(false);
	let isSharing = $state(false);
	let readonly = $state(true);

	// Track which classes already have this notebook shared
	let sharedClassIds = new SvelteSet<string>();

	/**
	 * Derive if any class is selected for sharing
	 */
	const hasSelectedClasses = $derived(classes.some((c) => c.isSelected && !c.isShared));

	/**
	 * Load teacher's classes from cache or API
	 */
	async function loadClasses(): Promise<void> {
		isLoadingClasses = true;

		try {
			// Try to get classes from cache first
			const cachedClasses = teacherCache.getAllClassesSync();

			if (cachedClasses.length > 0) {
				// Use cached classes
				await processClasses(cachedClasses);
			} else {
				// Fetch from API if cache is empty
				const response = await fetch('/api/classes');

				if (!response.ok) {
					throw new Error('Erreur lors du chargement des classes');
				}

				const data = await response.json();
				await processClasses(data.classes || []);
			}
		} catch (error) {
			console.error('Error loading classes:', error);
			toaster.error('Erreur lors du chargement des classes');
		} finally {
			isLoadingClasses = false;
		}
	}

	/**
	 * Process classes and check which ones already have the notebook shared
	 */
	async function processClasses(teacherClasses: ClassWithData[]): Promise<void> {
		// Fetch existing assignments for this notebook
		try {
			const response = await fetch(`/api/python-notebooks/${notebookId}/assignments`);

			if (response.ok) {
				const data = await response.json();
				const assignments = data.assignments || [];

				// Track which classes already have this notebook
				sharedClassIds = new SvelteSet(assignments.map((a: { class_id: string }) => a.class_id));
			}
		} catch (error) {
			console.error('Error loading notebook assignments:', error);
			// Continue anyway, just won't show which are already shared
		}

		// Map classes to ClassAssignment format
		classes = teacherClasses.map((c) => ({
			classId: c.id,
			className: c.name,
			studentCount: c.student_count || 0,
			isShared: sharedClassIds.has(c.id),
			isSelected: false
		}));
	}

	/**
	 * Share notebook with selected classes
	 */
	async function handleShare(): Promise<void> {
		const selectedClasses = classes.filter((c) => c.isSelected && !c.isShared);

		if (selectedClasses.length === 0) {
			toaster.warning('Veuillez sélectionner au moins une classe');
			return;
		}

		isSharing = true;

		try {
			// Share with each selected class
			const sharePromises = selectedClasses.map((classItem) =>
				fetch(`/api/python-notebooks/${notebookId}/share`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						class_id: classItem.classId,
						readonly
					})
				})
			);

			const results = await Promise.allSettled(sharePromises);

			// Count successes and failures
			const successes = results.filter((r) => r.status === 'fulfilled');
			const failures = results.filter((r) => r.status === 'rejected');

			if (successes.length > 0) {
				const classNames = selectedClasses
					.slice(0, successes.length)
					.map((c) => c.className)
					.join(', ');

				if (successes.length === 1) {
					toaster.success(`Notebook partagé avec ${classNames}`);
				} else {
					toaster.success(`Notebook partagé avec ${successes.length} classes`);
				}

				// Mark classes as shared
				selectedClasses.forEach((c) => {
					c.isShared = true;
					c.isSelected = false;
					sharedClassIds.add(c.classId);
				});

				// Call success callback
				onSuccess?.();
			}

			if (failures.length > 0) {
				console.error('Some shares failed:', failures);
				toaster.error(`Erreur lors du partage avec ${failures.length} classe(s)`);
			}
		} catch (error) {
			console.error('Error sharing notebook:', error);
			toaster.error('Erreur lors du partage du notebook');
		} finally {
			isSharing = false;
		}
	}

	/**
	 * Toggle class selection
	 */
	function toggleClass(classItem: ClassAssignment): void {
		if (!classItem.isShared) {
			classItem.isSelected = !classItem.isSelected;
		}
	}

	/**
	 * Load classes when dialog opens
	 */
	$effect(() => {
		if (open) {
			loadClasses();
			readonly = true; // Reset to default
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Partager le notebook</Dialog.Title>
			<Dialog.Description>
				Partagez "{notebookTitle}" avec vos classes. Les élèves pourront accéder au notebook selon
				les permissions définies.
			</Dialog.Description>
		</Dialog.Header>

		<!-- Readonly Toggle -->
		<div class="mb-4 rounded-lg border border-border bg-muted/50 p-4">
			<div class="flex items-center gap-3">
				<MyCheckbox bind:checked={readonly} label="Mode lecture seule" disabled={isSharing} />
				<div class="flex-1">
					{#if readonly}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Lock class="h-4 w-4" />
							<span>Les élèves peuvent uniquement consulter le notebook</span>
						</div>
					{:else}
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Unlock class="h-4 w-4" />
							<span>Les élèves peuvent exécuter et modifier le code</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Classes List -->
		<div class="max-h-96 overflow-y-auto rounded-lg border border-border">
			{#if isLoadingClasses}
				<div class="py-8 text-center text-muted-foreground">
					<p>Chargement des classes...</p>
				</div>
			{:else if classes.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<p class="mb-2">Aucune classe trouvée</p>
					<p class="text-sm">Créez une classe pour partager vos notebooks</p>
				</div>
			{:else}
				<div class="divide-y divide-border">
					{#each classes as classItem (classItem.classId)}
						<button
							onclick={() => toggleClass(classItem)}
							disabled={isSharing || classItem.isShared}
							class="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
						>
							<!-- Checkbox -->
							<div class="flex-shrink-0">
								<MyCheckbox
									bind:checked={classItem.isSelected}
									disabled={isSharing || classItem.isShared}
								/>
							</div>

							<!-- Class Info -->
							<div class="flex-1 overflow-hidden">
								<p class="truncate font-semibold">
									{classItem.className}
								</p>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Users class="h-3.5 w-3.5" />
									<span
										>{classItem.studentCount} élève{classItem.studentCount !== 1 ? 's' : ''}</span
									>
								</div>
							</div>

							<!-- Status -->
							<div class="flex-shrink-0">
								{#if classItem.isShared}
									<div
										class="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
									>
										<Share2 class="h-3 w-3" />
										<span>Déjà partagé</span>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="mt-4 flex gap-2">
			<Button variant="outline" onclick={() => (open = false)} disabled={isSharing}>Annuler</Button>
			<Button onclick={handleShare} disabled={!hasSelectedClasses || isSharing || isLoadingClasses}>
				{#if isSharing}
					Partage en cours...
				{:else}
					Partager avec {classes.filter((c) => c.isSelected).length || 0} classe{classes.filter(
						(c) => c.isSelected
					).length !== 1
						? 's'
						: ''}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
