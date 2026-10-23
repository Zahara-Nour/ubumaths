<!--
	Fiche du modèle
	===============

	En tête de l'aperçu d'un modèle (`variant="full"`) : statut, type, classes, chemin dans
	l'arbre des notions, points du programme, réglages de validation, lien vers l'édition.
	En tête de l'éditeur (`variant="compact"`) : sans les points ni les réglages, qui s'éditent
	plus bas, et avec un lien vers l'aperçu.

	Une lecture en échec affiche son message, jamais « aucun » point.
-->

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { TemplateFactSheetResult } from '$lib/questions/template-fact-sheet';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Eye, Pencil, TriangleAlert } from '@lucide/svelte';

	interface Props {
		result: TemplateFactSheetResult;
		templateId: string;
		variant?: 'full' | 'compact';
	}

	let { result, templateId, variant = 'full' }: Props = $props();

	const full = $derived(variant === 'full');
</script>

<Card.Root>
	{#if !result.ok}
		<Card.Content class="flex items-start gap-2 py-4 text-sm text-destructive">
			<TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
			<p>Fiche illisible : {result.message}</p>
		</Card.Content>
	{:else}
		{@const sheet = result.sheet}
		<Card.Header>
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div class="space-y-1">
					<Card.Title>{sheet.title}</Card.Title>
					<div class="flex flex-wrap items-center gap-1.5">
						<Badge variant={sheet.published ? 'default' : 'secondary'}>{sheet.statusLabel}</Badge>
						{#if full}
							<Badge variant="outline">{sheet.typeLabel}</Badge>
							{#if sheet.courseQuestion}
								<Badge variant="outline">Question de cours</Badge>
							{/if}
						{/if}
						{#each sheet.grades as grade (grade)}
							<Badge variant="outline">{grade}</Badge>
						{/each}
					</div>
				</div>
				{#if full}
					<a
						href={resolve('/(protected)/dashboard/admin/questions/[id]/edit', { id: templateId })}
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						<Pencil class="h-4 w-4" />
						Modifier le modèle
					</a>
				{:else}
					<a
						href={resolve('/(protected)/dashboard/admin/questions/[id]/preview', {
							id: templateId
						})}
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						<Eye class="h-4 w-4" />
						Aperçu du modèle
					</a>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
				<dt class="text-muted-foreground">Arbre des notions</dt>
				<dd>
					{#if sheet.path === null}
						<span class="text-destructive">non rangé dans l’arbre</span>
					{:else}
						{#each sheet.path as node, index (index)}
							{#if index > 0}<span class="text-muted-foreground">&nbsp;›&#32;</span>{/if}
							<span class={node.archived ? 'text-destructive' : ''}
								>{node.name}{node.archived ? ' (archivé)' : ''}</span
							>
						{/each}
					{/if}
				</dd>

				{#if full}
					<dt class="text-muted-foreground">Points du programme</dt>
					<dd>
						{#if sheet.points.state === 'tagged'}
							<ul class="space-y-1">
								{#each sheet.points.points as point (point.code)}
									<li>
										<span class="text-muted-foreground">{point.grade}</span>
										<code class="font-mono text-xs">{point.code}</code>
										{point.name}
										{#if point.archived}<span class="text-destructive">(archivé)</span>{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<span data-testid="fact-sheet-no-point" class="font-semibold text-destructive"
								>aucun</span
							>
							<span class="text-muted-foreground">
								—
								{#if sheet.points.state === 'unranked'}
									modèle à ranger d’abord dans l’arbre.
								{:else if sheet.points.availableCount > 0}
									{sheet.points.availableCount}
									{sheet.points.availableCount > 1 ? 'points possibles' : 'point possible'} sur ce nœud,
									à poser dans l’éditeur.
								{:else if sheet.points.fromGrade}
									Aucun point de {sheet.points.fromGrade} ou d’une classe suivante sur ce nœud ni sur
									sa notion.
								{:else}
									Aucun point du programme sur ce nœud ni sur sa notion.
								{/if}
							</span>
						{/if}
					</dd>

					<dt class="text-muted-foreground">Réglages de validation</dt>
					<dd>
						{#if sheet.settings.length === 0}
							<span class="text-muted-foreground">réglages par défaut</span>
						{:else}
							<ul class="space-y-0.5">
								{#each sheet.settings as setting (setting)}
									<li>{setting}</li>
								{/each}
							</ul>
						{/if}
					</dd>
				{/if}
			</dl>
		</Card.Content>
	{/if}
</Card.Root>
