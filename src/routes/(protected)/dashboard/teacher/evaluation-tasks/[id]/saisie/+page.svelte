<script lang="ts">
	/**
	 * Teacher Evaluation Task — saisie en séance
	 * ==========================================
	 *
	 * Mobile-first : par défaut « vue par observable » (le prof choisit un
	 * observable et coche les élèves en réussite). Sur desktop, on bascule
	 * automatiquement vers le tableau élèves × observables.
	 */

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { ChevronLeft, Save, Check } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();

	// État local : map "studentId:skillId" → bool (coché ou non)
	let checks = $state<Record<string, boolean>>(
		(() => {
			const init: Record<string, boolean> = {};
			for (const [k, code] of Object.entries(data.existing)) {
				if (code === 'plus') init[k] = true;
			}
			return init;
		})()
	);

	// Observable courant (mode mobile / focus)
	// svelte-ignore state_referenced_locally
	let currentObservableId = $state<string>(data.observables[0]?.skill_id ?? '');

	function key(studentId: string, skillId: string): string {
		return `${studentId}:${skillId}`;
	}

	function toggle(studentId: string, skillId: string) {
		const k = key(studentId, skillId);
		checks = { ...checks, [k]: !checks[k] };
	}

	function countCheckedForObservable(skillId: string): number {
		let n = 0;
		for (const s of data.students) {
			if (checks[key(s.id, skillId)]) n += 1;
		}
		return n;
	}

	$effect(() => {
		if (form?.message) {
			const ok = 'success' in (form as object) && (form as { success?: boolean }).success;
			if (ok) toaster.success(form.message);
			else toaster.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Saisie — {data.task_name} | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-6xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/teacher/evaluation-tasks/{data.task_id}">
			<ChevronLeft class="h-4 w-4" />
			Retour à la tâche
		</Button>
	</div>

	<div class="mb-4">
		<h1 class="text-2xl font-bold tracking-tight">Saisie : {data.task_name}</h1>
		<p class="text-sm text-muted-foreground">
			{data.class_name ?? 'Classe inconnue'} · {data.students.length} élève{data.students.length > 1
				? 's'
				: ''} · {data.observables.length} observable{data.observables.length > 1 ? 's' : ''} au périmètre
		</p>
	</div>

	{#if data.students.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p>Aucun élève dans cette classe.</p>
			</Card.Content>
		</Card.Root>
	{:else if data.observables.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p class="mb-3">Aucun observable dans le périmètre de cette tâche.</p>
				<Button href="/dashboard/teacher/evaluation-tasks/{data.task_id}">
					Déclarer le périmètre
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<form method="POST" action="?/save">
			<!-- Mode mobile : vue par observable -->
			<div class="md:hidden">
				<!-- Sélecteur d'observable -->
				<div class="mb-4 max-h-64 overflow-y-auto rounded-md border bg-card p-2">
					<div class="space-y-1">
						{#each data.observables as ob (ob.skill_id)}
							{@const isCurrent = ob.skill_id === currentObservableId}
							{@const cnt = countCheckedForObservable(ob.skill_id)}
							<button
								type="button"
								onclick={() => (currentObservableId = ob.skill_id)}
								class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors {isCurrent
									? 'bg-primary/10 font-semibold'
									: 'hover:bg-accent/50'}"
							>
								<span class="flex-1 truncate">
									<span class="font-mono text-xs text-muted-foreground">{ob.observable_code}</span>
									<span class="ml-1">{ob.name}</span>
								</span>
								<span class="shrink-0 text-xs text-muted-foreground">
									{cnt}/{data.students.length}
								</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Observable courant : grille élèves -->
				{#if currentObservableId}
					{@const ob = data.observables.find((o) => o.skill_id === currentObservableId)!}
					<Card.Root class="mb-6">
						<Card.Header>
							<div class="text-xs text-muted-foreground">
								{ob.competence_name} · {ob.subdimension_letter}
							</div>
							<h2 class="text-base font-semibold">{ob.name}</h2>
							{#if ob.teacher_grid_text}
								<p class="text-xs text-muted-foreground italic">{ob.teacher_grid_text}</p>
							{/if}
						</Card.Header>
						<Card.Content>
							<div class="space-y-1">
								{#each data.students as s (s.id)}
									{@const k = key(s.id, ob.skill_id)}
									<label
										class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50 {checks[
											k
										]
											? 'bg-green-50 dark:bg-green-950/30'
											: ''}"
									>
										<MyCheckbox
											checked={checks[k] ?? false}
											onCheckedChange={() => toggle(s.id, ob.skill_id)}
										/>
										<span class="flex-1 text-sm">{s.full_name}</span>
										{#if checks[k]}
											<input type="hidden" name="check__{s.id}__{ob.skill_id}" value="on" />
											<Check class="h-4 w-4 text-green-600" />
										{/if}
									</label>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>

			<!-- Mode desktop : tableau élèves × observables -->
			<div class="mb-6 hidden md:block">
				<Card.Root>
					<Card.Content class="overflow-x-auto p-0">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b bg-muted/50">
									<th class="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium">
										Élève
									</th>
									{#each data.observables as ob (ob.skill_id)}
										<th class="px-2 py-2 text-center font-medium" title={ob.name}>
											<div class="font-mono text-xs">{ob.observable_code}</div>
											<div class="mt-0.5 text-[10px] text-muted-foreground">
												{ob.competence_name.slice(0, 4)}
											</div>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each data.students as s (s.id)}
									<tr class="border-b hover:bg-accent/20">
										<td class="sticky left-0 z-10 bg-background px-3 py-2 font-medium">
											{s.full_name}
										</td>
										{#each data.observables as ob (ob.skill_id)}
											{@const k = key(s.id, ob.skill_id)}
											<td class="px-2 py-2 text-center">
												<label class="inline-flex cursor-pointer">
													<MyCheckbox
														checked={checks[k] ?? false}
														onCheckedChange={() => toggle(s.id, ob.skill_id)}
													/>
													{#if checks[k]}
														<input type="hidden" name="check__{s.id}__{ob.skill_id}" value="on" />
													{/if}
												</label>
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</Card.Content>
				</Card.Root>
				<p class="mt-2 text-xs text-muted-foreground">
					Coche uniquement les réussites. Les non-cochés du périmètre seront enregistrés comme « – »
					(occasion présente mais pas réussi). Hors périmètre = ∅ (pas pris en compte).
				</p>
			</div>

			<!-- Footer sticky : bouton enregistrer -->
			<div
				class="sticky bottom-0 -mx-4 flex items-center justify-between border-t bg-background/95 px-4 py-3 backdrop-blur"
			>
				<span class="text-sm text-muted-foreground">
					{Object.values(checks).filter(Boolean).length} réussites cochées
				</span>
				<Button type="submit" class="gap-1">
					<Save class="h-4 w-4" />
					Enregistrer la saisie
				</Button>
			</div>
		</form>
	{/if}
</main>
