<script lang="ts">
	/**
	 * Student Objectif Detail Page
	 * ============================
	 *
	 * UI élève Phase 3.2 — Détail d'un objectif (tableau 4 colonnes desktop /
	 * 4 lignes mobile, style PDF référentiel 2016 de David).
	 *
	 * Spec : docs/wip/skills-referentiel-design.md §8
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		ChevronLeft,
		Star,
		Check,
		Circle,
		LifeBuoy,
		Sparkles,
		BookOpen,
		MessageCircleQuestion
	} from '@lucide/svelte';
	import { formatObjectiveLevel, getObjectiveLevelVisual } from '$lib/types/skills';
	import CapacityFsrsBadge from '$lib/components/srs/CapacityFsrsBadge.svelte';
	import type { PageData } from './$types';
	import type { CapacityDetail } from './+page.server';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Helpers visuels — verdict BO formel uniquement (le badge FSRS dynamique
	// est affiché séparément via <CapacityFsrsBadge>).
	function capacityBadgeVariant(c: CapacityDetail): 'default' | 'outline' | 'destructive' {
		if (c.needs_remediation) return 'destructive';
		if (c.is_acquired) return 'default';
		return 'outline';
	}

	function capacityBgClass(c: CapacityDetail): string {
		if (c.needs_remediation)
			return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
		if (c.is_acquired)
			return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
		return 'bg-muted/30 border-muted';
	}

	function capacityStatusLabel(c: CapacityDetail): string {
		if (c.needs_remediation) return 'À remédier';
		if (c.is_acquired) return 'Acquise';
		return 'Non acquise';
	}
</script>

<svelte:head>
	<title>{data.name} | Mes objectifs | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<!-- Breadcrumb / retour -->
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/student/objectifs">
			<ChevronLeft class="h-4 w-4" />
			Mes objectifs
		</Button>
	</div>

	<!-- Header -->
	<div class="mb-6">
		<div class="mb-1 text-sm text-muted-foreground">{data.theme_name}</div>
		<h1 class="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{data.name}</h1>
		{#if data.description}
			<p class="text-muted-foreground">{data.description}</p>
		{/if}
		<!-- Niveau atteint global -->
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
				{#if data.has_scale}
					<span class="text-2xl">{getObjectiveLevelVisual(data.rang_max_acquired)}</span>
				{/if}
				<div>
					<div class="font-semibold">
						{data.has_scale ? formatObjectiveLevel(data.rang_max_acquired) : 'Progression'}
					</div>
					<div class="text-xs text-muted-foreground">
						{data.acquired_count}/{data.total_count} acquis
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Objectif à échelle : tableau 4 colonnes. Sans échelle : liste en 2 colonnes. -->
	<div class="mb-6 grid grid-cols-1 gap-3 {data.has_scale ? 'md:grid-cols-4' : 'md:grid-cols-2'}">
		{#each data.capacities as cap (cap.id)}
			<Card.Root class="relative {capacityBgClass(cap)}">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-1.5">
							{#if cap.rang !== null}
								<span class="text-sm font-bold text-muted-foreground">Rang {cap.rang}</span>
							{:else}
								<span class="text-sm font-medium text-muted-foreground">
									{cap.kind === 'connaissance'
										? 'Connaissance'
										: cap.kind === 'demonstration'
											? 'Démonstration'
											: 'Savoir-faire'}
								</span>
							{/if}
							{#if cap.rang === 3}
								<Star
									class="h-4 w-4 fill-amber-400 text-amber-400"
									aria-label="Attendu pour tous"
								/>
							{/if}
							{#if cap.rang === 4}
								<Sparkles class="h-4 w-4 text-amber-500" aria-label="Expert" />
							{/if}
						</div>
						<!-- Icône d'état BO formel -->
						<div>
							{#if cap.needs_remediation}
								<LifeBuoy class="h-5 w-5 text-red-600" />
							{:else if cap.is_acquired}
								<Check class="h-5 w-5 text-green-600" />
							{:else}
								<Circle class="h-5 w-5 text-muted-foreground" />
							{/if}
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<p class="text-sm leading-relaxed">{cap.name}</p>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Badge variant={capacityBadgeVariant(cap)} class="text-xs">
							{capacityStatusLabel(cap)}
						</Badge>
						<CapacityFsrsBadge badge={cap.badge} showLabel />
						{#if cap.knowledge_type === 'automatisme'}
							<Badge variant="outline" class="text-xs">⚡ automatisme</Badge>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Actions (placeholders V1) -->
	<Card.Root>
		<Card.Content class="pt-6">
			<h3 class="mb-3 font-semibold">Que veux-tu faire ?</h3>
			<div class="flex flex-wrap gap-2">
				<Button variant="default" disabled class="gap-1">
					<BookOpen class="h-4 w-4" />
					Pratiquer
					<span class="text-xs opacity-70">(bientôt)</span>
				</Button>
				<Button variant="outline" disabled class="gap-1">
					<Sparkles class="h-4 w-4" />
					Réviser
					<span class="text-xs opacity-70">(bientôt)</span>
				</Button>
				<Button variant="outline" disabled class="gap-1">
					<MessageCircleQuestion class="h-4 w-4" />
					Demander au tuteur
					<span class="text-xs opacity-70">(bientôt)</span>
				</Button>
			</div>
			<p class="mt-3 text-xs text-muted-foreground">
				Pour le moment, réponds aux questions de l'app pour faire avancer ton niveau. Les actions
				dédiées seront ajoutées prochainement.
			</p>
		</Card.Content>
	</Card.Root>
</main>
