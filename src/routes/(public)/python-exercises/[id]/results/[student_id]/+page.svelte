<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import PythonEditor from '$lib/components/python/PythonEditor.svelte';
	import ExerciseValidationResult from '$lib/components/python/exercises/ExerciseValidationResult.svelte';
	import {
		ArrowLeft,
		CheckCircle2,
		XCircle,
		ChevronDown,
		ChevronRight,
		Copy,
		LayoutGrid
	} from '@lucide/svelte';
	import type { ExerciseValidationResult as ValidationResult } from '$lib/shared/python';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Map<submission_id, open?>. The newest submission opens by default.
	// We snapshot data.submissions at component init (not reactively) — the user's
	// expand/collapse state should not be reset on subsequent invalidations.
	function buildInitialOpen(): Record<string, boolean> {
		const obj: Record<string, boolean> = {};
		const subs = data.submissions;
		if (subs.length > 0) obj[subs[0].id] = true;
		return obj;
	}
	let openMap = $state<Record<string, boolean>>(buildInitialOpen());

	function toggle(id: string) {
		openMap = { ...openMap, [id]: !openMap[id] };
	}

	function fullName(): string {
		const fn = data.student.firstname ?? '';
		const ln = data.student.lastname ?? '';
		const composed = `${fn} ${ln}`.trim();
		return composed || (data.student.email ?? data.student.id);
	}

	function formatRelative(iso: string): string {
		const diffMs = Date.now() - new Date(iso).getTime();
		const minutes = Math.round(diffMs / 60000);
		if (minutes < 1) return "à l'instant";
		if (minutes < 60) return `il y a ${minutes} min`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `il y a ${hours} h`;
		const days = Math.round(hours / 24);
		if (days < 30) return `il y a ${days} j`;
		return new Date(iso).toLocaleDateString('fr-FR');
	}

	async function copyCode(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			toaster.success('Code copié dans le presse-papiers');
		} catch {
			toaster.error('Impossible de copier le code');
		}
	}
</script>

<svelte:head>
	<title>{fullName()} — {data.exercise.title} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-start gap-4">
		<Button variant="ghost" size="icon" href="/python-exercises/{data.exercise.id}/results">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<p class="text-sm text-muted-foreground">{data.exercise.title}</p>
			<h1 class="text-3xl font-bold tracking-tight">{fullName()}</h1>
			{#if data.student.email}
				<p class="mt-1 text-sm text-muted-foreground">{data.student.email}</p>
			{/if}
		</div>
		<Button variant="outline" size="sm" href="/python-exercises/students/{data.student.id}">
			<LayoutGrid class="mr-1 h-4 w-4" />
			Voir tous ses exos
		</Button>
	</div>

	<!-- Submissions list -->
	<Card.Root>
		<Card.Header>
			<Card.Title>
				Tentatives
				{#if data.submissions.length > 0}
					({data.submissions.length})
				{/if}
			</Card.Title>
			<Card.Description>
				{#if data.submissions.length === 0}
					Aucune tentative pour cet élève sur cet exercice.
				{:else}
					Cliquez sur une tentative pour voir le code et le verdict détaillé.
				{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			{#each data.submissions as sub (sub.id)}
				{@const open = openMap[sub.id] === true}
				<div class="rounded-md border border-border bg-card">
					<button
						type="button"
						class="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-muted/50"
						onclick={() => toggle(sub.id)}
					>
						{#if open}
							<ChevronDown class="h-4 w-4 shrink-0" />
						{:else}
							<ChevronRight class="h-4 w-4 shrink-0" />
						{/if}
						{#if sub.is_correct}
							<CheckCircle2 class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
						{:else}
							<XCircle class="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
						{/if}
						<span class="font-medium">Tentative #{sub.attempt_number}</span>
						<span class="text-xs text-muted-foreground">·</span>
						<span class="text-xs text-muted-foreground">{formatRelative(sub.created_at)}</span>
						{#if sub.assignment_id === null}
							<Badge variant="outline" class="text-xs">Libre</Badge>
						{/if}
						{#if sub.execution_time_ms !== null}
							<span class="ml-auto text-xs text-muted-foreground">
								{sub.execution_time_ms} ms
							</span>
						{/if}
					</button>

					{#if open}
						<div class="space-y-3 border-t border-border p-3">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-muted-foreground">Code soumis</span>
								<Button variant="ghost" size="sm" onclick={() => copyCode(sub.code)}>
									<Copy class="mr-1 h-3 w-3" /> Copier
								</Button>
							</div>
							<div class="rounded-md border border-border">
								<PythonEditor value={sub.code} disabled />
							</div>
							{#if sub.validation_result}
								<div>
									<span class="mb-2 block text-xs font-medium text-muted-foreground">
										Verdict
									</span>
									<ExerciseValidationResult result={sub.validation_result as ValidationResult} />
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
