<!--
	Teacher Riddle of the Day Management Page
	==========================================
	Manage daily riddle selection
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { getDifficultyLabel, getDifficultyColor, type DbRiddle } from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Sparkles, Calendar, History, Trash2, Plus } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let selectedRiddleId = $state<string>('');
	let selectedDate = $state<string>(format(new Date(), 'yyyy-MM-dd'));
	let isSubmitting = $state(false);

	// Riddle items for MySelect
	const riddleItems = $derived(
		data.availableRiddles.map((riddle) => ({
			value: riddle.id,
			label: `#${riddle.riddle_number} - ${riddle.title}`
		}))
	);

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'EEEE d MMMM yyyy', { locale: fr });
	}

	function getRiddleById(id: string): DbRiddle | undefined {
		return data.availableRiddles.find((r) => r.id === id);
	}
</script>

<svelte:head>
	<title>Gestion Énigme du Jour - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<Sparkles class="h-8 w-8 text-primary" />
			Gestion de l'Énigme du Jour
		</h1>
		<p class="mt-2 text-muted-foreground">Définissez l'énigme quotidienne pour tous les élèves</p>
	</div>

	<!-- Current Riddle of the Day -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Calendar class="h-5 w-5" />
				Énigme du jour actuelle
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.currentRiddle}
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<Badge variant="outline">Énigme #{data.currentRiddle.riddle_number}</Badge>
						<Badge class={getDifficultyColor(data.currentRiddle.difficulty)}>
							{getDifficultyLabel(data.currentRiddle.difficulty)}
						</Badge>
						{#if data.currentRiddle.genre}
							<Badge variant="outline">{data.currentRiddle.genre}</Badge>
						{/if}
					</div>
					<h3 class="text-xl font-semibold">{data.currentRiddle.title}</h3>
					<p class="text-sm text-muted-foreground capitalize">
						{formatDate(data.currentRiddle.assignment_date)}
					</p>
					<form method="POST" action="?/removeRiddle">
						<input
							type="hidden"
							name="assignment_date"
							value={data.currentRiddle.assignment_date}
						/>
						<Button type="submit" variant="destructive" size="sm">
							<Trash2 class="mr-2 h-4 w-4" />
							Retirer
						</Button>
					</form>
				</div>
			{:else}
				<Alert.Root>
					<Alert.Title>Aucune énigme du jour définie</Alert.Title>
					<Alert.Description>
						Utilisez le formulaire ci-dessous pour définir l'énigme du jour.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Set Riddle of the Day Form -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Plus class="h-5 w-5" />
				Définir une énigme du jour
			</Card.Title>
			<Card.Description>
				Choisissez une énigme et une date pour la définir comme énigme du jour
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				action="?/setRiddle"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toaster.success('Énigme du jour définie avec succès');
							selectedRiddleId = '';
						} else if (result.type === 'failure') {
							const errorData = result.data as { message?: string };
							toaster.error(errorData?.message || 'Erreur lors de la définition');
						}
						await update();
					};
				}}
			>
				<div class="space-y-4">
					<!-- Date Selection -->
					<div class="space-y-2">
						<Label for="assignment_date">Date</Label>
						<Input
							type="date"
							id="assignment_date"
							name="assignment_date"
							bind:value={selectedDate}
							required
						/>
					</div>

					<!-- Riddle Selection -->
					<div class="space-y-2">
						<Label for="riddle_id">Énigme</Label>
						<MySelect
							type="single"
							bind:value={selectedRiddleId}
							items={riddleItems}
							placeholder="Sélectionner une énigme"
							triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
						<input type="hidden" name="riddle_id" value={selectedRiddleId} />
					</div>

					<!-- Preview Selected Riddle -->
					{#if selectedRiddleId}
						{@const riddle = getRiddleById(selectedRiddleId)}
						{#if riddle}
							<div class="rounded-lg border bg-muted/30 p-4">
								<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Aperçu
								</p>
								<div class="flex items-center gap-2">
									<Badge variant="outline">#{riddle.riddle_number}</Badge>
									<Badge class={getDifficultyColor(riddle.difficulty)}>
										{getDifficultyLabel(riddle.difficulty)}
									</Badge>
									{#if riddle.genre}
										<Badge variant="outline">{riddle.genre}</Badge>
									{/if}
								</div>
								<h4 class="mt-2 font-semibold">{riddle.title}</h4>
							</div>
						{/if}
					{/if}

					<Button type="submit" disabled={!selectedRiddleId || isSubmitting} class="w-full">
						{isSubmitting ? 'Définition...' : 'Définir comme énigme du jour'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- History -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<History class="h-5 w-5" />
				Historique (30 dernières)
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.history.length > 0}
				<div class="space-y-3">
					{#each data.history as entry (entry.id)}
						<div class="flex items-center justify-between rounded-lg border p-3">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<Badge variant="outline">#{entry.riddle.riddle_number}</Badge>
									<Badge class={getDifficultyColor(entry.riddle.difficulty)}>
										{getDifficultyLabel(entry.riddle.difficulty)}
									</Badge>
									{#if entry.riddle.genre}
										<Badge variant="outline">{entry.riddle.genre}</Badge>
									{/if}
								</div>
								<p class="mt-1 font-medium">{entry.riddle.title}</p>
								<p class="text-xs text-muted-foreground capitalize">
									{formatDate(entry.assignment_date)}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-center text-muted-foreground">Aucun historique</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
