<!--
	Rewards Management Page for Teachers
	=====================================

	This page allows teachers to manage gidouilles (reward points) for their students.

	FEATURES:
	---------
	- Select a class via Tabs component
	- View all students in the selected class with their current gidouilles
	- Add/remove gidouilles for individual students via input + buttons
	- Add/remove gidouilles for all students in a class at once
	- Real-time reactive updates
	- Toast notifications for success/error feedback

	SECURITY:
	---------
	- Uses secure RPC functions (update_student_gidouilles, update_class_gidouilles)
	- Teachers can only modify gidouilles for students in their classes
	- All operations enforce minimum of 0 gidouilles
-->

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Plus, Minus } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';

	// Data from server load function
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// État local pour les inputs de gidouilles (par élève)
	let studentDeltas = $state<Record<string, number>>({});

	// État local pour l'input de gidouilles au niveau classe
	let classDeltas = $state<Record<string, number>>({});

	// Initialiser les deltas à 1 pour chaque élève et classe
	$effect(() => {
		data.classes.forEach((classItem) => {
			if (!classDeltas[classItem.id]) {
				classDeltas[classItem.id] = 1;
			}
			classItem.students.forEach((student) => {
				if (!studentDeltas[student.id]) {
					studentDeltas[student.id] = 1;
				}
			});
		});
	});

	// Gérer les toasts en fonction du résultat de l'action
	$effect(() => {
		if (form?.success) {
			toaster.success(form.message || 'Gidouilles mises à jour avec succès');
		} else if (form?.message && !form?.success) {
			toaster.error(form.message);
		}
	});

	// Fonction pour obtenir le nom complet ou l'identifiant de l'élève
	function getFullName(
		firstname: string | null,
		lastname: string | null,
		fullname: string | null
	): string {
		// Si prénom ou nom existe, on les utilise
		const name = [firstname, lastname].filter(Boolean).join(' ');
		if (name) return name;

		// Sinon, on utilise full_name
		if (fullname) return fullname;

		// En dernier recours
		return 'Élève sans nom';
	}
</script>

