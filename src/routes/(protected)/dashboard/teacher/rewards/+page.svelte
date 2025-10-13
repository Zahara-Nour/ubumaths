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
	- Award random VIP cards to students (costs 3 gidouilles)
	- View student VIP card collections
	- Animated card reveal with loading state
	- Real-time reactive updates
	- Toast notifications for success/error feedback

	VIP CARD FLOW:
	--------------
	1. Teacher clicks "Carte VIP" button for a student
	2. Loading animation shows (mystery card shaking)
	3. Server assigns random card and returns cardId
	4. Loading transitions to reveal animation
	5. Card flips to show front with confetti celebration
	6. Data refreshes to show updated collection

	SECURITY:
	---------
	- Uses secure RPC functions (update_student_gidouilles, update_class_gidouilles)
	- Teachers can only modify gidouilles for students in their classes
	- All operations enforce minimum of 0 gidouilles
	- VIP card awards validate sufficient gidouilles on server side
-->

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll } from '$app/navigation';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';
	import VipCardReveal from '$lib/components/VipCardReveal.svelte';
	import VipCardLoading from '$lib/components/VipCardLoading.svelte';
	import { getVipCardById } from '$lib/types/vip-card';
	import { canAffordVipCard } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2 } from 'lucide-svelte';

	// Data from server load function
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state for selected class
	let selectedClassId = $state(data.classes[0]?.id);

	// Local state for gidouilles inputs (per student)
	let studentDeltas = $state<Record<string, number>>({});

	// Local state for gidouilles input at class level
	let classDeltas = $state<Record<string, number>>({});

	// VIP card states
	let vipModalOpen = $state(false);
	let selectedStudentForVipModal = $state<{ id: string; name: string; vipCards: any } | null>(null);
	let revealingCard = $state<{ cardId: string; studentName: string } | null>(null);
	let awardingCard = $state(false); // Shows loading animation (shaking mystery card)
	let lastProcessedCardId = $state<string | null>(null); // Tracks last processed cardId to prevent duplicates and infinite loops

	// Initialize deltas to 1 for each student and class
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

	// Handle toasts and animations based on action result
	// IMPORTANT: lastProcessedCardId prevents duplicates and infinite loops.
	// Without this check, the effect would trigger every time revealingCard changes,
	// creating an infinite loop of revelations.
	$effect(() => {
		if (form?.success) {
			// If it's a VIP card award, show reveal animation
			if (form.cardId && form.cardId !== lastProcessedCardId) {
				// Only process if it's a new card (not already processed)
				const card = getVipCardById(form.cardId);
				if (card) {
					// Mark this card as processed to prevent re-triggers
					lastProcessedCardId = form.cardId;

					// Hide loading and show reveal
					awardingCard = false;
					const studentName = selectedStudentForVipModal?.name || 'Élève';
					revealingCard = { cardId: form.cardId, studentName };
				}
			} else if (!form.cardId) {
				// Other successful actions (add/remove gidouilles)
				toaster.success(form.message || 'Opération réussie');
			}
		} else if (form?.message && !form?.success) {
			// On error, hide loading
			awardingCard = false;
			toaster.error(form.message);
		}
	});

	// Get full name or identifier for student
	function getFullName(
		firstname: string | null,
		lastname: string | null,
		fullname: string | null
	): string {
		// Use firstname and lastname if they exist
		const name = [firstname, lastname].filter(Boolean).join(' ');
		if (name) return name;

		// Otherwise use full_name
		if (fullname) return fullname;

		// Last resort
		return 'Élève sans nom';
	}

	// Open VIP cards modal for a student
	function openVipModal(student: any) {
		selectedStudentForVipModal = {
			id: student.id,
			name: getFullName(student.firstname, student.lastname, student.full_name),
			vipCards: student.vip_cards || {}
		};
		vipModalOpen = true;
	}

	// Close card reveal modal
	function handleRevealComplete() {
		revealingCard = null;
		awardingCard = false; // Ensure loading animation is hidden
		invalidateAll(); // Refresh data to update card collection
	}
</script>

<div class="space-y-6">
	<!-- HEADER -->
	<div>
		<h1 class="text-3xl font-bold text-foreground">Gestion des Récompenses</h1>
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
		<Tabs.Root bind:value={selectedClassId} class="w-full">
			<Tabs.List class="mb-6">
				{#each data.classes as classItem}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.classes as classItem}
				<Tabs.Content value={classItem.id} class="space-y-6 mt-0">
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
										return async ({ update }) => {
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
										return async ({ update }) => {
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
												src={student.avatar_url || getAvatarFallback(student.role || 'student', student.gender)}
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

										<!-- SÉPARATEUR VERTICAL -->
										<div class="h-10 w-px bg-border mx-2"></div>

										<!-- BOUTONS CARTES VIP -->
										<div class="flex items-center gap-2 flex-shrink-0">
											<!-- Bouton Voir Cartes VIP -->
											<Button
												size="sm"
												variant="outline"
												class="gap-1"
												onclick={() => openVipModal(student)}
											>
												<Eye class="w-4 h-4" />
												<span class="hidden sm:inline">Voir Cartes</span>
											</Button>

											<!-- Form to award VIP card -->
											<form
												method="POST"
												action="?/awardVipCard"
												use:enhance={() => {
													// Save student name for reveal animation
													selectedStudentForVipModal = {
														id: student.id,
														name: getFullName(student.firstname, student.lastname, student.full_name),
														vipCards: student.vip_cards || {}
													};

													// Show loading animation (mystery card) immediately
													awardingCard = true;

													return async ({ update }) => {
														await update();
														// Note: awardingCard will be set to false in $effect when response arrives
														await invalidateAll();
													};
												}}
											>
												<input type="hidden" name="studentId" value={student.id} />
												<Button
													type="submit"
													size="sm"
													variant="default"
													class="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
													disabled={!canAffordVipCard(student.gidouilles) || awardingCard}
												>
													{#if awardingCard}
														<Loader2 class="w-4 h-4 animate-spin" />
														<span class="hidden sm:inline">Attribution...</span>
													{:else}
														<Sparkles class="w-4 h-4" />
														<span class="hidden sm:inline">Carte VIP</span>
														<span class="text-xs opacity-80">(3 <img src={gidouilleImg} alt="gidouille" class="inline w-3 h-3" />)</span>
													{/if}
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

<!-- Loading State: Shaking Mystery Card -->
<!-- Displayed immediately when "Carte VIP" button is clicked -->
{#if awardingCard && selectedStudentForVipModal}
	<VipCardLoading
		visible={true}
		studentName={selectedStudentForVipModal.name}
	/>
{/if}

<!-- VIP Card Reveal Animation -->
<!-- Displayed once server returns the cardId -->
<!-- The #key ensures each new card triggers a fresh animation -->
{#if revealingCard}
	{@const card = getVipCardById(revealingCard.cardId)}
	{#if card}
		{#key revealingCard.cardId}
			<VipCardReveal
				{card}
				fromLoadingState={true}
				onComplete={handleRevealComplete}
			/>
		{/key}
	{/if}
{/if}

<!-- Modal des Cartes VIP -->
{#if selectedStudentForVipModal && vipModalOpen}
	<VipCardsModal
		bind:open={vipModalOpen}
		studentName={selectedStudentForVipModal.name}
		vipCards={selectedStudentForVipModal.vipCards}
	/>
{/if}
