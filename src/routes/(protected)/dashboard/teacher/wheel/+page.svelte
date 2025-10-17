<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Wheel from '$lib/components/Wheel.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let selectedClassId = $state<string>('');
	let gidouilleReward = $state<number>(10);

	// Get students from selected class
	let selectedStudents = $derived(() => {
		if (!selectedClassId) return [];

		const classItem = data.classes.find((c) => c.id === selectedClassId);
		if (!classItem) return [];

		return classItem.students;
	});

	// Handle gidouille reward
	const handleRewardGiven = async (studentId: string, amount: number) => {
		try {
			const response = await fetch('/api/rewards/gidouilles', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					studentId,
					amount
				})
			});

			if (!response.ok) {
				throw new Error('Failed to award gidouilles');
			}

			// Refresh data
			setTimeout(() => {
				invalidateAll();
			}, 100);

			// Find student name
			const student = selectedStudents().find((s) => s.id === studentId);
			const studentName = student?.firstname || 'Élève';

			toaster.success(`+${amount} gidouilles pour ${studentName} !`);
		} catch (error) {
			console.error('Error awarding gidouilles:', error);
			toaster.error('Erreur lors de l\'attribution des gidouilles');
		}
	};

	// Handle winner selected
	const handleWinner = (student: { id: string; firstname: string }) => {
		console.log('Winner selected:', student);
	};
</script>

<div class="container mx-auto max-w-4xl p-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Roue de la Fortune</h1>
		<p class="mt-2 text-muted-foreground">
			Sélectionnez aléatoirement un élève de votre classe
		</p>
	</div>

	<!-- Class Selection -->
	<div class="mb-8 rounded-lg border border-border bg-card p-6">
		<h2 class="mb-4 text-xl font-semibold text-card-foreground">Configuration</h2>

		<div class="grid gap-6 md:grid-cols-2">
			<!-- Class Selector -->
			<div>
				<label for="class-select" class="mb-2 block text-sm font-medium text-foreground">
					Classe
				</label>
				<select
					id="class-select"
					bind:value={selectedClassId}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">Sélectionner une classe</option>
					{#each data.classes as classItem}
						<option value={classItem.id}>
							{classItem.name} ({classItem.students.length} élèves)
						</option>
					{/each}
				</select>
			</div>

			<!-- Gidouille Reward Input -->
			<div>
				<label for="reward-input" class="mb-2 block text-sm font-medium text-foreground">
					Récompense (gidouilles)
				</label>
				<input
					id="reward-input"
					type="number"
					min="0"
					step="1"
					bind:value={gidouilleReward}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="10"
				/>
				<p class="mt-1 text-xs text-muted-foreground">
					Laissez à 0 pour ne pas donner de récompense
				</p>
			</div>
		</div>

		<!-- Student Count -->
		{#if selectedClassId}
			<div class="mt-4 rounded-md bg-muted p-3">
				<p class="text-sm text-muted-foreground">
					<span class="font-semibold">{selectedStudents().length}</span>
					élève{selectedStudents().length > 1 ? 's' : ''} dans cette classe
				</p>
			</div>
		{/if}
	</div>

	<!-- Wheel Component -->
	{#if selectedStudents().length > 0}
		<div class="rounded-lg border border-border bg-card p-8">
			<Wheel
				students={selectedStudents()}
				gidouilleReward={gidouilleReward > 0 ? gidouilleReward : undefined}
				onRewardGiven={handleRewardGiven}
				onWinner={handleWinner}
			/>
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
			<p class="text-lg text-muted-foreground">
				{#if !selectedClassId}
					Sélectionnez une classe pour commencer
				{:else}
					Cette classe ne contient aucun élève
				{/if}
			</p>
		</div>
	{/if}
</div>