<div class="space-y-6">
	<!-- HEADER -->
	<div class="flex items-center gap-3">
		<img src={gidouilleImg} alt="Gidouille" class="w-12 h-12" />
		<div>
			<h1 class="text-3xl font-bold text-foreground">Gestion des Récompenses</h1>
			<p class="text-muted-foreground mt-1">
				Gérez les gidouilles de vos élèves par classe
			</p>
		</div>
	</div>

	<!-- MAIN CONTENT -->
	{#if data.classes.length === 0}
		<!-- Pas de classes -->
		<div class="bg-card border border-border rounded-lg p-12 text-center">
			<img src={gidouilleImg} alt="Gidouille" class="w-16 h-16 mx-auto mb-4 opacity-50" />
			<h2 class="text-xl font-semibold text-foreground mb-2">Aucune classe trouvée</h2>
			<p class="text-muted-foreground">
				Vous devez d'abord créer des classes pour gérer les récompenses de vos élèves.
			</p>
		</div>
	{:else}
		<!-- TABS PAR CLASSE -->
		<Tabs.Root value={data.classes[0]?.id} class="w-full">
			<Tabs.List class="grid w-full grid-cols-{Math.min(data.classes.length, 4)}">
				{#each data.classes as classItem}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
						<span class="ml-2 text-xs text-muted-foreground">
							({classItem.students.length})
						</span>
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.classes as classItem}
				<Tabs.Content value={classItem.id} class="space-y-6">
					<!-- CONTRÔLES AU NIVEAU CLASSE -->
					<div class="bg-card border border-border rounded-lg p-6">
						<h3 class="text-lg font-semibold text-foreground mb-4">
							Actions pour toute la classe
						</h3>
						<div class="flex items-end gap-3">
							<div class="flex items-center gap-2">
								<!-- Formulaire pour enlever -->
								<form
									method="POST"
									action="?/updateClass"
									use:enhance={() => {
										return async ({ result, update }) => {
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="classId" value={classItem.id} />
									<input type="hidden" name="delta" value={-classDeltas[classItem.id]} />
									<Button type="submit" variant="default" class="w-10 h-10 p-0">
										−
									</Button>
								</form>

								<!-- Input pour le nombre de gidouilles -->
								<div class="w-16">
									<label for="class-delta-{classItem.id}" class="text-sm text-muted-foreground mb-2 block text-center">
										Nombre
									</label>
									<Input
										id="class-delta-{classItem.id}"
										type="number"
										min="1"
										max="9"
										bind:value={classDeltas[classItem.id]}
										class="w-full text-center"
									/>
								</div>

								<!-- Formulaire pour ajouter -->
								<form
									method="POST"
									action="?/updateClass"
									use:enhance={() => {
										return async ({ result, update }) => {
											await update();
											await invalidateAll();
										};
									}}
								>
									<input type="hidden" name="classId" value={classItem.id} />
									<input type="hidden" name="delta" value={classDeltas[classItem.id]} />
									<Button type="submit" variant="default" class="w-10 h-10 p-0">
										+
									</Button>
								</form>
							</div>

							<span class="text-sm text-muted-foreground">
								Appliquer à tous les élèves de la classe
							</span>
						</div>
					</div>

					<!-- LISTE DES ÉLÈVES -->
					{#if classItem.students.length === 0}
						<div class="bg-card border border-border rounded-lg p-12 text-center">
							<p class="text-muted-foreground">Aucun élève dans cette classe</p>
						</div>
					{:else}
						<div class="bg-card border border-border rounded-lg overflow-hidden">
							<div class="px-6 py-4 border-b border-border bg-muted/30">
								<h3 class="text-lg font-semibold text-foreground">
									Élèves ({classItem.students.length})
								</h3>
							</div>

							<div class="divide-y divide-border">
								{#each classItem.students as student}
									<div class="px-6 py-4 flex items-center gap-6">
										<!-- AVATAR -->
										<Avatar.Root class="w-12 h-12 flex-shrink-0">
											<Avatar.Image
												src={student.avatar_url || getAvatarFallback(student.role, student.gender)}
												alt={getFullName(student.firstname, student.lastname, student.full_name)}
											/>
											<Avatar.Fallback class="bg-primary/10 text-primary font-semibold">
												{getAvatarInitials(student.firstname, student.lastname)}
											</Avatar.Fallback>
										</Avatar.Root>

										<!-- NOM DE L'ÉLÈVE -->
										<div class="flex-1 min-w-0">
											<p class="font-medium text-foreground truncate">
												{getFullName(student.firstname, student.lastname, student.full_name)}
											</p>
										</div>

										<!-- GIDOUILLES ACTUELLES -->
										<div class="flex items-center gap-2 w-32 justify-end">
											<img src={gidouilleImg} alt="Gidouille" class="w-6 h-6 flex-shrink-0" />
											<span class="text-2xl font-bold text-foreground tabular-nums">
												{student.gidouilles}
											</span>
										</div>

										<!-- BOUTONS +/- AVEC INPUT AU MILIEU -->
										<div class="flex items-center gap-2 flex-shrink-0">
											<!-- Formulaire pour enlever -->
											<form
												method="POST"
												action="?/updateStudent"
												use:enhance={() => {
													return async ({ result, update }) => {
														await update();
														await invalidateAll();
													};
												}}
											>
												<input type="hidden" name="studentId" value={student.id} />
												<input type="hidden" name="delta" value={-studentDeltas[student.id]} />
												<Button
													type="submit"
													size="sm"
													variant="default"
													class="w-10 h-10 p-0"
													disabled={student.gidouilles < studentDeltas[student.id]}
												>
													−
												</Button>
											</form>

											<!-- INPUT POUR LE DELTA -->
											<div class="w-14">
												<Input
													type="number"
													min="1"
													max="9"
													bind:value={studentDeltas[student.id]}
													class="w-full text-center h-10"
												/>
											</div>

											<!-- Formulaire pour ajouter -->
											<form
												method="POST"
												action="?/updateStudent"
												use:enhance={() => {
													return async ({ result, update }) => {
														await update();
														await invalidateAll();
													};
												}}
											>
												<input type="hidden" name="studentId" value={student.id} />
												<input type="hidden" name="delta" value={studentDeltas[student.id]} />
												<Button type="submit" size="sm" variant="default" class="w-10 h-10 p-0">
													+
												</Button>
											</form>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}
</div>
