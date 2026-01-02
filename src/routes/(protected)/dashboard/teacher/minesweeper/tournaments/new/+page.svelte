<!--
	New Tournament Creation Form
	=============================
	Form for creating a new Minesweeper tournament.
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Slider } from '$lib/components/ui/slider';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, AlertTriangle, Trophy } from 'lucide-svelte';
	import { DIFFICULTY_LABELS, type Difficulty } from '$lib/types/minesweeper';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let name = $state('');
	let description = $state('');
	let difficulty = $state<Difficulty>('beginner');
	let startDate = $state('');
	let endDate = $state('');
	let topXGames = $state([3]);
	let podiumPlaces = $state('3');
	let selectedClasses = $state<Record<string, boolean>>({});
	let podiumRewards = $state<Record<string, number>>({
		'1': 10,
		'2': 5,
		'3': 3
	});

	let isSubmitting = $state(false);
	let validationErrors = $state<Record<string, string>>({});

	// Difficulty options for MySelect
	const difficultyItems = Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({
		value,
		label
	}));

	// Podium places options for MySelect
	const podiumPlacesItems = Array.from({ length: 10 }, (_, i) => ({
		value: String(i + 1),
		label: `${i + 1} place${i > 0 ? 's' : ''}`
	}));

	// Computed: selected class IDs
	let selectedClassIds = $derived(
		Object.entries(selectedClasses)
			.filter(([, selected]) => selected)
			.map(([id]) => id)
	);

	// Computed: total students in selected classes
	let totalStudents = $derived(
		data.classes.filter((c) => selectedClasses[c.id]).reduce((sum, c) => sum + c.student_count, 0)
	);

	// Update podium rewards when podium places changes
	$effect(() => {
		const places = parseInt(podiumPlaces, 10);
		const newRewards: Record<string, number> = {};

		for (let i = 1; i <= places; i++) {
			// Preserve existing rewards, or calculate default
			newRewards[String(i)] = podiumRewards[String(i)] ?? Math.max(1, 11 - i);
		}

		podiumRewards = newRewards;
	});

	function handleBack() {
		goto('/dashboard/teacher/minesweeper/tournaments').then(() => {});
	}

	function validateForm(): boolean {
		validationErrors = {};

		// Basic client-side validation (server does full Zod validation)
		const trimmedName = name.trim();
		if (!trimmedName || trimmedName.length < 3) {
			validationErrors['name'] = 'Le nom doit contenir au moins 3 caracteres';
		}
		if (trimmedName.length > 100) {
			validationErrors['name'] = 'Le nom ne peut pas depasser 100 caracteres';
		}

		if (!startDate) {
			validationErrors['start_date'] = 'La date de debut est requise';
		}

		if (!endDate) {
			validationErrors['end_date'] = 'La date de fin est requise';
		}

		if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
			validationErrors['end_date'] = 'La date de fin doit etre apres la date de debut';
		}

		if (selectedClassIds.length === 0) {
			validationErrors['class_ids'] = 'Au moins une classe doit etre selectionnee';
		}

		// Validate podium rewards
		const places = parseInt(podiumPlaces, 10);
		for (let i = 1; i <= places; i++) {
			if (podiumRewards[String(i)] === undefined || podiumRewards[String(i)] < 0) {
				validationErrors['podium_rewards'] =
					'Les recompenses doivent etre definies pour chaque place';
				break;
			}
		}

		return Object.keys(validationErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) {
			toaster.error('Veuillez corriger les erreurs du formulaire');
			return;
		}

		isSubmitting = true;

		try {
			const payload = {
				name: name.trim(),
				description: description.trim() || null,
				difficulty,
				start_date: new Date(startDate).toISOString(),
				end_date: new Date(endDate).toISOString(),
				top_x_games: topXGames[0],
				podium_places: parseInt(podiumPlaces, 10),
				podium_rewards: podiumRewards,
				class_ids: selectedClassIds
			};

			const response = await fetch('/api/games/minesweeper/tournaments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Erreur lors de la creation du tournoi');
			}

			const { tournament_id } = await response.json();

			toaster.success('Tournoi cree avec succes');
			goto(`/dashboard/teacher/minesweeper/tournaments/${tournament_id}`).then(() => {});
		} catch (err) {
			console.error('Failed to create tournament:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la creation du tournoi');
		} finally {
			isSubmitting = false;
		}
	}

	// Set default dates (start: tomorrow, end: in one week)
	$effect(() => {
		if (!startDate) {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(8, 0, 0, 0);
			startDate = tomorrow.toISOString().slice(0, 16);
		}
		if (!endDate) {
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 8);
			nextWeek.setHours(18, 0, 0, 0);
			endDate = nextWeek.toISOString().slice(0, 16);
		}
	});
</script>

