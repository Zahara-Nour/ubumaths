<script lang="ts">
	/**
	 * Teacher Evaluation Tasks — creation form
	 * ========================================
	 */

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import { ChevronLeft, ClipboardList } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();

	// Use string | undefined (not null) so MySelect bind:value works correctly
	let classId = $state<string | undefined>(undefined);

	const classItems = $derived([
		{ value: '', label: 'Aucune (tâche ad-hoc)' },
		...data.classes.map((c) => ({ value: c.id, label: c.name }))
	]);
</script>

<svelte:head>
	<title>Nouvelle tâche d'évaluation | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-2xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/teacher/evaluation-tasks">
			<ChevronLeft class="h-4 w-4" />
			Tâches d'évaluation
		</Button>
	</div>

	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
			<ClipboardList class="h-6 w-6 text-primary" />
		</div>
		<h1 class="text-2xl font-bold tracking-tight">Nouvelle tâche d'évaluation</h1>
	</div>

	<Card.Root>
		<Card.Content class="pt-6">
			<form method="POST" class="space-y-4">
				<div>
					<Label for="name">Nom de la tâche *</Label>
					<Input
						id="name"
						name="name"
						required
						maxlength={200}
						placeholder="Ex. Problème ouvert sur les fractions"
						value={(form?.values?.name ?? '') as string}
					/>
				</div>

				<div>
					<Label for="task_date">Date (optionnel)</Label>
					<Input
						id="task_date"
						name="task_date"
						type="date"
						value={(form?.values?.task_date ?? '') as string}
					/>
				</div>

				<div>
					<Label>Classe (optionnel)</Label>
					<MySelect type="single" bind:value={classId} items={classItems} />
					<input type="hidden" name="class_id" value={classId ?? ''} />
				</div>

				<input type="hidden" name="niveau_scolaire" value="6e" />

				{#if form?.message}
					<div
						class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
					>
						{form.message}
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-2">
					<Button variant="ghost" type="button" href="/dashboard/teacher/evaluation-tasks">
						Annuler
					</Button>
					<Button type="submit">Créer et déclarer le périmètre</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</main>
