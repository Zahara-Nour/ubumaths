<script lang="ts">
	/**
	 * Page d'une notion du programme, vue par l'élève.
	 *
	 * Les points de son niveau dans l'ordre du BO, en deux colonnes. Un point
	 * sans modèle tagué reste affiché (c'est le programme), marqué « Pas encore
	 * d'entraînement ici » (Q1 de la PR D).
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import {
		Check,
		Circle,
		LifeBuoy,
		Sparkles,
		BookOpen,
		MessageCircleQuestion
	} from '@lucide/svelte';
	import { formatNotionLevel, getNotionLevelVisual, notionLevel } from '$lib/types/skills';
	import CapacityFsrsBadge from '$lib/components/srs/CapacityFsrsBadge.svelte';
	import type { PageData } from './$types';
	import type { NotionPointDetail } from '$lib/server/progression/student-progression';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { notionReturn } from '$lib/navigation/return-links';
	import { page } from '$app/state';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const level = $derived(notionLevel(data));
	// Deux parents : « Ma progression » (par défaut) ou le deck « Programme ».
	const back = $derived(notionReturn(page.url.searchParams));

	const KIND_LABELS: Record<string, string> = {
		connaissance: 'Connaissance',
		savoir_faire: 'Savoir-faire',
		demonstration: 'Démonstration',
		algorithme: 'Algorithme'
	};

	// Helpers visuels — verdict BO formel uniquement (le badge FSRS dynamique
	// est affiché séparément via <CapacityFsrsBadge>).
	function pointBadgeVariant(p: NotionPointDetail): 'default' | 'outline' | 'destructive' {
		if (p.needs_remediation) return 'destructive';
		if (p.is_acquired) return 'default';
		return 'outline';
	}

	function pointBgClass(p: NotionPointDetail): string {
		if (p.needs_remediation)
			return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900';
		if (p.is_acquired)
			return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900';
		return 'bg-muted/30 border-muted';
	}

	function pointStatusLabel(p: NotionPointDetail): string {
		if (p.needs_remediation) return 'À remédier';
		if (p.is_acquired) return 'Acquis';
		return 'Non acquis';
	}
</script>

<svelte:head>
	<title>{data.name} | Ma progression | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<BackLink href={back.href} label={back.label} />

	<!-- Header -->
	<div class="mb-6">
		<div class="mb-1 text-sm text-muted-foreground">{data.branch_name}</div>
		<h1 class="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{data.name}</h1>
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
				<span class="text-2xl">{getNotionLevelVisual(level)}</span>
				<div>
					<div class="font-semibold">{formatNotionLevel(level)}</div>
					<div class="text-xs text-muted-foreground">
						{data.acquired_count}/{data.total_count} acquis
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
		{#each data.points as point (point.id)}
			<Card.Root class="relative {pointBgClass(point)}">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-muted-foreground">
							{KIND_LABELS[point.kind] ?? 'Savoir-faire'}
							{#if point.subnotionName}
								· {point.subnotionName}
							{/if}
						</span>
						<!-- Icône d'état BO formel -->
						<div>
							{#if point.needs_remediation}
								<LifeBuoy class="h-5 w-5 text-red-600" />
							{:else if point.is_acquired}
								<Check class="h-5 w-5 text-green-600" />
							{:else}
								<Circle class="h-5 w-5 text-muted-foreground" />
							{/if}
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<p class="text-sm leading-relaxed"><InlineMarkdown content={point.name} /></p>
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<!-- L'état peut exister sans modèle tagué (tag retiré depuis) : on le
							 montre toujours, l'absence d'entraînement en plus. -->
						{#if point.trainable || point.is_acquired || point.needs_remediation}
							<Badge variant={pointBadgeVariant(point)} class="text-xs">
								{pointStatusLabel(point)}
							</Badge>
						{/if}
						{#if point.trainable}
							<CapacityFsrsBadge badge={point.badge} showLabel />
						{:else}
							<Badge variant="outline" class="text-xs text-muted-foreground">
								Pas encore d'entraînement ici
							</Badge>
						{/if}
						{#if point.automatisme_grades.length > 0}
							<Badge
								variant="outline"
								class="text-xs"
								title="Au programme des automatismes — évalué à l'examen"
							>
								⚡ automatisme
							</Badge>
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
