<script lang="ts">
	/**
	 * Teacher Evaluation Task — edit page
	 * ===================================
	 *
	 * Formulaire d'édition métadonnées + checklist observables (périmètre).
	 */

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { ChevronLeft, ClipboardList, Save, Trash2, PenLine } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();

	// État local périmètre : map skill_id → in_perimeter
	let perimeterState = $state<Record<string, boolean>>(
		(() => {
			const init: Record<string, boolean> = {};
			for (const c of data.competences) {
				for (const sd of c.subdimensions) {
					for (const ob of sd.observables) {
						init[ob.skill_id] = ob.in_perimeter;
					}
				}
			}
			return init;
		})()
	);

	// Use string | undefined (not null) so MySelect bind:value works correctly
	// svelte-ignore state_referenced_locally
	let classId = $state<string | undefined>(data.class_id ?? undefined);

	const classItems = $derived([
		{ value: '', label: 'Aucune (tâche ad-hoc)' },
		...data.classes.map((c) => ({ value: c.id, label: c.name }))
	]);

	const selectedCount = $derived(Object.values(perimeterState).filter(Boolean).length);

	function toggleObservable(skillId: string, checked: boolean) {
		perimeterState = { ...perimeterState, [skillId]: checked };
	}

	function toggleAllInSubdim(skillIds: string[], target: boolean) {
		const updated = { ...perimeterState };
		for (const sid of skillIds) updated[sid] = target;
		perimeterState = updated;
	}

	$effect(() => {
		if (form?.message) {
			if ('success' in (form as object) && (form as { success?: boolean }).success) {
				toaster.success(form.message);
			} else {
				toaster.error(form.message);
			}
		}
	});
</script>

<svelte:head>
	<title>{data.name} | Tâches d'évaluation | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
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
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-bold tracking-tight">{data.name}</h1>
			<p class="text-sm text-muted-foreground">
				{selectedCount} observable{selectedCount > 1 ? 's' : ''} dans le périmètre
			</p>
		</div>
		{#if data.class_id && selectedCount > 0}
			<Button href="/dashboard/teacher/evaluation-tasks/{data.id}/saisie" class="gap-1">
				<PenLine class="h-4 w-4" />
				Saisir en séance
			</Button>
		{/if}
	</div>

	<!-- Métadonnées -->
	<Card.Root class="mb-6">
		<Card.Header>
			<h2 class="text-lg font-semibold">Informations générales</h2>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/update_meta" class="space-y-4">
				<div>
					<Label for="name">Nom *</Label>
					<Input id="name" name="name" required maxlength={200} value={data.name} />
				</div>
				<div>
					<Label for="description">Description</Label>
					<Input
						id="description"
						name="description"
						maxlength={500}
						value={data.description ?? ''}
						placeholder="Contexte de la tâche, énoncé du problème ouvert…"
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<Label for="task_date">Date</Label>
						<Input id="task_date" name="task_date" type="date" value={data.task_date ?? ''} />
					</div>
					<div>
						<Label>Classe</Label>
						<MySelect type="single" bind:value={classId} items={classItems} />
						<input type="hidden" name="class_id" value={classId ?? ''} />
					</div>
				</div>
				<div class="flex justify-end">
					<Button type="submit" class="gap-1">
						<Save class="h-4 w-4" />
						Enregistrer
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Périmètre : observables groupés par compétence math -->
	<Card.Root class="mb-6">
		<Card.Header>
			<h2 class="text-lg font-semibold">Périmètre d'observation</h2>
			<p class="text-sm text-muted-foreground">
				Coche les observables que cette tâche permet d'observer. En séance, tu coches les réussites
				— les non-cochés du périmètre deviennent « – », les hors-périmètre restent ∅.
			</p>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/save_perimeter" class="space-y-6">
				{#each data.competences as comp (comp.id)}
					<section>
						<h3 class="mb-2 font-semibold">
							{comp.name}
							<span class="text-sm font-normal text-muted-foreground">
								— {comp.gloss_for_student}
							</span>
						</h3>
						<div class="space-y-3 border-l-2 border-muted pl-3">
							{#each comp.subdimensions as sd (sd.letter)}
								{@const skillIds = sd.observables.map((o) => o.skill_id)}
								{@const allChecked = skillIds.every((sid) => perimeterState[sid])}
								{@const someChecked = skillIds.some((sid) => perimeterState[sid])}
								<div>
									<div class="mb-1 flex items-center justify-between">
										<div class="text-sm font-medium text-muted-foreground">
											{sd.letter} — {sd.name}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onclick={() => toggleAllInSubdim(skillIds, !allChecked)}
											class="h-7 text-xs"
										>
											{allChecked ? 'Tout décocher' : someChecked ? 'Tout cocher' : 'Tout cocher'}
										</Button>
									</div>
									<div class="space-y-1.5 pl-2">
										{#each sd.observables as ob (ob.skill_id)}
											<label
												class="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-accent/50"
											>
												<MyCheckbox
													checked={perimeterState[ob.skill_id] ?? false}
													onCheckedChange={(v) => toggleObservable(ob.skill_id, v === true)}
												/>
												{#if perimeterState[ob.skill_id]}
													<input type="hidden" name="skill_id" value={ob.skill_id} />
												{/if}
												<div class="flex-1 text-sm">
													<span class="font-mono text-xs font-bold text-muted-foreground"
														>{ob.observable_code}</span
													>
													<span class="ml-1">{ob.name}</span>
													{#if ob.teacher_grid_text}
														<div class="mt-0.5 text-xs text-muted-foreground italic">
															prof : {ob.teacher_grid_text}
														</div>
													{/if}
												</div>
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/each}

				<div
					class="sticky bottom-0 -mx-6 -mb-6 flex items-center justify-between border-t bg-card px-6 py-3"
				>
					<span class="text-sm text-muted-foreground">
						{selectedCount} observable{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1
							? 's'
							: ''}
					</span>
					<Button type="submit" class="gap-1">
						<Save class="h-4 w-4" />
						Enregistrer le périmètre
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Suppression -->
	<Card.Root class="border-destructive/30">
		<Card.Content class="pt-6">
			<form
				method="POST"
				action="?/delete"
				onsubmit={(e) => {
					if (!confirm("Supprimer définitivement cette tâche d'évaluation ?")) e.preventDefault();
				}}
			>
				<Button type="submit" variant="destructive" class="gap-1">
					<Trash2 class="h-4 w-4" />
					Supprimer cette tâche
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</main>