<svelte:head>
	<title>Nouveau Tournoi | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Nouveau Tournoi</h1>
			<p class="mt-2 text-muted-foreground">Creez un tournoi de demineur pour vos classes</p>
		</div>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-8"
	>
		<!-- Basic Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Informations generales</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<!-- Name -->
				<div class="space-y-2">
					<Label for="name">Nom du tournoi *</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="Ex: Tournoi de Noel"
						class={validationErrors['name'] ? 'border-destructive' : ''}
					/>
					{#if validationErrors['name']}
						<p class="text-sm text-destructive">{validationErrors['name']}</p>
					{/if}
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description (optionnelle)</Label>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Decrivez le tournoi..."
						rows={3}
					/>
				</div>

				<!-- Difficulty -->
				<div class="space-y-2">
					<Label>Difficulte *</Label>
					<MySelect
						type="single"
						bind:value={difficulty}
						items={difficultyItems}
						placeholder="Selectionnez une difficulte"
					/>
					{#if validationErrors['difficulty']}
						<p class="text-sm text-destructive">{validationErrors['difficulty']}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Dates -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Periode du tournoi</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Start Date -->
					<div class="space-y-2">
						<Label for="start_date">Date de debut *</Label>
						<Input
							id="start_date"
							type="datetime-local"
							bind:value={startDate}
							class={validationErrors['start_date'] ? 'border-destructive' : ''}
						/>
						{#if validationErrors['start_date']}
							<p class="text-sm text-destructive">{validationErrors['start_date']}</p>
						{/if}
					</div>

					<!-- End Date -->
					<div class="space-y-2">
						<Label for="end_date">Date de fin *</Label>
						<Input
							id="end_date"
							type="datetime-local"
							bind:value={endDate}
							class={validationErrors['end_date'] ? 'border-destructive' : ''}
						/>
						{#if validationErrors['end_date']}
							<p class="text-sm text-destructive">{validationErrors['end_date']}</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Game Settings -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Parametres de jeu</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<!-- Top X Games -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label>Meilleures parties comptabilisees</Label>
						<span class="font-semibold">{topXGames[0]}</span>
					</div>
					<Slider bind:value={topXGames} min={1} max={20} step={1} class="w-full" />
					<p class="text-sm text-muted-foreground">
						Le classement sera base sur la moyenne des {topXGames[0]} meilleures parties de chaque joueur
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Classes -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Classes participantes *</Card.Title>
				<Card.Description>Selectionnez les classes qui participeront au tournoi</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if data.classes.length === 0}
					<Alert.Root variant="destructive">
						<AlertTriangle class="h-4 w-4" />
						<Alert.Title>Aucune classe</Alert.Title>
						<Alert.Description>
							Vous devez avoir au moins une classe pour creer un tournoi.
						</Alert.Description>
					</Alert.Root>
				{:else}
					<div class="grid gap-3 md:grid-cols-2">
						{#each data.classes as classItem (classItem.id)}
							<div class="rounded-lg border p-4 transition-colors hover:bg-muted/50">
								<MyCheckbox
									checked={selectedClasses[classItem.id] ?? false}
									onchange={(value) => (selectedClasses[classItem.id] = value)}
									label={`${classItem.name} (${classItem.student_count} eleves)`}
								/>
							</div>
						{/each}
					</div>
					{#if selectedClassIds.length > 0}
						<p class="text-sm text-muted-foreground">
							{selectedClassIds.length} classe{selectedClassIds.length > 1 ? 's' : ''} selectionnee{selectedClassIds.length >
							1
								? 's'
								: ''} ({totalStudents} eleves au total)
						</p>
					{/if}
					{#if validationErrors['class_ids']}
						<p class="text-sm text-destructive">{validationErrors['class_ids']}</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Podium -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Trophy class="h-5 w-5" />
					Configuration du podium
				</Card.Title>
				<Card.Description>Definissez les recompenses pour les meilleurs joueurs</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<!-- Podium Places -->
				<div class="space-y-2">
					<Label>Nombre de places sur le podium</Label>
					<MySelect
						type="single"
						bind:value={podiumPlaces}
						items={podiumPlacesItems}
						placeholder="Selectionnez le nombre de places"
					/>
				</div>

				<!-- Rewards per place -->
				<div class="space-y-4">
					<Label>Gidouilles par place</Label>
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each Array.from({ length: parseInt(podiumPlaces, 10) }) as _, i (i)}
							{@const place = i + 1}
							<div class="flex items-center gap-3">
								<span
									class="flex h-8 w-8 items-center justify-center rounded-full font-bold
									{place === 1
										? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
										: place === 2
											? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
											: place === 3
												? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
												: 'bg-muted text-muted-foreground'}"
								>
									{place}
								</span>
								<Input
									type="number"
									min={0}
									max={100}
									bind:value={podiumRewards[String(place)]}
									class="w-24"
								/>
								<span class="text-sm text-muted-foreground">gidouilles</span>
							</div>
						{/each}
					</div>
					{#if validationErrors['podium_rewards']}
						<p class="text-sm text-destructive">{validationErrors['podium_rewards']}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Submit -->
		<div class="flex justify-between">
			<Button variant="outline" type="button" onclick={handleBack} disabled={isSubmitting}>
				Annuler
			</Button>
			<Button type="submit" disabled={isSubmitting || data.classes.length === 0}>
				{isSubmitting ? 'Creation en cours...' : 'Creer le tournoi'}
			</Button>
		</div>
	</form>
</div>
