<script lang="ts">
	/**
	 * Teacher Evaluation Tasks — list page
	 * ====================================
	 *
	 * UI prof Phase 4.1 — Liste des tâches d'évaluation famille B.
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ClipboardList, Plus, ChevronRight, Calendar, Users } from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		const d = new Date(iso);
		return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Tâches d'évaluation | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<ClipboardList class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Tâches d'évaluation</h1>
				<p class="text-muted-foreground">
					{data.tasks.length} tâche{data.tasks.length > 1 ? 's' : ''} — Famille B (compétences math)
				</p>
			</div>
		</div>
		<Button href="/dashboard/teacher/evaluation-tasks/new" class="gap-1">
			<Plus class="h-4 w-4" />
			Nouvelle tâche
		</Button>
	</div>

	{#if data.tasks.length === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<ClipboardList class="mx-auto mb-3 h-10 w-10 opacity-40" />
				<p class="mb-3">Aucune tâche d'évaluation pour le moment.</p>
				<Button href="/dashboard/teacher/evaluation-tasks/new" variant="default">
					<Plus class="h-4 w-4" />
					Créer ma première tâche
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-2">
			{#each data.tasks as task (task.id)}
				<a
					href="/dashboard/teacher/evaluation-tasks/{task.id}"
					class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
				>
					<Card.Root>
						<Card.Content class="flex items-center gap-3 p-4">
							<div class="min-w-0 flex-1">
								<div class="font-medium">{task.name}</div>
								{#if task.description}
									<div class="line-clamp-1 text-sm text-muted-foreground">{task.description}</div>
								{/if}
								<div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
									<span class="flex items-center gap-1">
										<Calendar class="h-3 w-3" />
										{formatDate(task.task_date)}
									</span>
									{#if task.class_name}
										<span class="flex items-center gap-1">
											<Users class="h-3 w-3" />
											{task.class_name}
										</span>
									{/if}
									<Badge variant="outline" class="text-xs">
										Périmètre : {task.perimeter_count} observable{task.perimeter_count > 1
											? 's'
											: ''}
									</Badge>
								</div>
							</div>
							<ChevronRight class="h-5 w-5 shrink-0 text-muted-foreground" />
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</main>
