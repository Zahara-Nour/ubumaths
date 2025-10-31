<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import { Copy, Check } from 'lucide-svelte';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data }: { data: PageData } = $props();

	// State
	let selectedSchool = $state('');
	let showModal = $state(false);
	let editingClass = $state<(typeof data.classes)[number] | null>(null);
	let copiedCode = $state<string | null>(null);
	let autoGenerateCode = $state(true);

	let formData = $state({
		name: '',
		description: '',
		teacher_id: '',
		school_id: '',
		join_code: '',
		is_active: true
	});

	// Derived state - filter classes by selected school
	let filteredClasses = $derived(
		selectedSchool ? data.classes.filter((c) => c.school_id === selectedSchool) : data.classes
	);

	// Get teacher display name
	function getTeacherName(
		teacher: { firstname?: string; lastname?: string; email?: string } | null
	): string {
		if (!teacher) return '—';
		if (teacher.firstname && teacher.lastname) {
			return `${teacher.firstname} ${teacher.lastname}`;
		}
		return teacher.email || '—';
	}

	// Filter teachers by selected school (for create/edit modal)
	// Only show teachers from the selected school
	let availableTeachers = $derived(
		formData.school_id
			? data.teachers.filter((t) => t.school_id === formData.school_id)
			: data.teachers
	);

	// Open create modal
	function openCreateModal() {
		editingClass = null;
		autoGenerateCode = true;
		formData = {
			name: '',
			description: '',
			teacher_id: '',
			school_id: selectedSchool || '',
			join_code: '',
			is_active: true
		};
		showModal = true;
	}

	// Open edit modal
	function openEditModal(classItem: (typeof data.classes)[number]) {
		editingClass = classItem;
		autoGenerateCode = false;
		formData = {
			name: classItem.name,
			description: classItem.description || '',
			teacher_id: classItem.teacher_id,
			school_id: classItem.school_id || '',
			join_code: classItem.join_code,
			is_active: classItem.is_active
		};
		showModal = true;
	}

	// Close modal
	function closeModal() {
		showModal = false;
		editingClass = null;
		autoGenerateCode = true;
	}

	// Copy join code to clipboard
	async function copyJoinCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			copiedCode = code;
			toaster.success('Code copié dans le presse-papier');
			setTimeout(() => {
				copiedCode = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
			toaster.error('Erreur lors de la copie du code');
		}
	}

	// Toggle auto-generate code
	function toggleAutoGenerate() {
		autoGenerateCode = !autoGenerateCode;
		if (autoGenerateCode) {
			formData.join_code = '';
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Gestion des Classes</h1>
			<p class="mt-2 text-muted-foreground">Gérer les classes du système</p>
		</div>
		<Button onclick={openCreateModal}>+ Ajouter une Classe</Button>
	</div>

	<!-- School Filter -->
	<div class="rounded-lg border border-border bg-card p-4 shadow">
		<label for="school-filter" class="mb-2 block text-sm font-medium text-foreground">
			Filtrer par école
		</label>
		<select
			id="school-filter"
			bind:value={selectedSchool}
			class="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
		>
			<option value="">Toutes les écoles</option>
			{#each data.schools as school (school.id)}
				<option value={school.id}>{school.name}</option>
			{/each}
		</select>
	</div>

	<!-- Classes Table -->
	<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-border bg-muted">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Nom de la Classe
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Code d'Accès
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Enseignant
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Étudiants
						</th>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Statut
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each filteredClasses as classItem (classItem.id)}
						<tr class="transition-colors hover:bg-muted/50">
							<td class="px-6 py-4">
								<div class="text-sm font-medium text-foreground">{classItem.name}</div>
								{#if classItem.description}
									<div class="mt-1 text-xs text-muted-foreground">{classItem.description}</div>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center gap-2">
									<code
										class="rounded border border-border bg-muted px-2 py-1 font-mono text-sm text-foreground"
									>
										{classItem.join_code}
									</code>
									<button
										type="button"
										onclick={() => copyJoinCode(classItem.join_code)}
										class="text-muted-foreground transition-colors hover:text-foreground"
										title="Copier le code"
									>
										{#if copiedCode === classItem.join_code}
											<Check class="h-4 w-4 text-green-600" />
										{:else}
											<Copy class="h-4 w-4" />
										{/if}
									</button>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-muted-foreground">
									{getTeacherName(classItem.teacher)}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-muted-foreground">{classItem.student_count}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{#if classItem.is_active}
									<Badge class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
										Active
									</Badge>
								{:else}
									<Badge class="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
										Inactive
									</Badge>
								{/if}
							</td>
							<td class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
								<Button variant="ghost" size="sm" onclick={() => openEditModal(classItem)}>
									Modifier
								</Button>
								{#if classItem.is_active}
									<form
										method="POST"
										action="?/deactivate"
										use:enhance={() => {
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') {
													toaster.success('Classe désactivée avec succès');
												} else if (result.type === 'failure') {
													const message =
														(result.data as unknown as { message?: string })?.message ||
														'Erreur lors de la désactivation';
													toaster.error(message);
												}
											};
										}}
										class="inline"
									>
										<input type="hidden" name="id" value={classItem.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="text-destructive hover:text-destructive"
											onclick={(e) => {
												if (
													!confirm(
														'Êtes-vous sûr de vouloir désactiver cette classe ? Les étudiants ne pourront plus y accéder.'
													)
												) {
													e.preventDefault();
												}
											}}
										>
											Désactiver
										</Button>
									</form>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-muted-foreground">
								{#if selectedSchool}
									Aucune classe trouvée pour cette école. Cliquez sur "Ajouter une Classe" pour en
									créer une.
								{:else}
									Aucune classe trouvée. Cliquez sur "Ajouter une Classe" pour en créer une.
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-[100] overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 sm:p-0">
			<!-- Background overlay -->
			<div
				class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
				aria-hidden="true"
				onclick={closeModal}
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-visible rounded-lg border border-border bg-card text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl"
			>
				<!-- Modal Header -->
				<div class="border-b border-border bg-card px-6 pt-6 pb-4">
					<h3 class="text-lg font-medium text-foreground" id="modal-title">
						{editingClass ? 'Modifier la Classe' : 'Ajouter une Classe'}
					</h3>
				</div>

				<!-- Form -->
				<form
					method="POST"
					action="?/{editingClass ? 'update' : 'create'}"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								closeModal();
								if (editingClass) {
									toaster.success('Classe mise à jour avec succès');
								} else {
									toaster.success('Classe créée avec succès');
								}
							} else if (result.type === 'failure') {
								const message =
									(result.data as unknown as { message?: string })?.message ||
									'Une erreur est survenue';
								toaster.error(message);
							}
						};
					}}
				>
					{#if editingClass}
						<input type="hidden" name="id" value={editingClass.id} />
					{/if}

					<div class="bg-card px-6 py-4">
						<div class="space-y-4">
							<!-- Class Name -->
							<div>
								<label for="name" class="mb-1 block text-sm font-medium text-foreground">
									Nom de la Classe *
								</label>
								<Input
									type="text"
									name="name"
									id="name"
									required
									bind:value={formData.name}
									placeholder="Ex: Mathématiques 6ème A"
								/>
							</div>

							<!-- Description -->
							<div>
								<label for="description" class="mb-1 block text-sm font-medium text-foreground">
									Description
								</label>
								<Textarea
									name="description"
									id="description"
									rows={2}
									bind:value={formData.description}
									placeholder="Description de la classe (optionnel)"
								/>
							</div>

							<!-- School -->
							<div>
								<label for="school_id" class="mb-1 block text-sm font-medium text-foreground">
									École
								</label>
								<select
									id="school_id"
									name="school_id"
									bind:value={formData.school_id}
									class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
								>
									<option value="">Aucune école</option>
									{#each data.schools as school (school.id)}
										<option value={school.id}>{school.name}</option>
									{/each}
								</select>
							</div>

							<!-- Teacher -->
							<div>
								<label for="teacher_id" class="mb-1 block text-sm font-medium text-foreground">
									Enseignant *
								</label>
								<select
									id="teacher_id"
									name="teacher_id"
									bind:value={formData.teacher_id}
									required
									class="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
								>
									<option value="">Sélectionner un enseignant</option>
									{#each availableTeachers as teacher (teacher.id)}
										<option value={teacher.id}>
											{#if teacher.firstname && teacher.lastname}
												{teacher.firstname}
												{teacher.lastname}
											{:else}
												{teacher.email}
											{/if}
										</option>
									{/each}
								</select>
								{#if formData.school_id && availableTeachers.length === 0}
									<p class="mt-1 text-xs text-muted-foreground">
										Aucun enseignant disponible pour cette école. Veuillez d'abord assigner des
										enseignants à cette école.
									</p>
								{:else if !formData.school_id}
									<p class="mt-1 text-xs text-muted-foreground">
										Sélectionnez d'abord une école pour voir les enseignants disponibles.
									</p>
								{/if}
							</div>

							<!-- Join Code -->
							<div>
								<div class="mb-1 flex items-center justify-between">
									<label for="join_code" class="block text-sm font-medium text-foreground">
										Code d'Accès
									</label>
									{#if !editingClass}
										<button
											type="button"
											onclick={toggleAutoGenerate}
											class="text-xs text-primary hover:underline"
										>
											{autoGenerateCode ? 'Personnaliser le code' : 'Générer automatiquement'}
										</button>
									{/if}
								</div>

								{#if autoGenerateCode && !editingClass}
									<div
										class="rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
									>
										Le code sera généré automatiquement
									</div>
								{:else}
									<input
										type="text"
										name="join_code"
										id="join_code"
										bind:value={formData.join_code}
										placeholder="Ex: MATH6A"
										maxlength="10"
										class="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
										required={!autoGenerateCode}
									/>
									<p class="mt-1 text-xs text-muted-foreground">
										Le code doit être unique (6-10 caractères recommandés)
									</p>
								{/if}
							</div>

							<!-- Active Status (only for editing) -->
							{#if editingClass}
								<div class="flex items-center gap-2">
									<input
										type="checkbox"
										name="is_active"
										id="is_active"
										value="true"
										bind:checked={formData.is_active}
										class="h-4 w-4 rounded border-input"
									/>
									<label for="is_active" class="text-sm text-foreground">
										La classe est active
									</label>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex justify-end gap-2 bg-muted px-6 py-3">
						<Button type="button" variant="outline" onclick={closeModal}>Annuler</Button>
						<Button type="submit">
							{editingClass ? 'Mettre à jour' : 'Créer'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
