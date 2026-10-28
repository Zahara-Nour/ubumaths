<!--
	@component TemplateReviewSheet

	Fiche d'un modèle dans la revue `/dev/modeles` : en-tête toujours visible (titre, statut,
	verdict, alertes), corps dépliable (point et bornes, rangement, consigne, plages des variables,
	conditions, specs, aperçu de chaque variation) et verdict « validé / à revoir » + commentaire.
	Le verdict s'enregistre par l'action `?/saveReview` ; un échec se dit par un toast, et le
	verdict affiché ne change pas (il vient de la base, relue après chaque enregistrement).
-->
<script lang="ts">
	// Imports
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { QuestionTemplateRow } from '$lib/types/question-template';
	import { toQuestionTemplate } from '$lib/types/question-template';
	import type { SheetPoint, TemplateReview, Verdict } from '$lib/questions/template-review';
	import { VERDICT_LABELS } from '$lib/questions/template-review';
	import {
		QUESTION_TYPE_LABELS,
		getQuestionType,
		type ValidationStatus
	} from '$lib/questions/types';
	import VariationPreview from '$lib/components/dev/VariationPreview.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ChevronDown, ChevronRight, TriangleAlert } from '@lucide/svelte';

	// Types
	interface Props {
		row: QuestionTemplateRow;
		points: SheetPoint[];
		review: TemplateReview | null;
		alerts: string[];
		nodePath: string[];
		open?: boolean;
	}

	// Constantes
	const STATUS_LABELS: Record<ValidationStatus, string> = {
		correct: 'juste',
		incorrect: 'faux',
		unoptimal_form: 'forme à améliorer',
		bad_form: 'mauvaise forme',
		empty: 'vide'
	};

	// Variables
	let { row, points, review, alerts, nodePath, open = $bindable(false) }: Props = $props();

	const template = $derived(toQuestionTemplate(row));
	const typeLabel = $derived(QUESTION_TYPE_LABELS[getQuestionType(template)]);
	const pointAlerts = $derived(
		points.flatMap((p) => [
			...(p.missingBounds ? [`point ${p.code} absent des bornes`] : []),
			...(p.archived ? [`point ${p.code} archivé`] : [])
		])
	);
	const allAlerts = $derived([...alerts, ...pointAlerts]);
	const sharedVariables = $derived(template.shared?.variables ?? []);
	const sharedConditions = $derived(template.shared?.conditions ?? []);

	// Brouillon du verdict : modifiable, il repart de la base à chaque relecture de la fiche
	// Dérivé de valeurs simples : relire la page (verdict d'une AUTRE fiche) recrée l'objet `review`
	// sans changer ces valeurs, et ne doit pas effacer ce qui est en cours de saisie ici
	const savedVerdict = $derived<Verdict | null>(review?.verdict ?? null);
	const savedComment = $derived(review?.comment ?? '');
	let draftVerdict = $derived<Verdict | null>(savedVerdict);
	let draftComment = $derived(savedComment);
	let saving = $state(false);

	// Functions
	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	}

	const submitReview: SubmitFunction = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') {
				toaster.success(result.data?.deleted ? 'Verdict retiré' : 'Verdict enregistré');
				await update({ reset: false });
			} else if (result.type === 'failure') {
				const message = result.data?.message;
				toaster.error(typeof message === 'string' ? message : 'Verdict non enregistré');
				draftVerdict = review?.verdict ?? null;
			} else {
				toaster.error('Verdict non enregistré');
				draftVerdict = review?.verdict ?? null;
			}
		};
	};
</script>

<article class="rounded-lg border bg-card" id="modele-{row.id}">
	<button
		type="button"
		class="flex w-full items-start gap-2 p-3 text-left"
		aria-expanded={open}
		onclick={() => (open = !open)}
	>
		{#if open}
			<ChevronDown class="mt-1 h-4 w-4 shrink-0" />
		{:else}
			<ChevronRight class="mt-1 h-4 w-4 shrink-0" />
		{/if}
		<span class="min-w-0 flex-1 space-y-1">
			<span class="block font-semibold break-words">{row.title}</span>
			<span class="flex flex-wrap items-center gap-1.5 text-xs">
				<Badge variant={row.status === 'published' ? 'default' : 'outline'}>
					{row.status === 'published' ? 'Publié' : 'Brouillon'}
				</Badge>
				{#if review}
					<span class="verdict" data-verdict={review.verdict}>
						{VERDICT_LABELS[review.verdict]}
					</span>
				{:else}
					<span class="verdict" data-verdict="none">Sans verdict</span>
				{/if}
				<span class="text-muted-foreground">
					niveau {row.level} · {points.map((p) => p.code).join(', ') || 'sans point'} ·
					{template.variations.length} variation{template.variations.length > 1 ? 's' : ''}
				</span>
				{#if allAlerts.length > 0}
					<span class="inline-flex items-center gap-1 text-warning">
						<TriangleAlert class="h-3.5 w-3.5" />
						{allAlerts.length} alerte{allAlerts.length > 1 ? 's' : ''}
					</span>
				{/if}
			</span>
			{#if review?.comment && !open}
				<span class="block text-sm text-muted-foreground italic">« {review.comment} »</span>
			{/if}
		</span>
	</button>

	{#if open}
		<div class="space-y-4 border-t p-3">
			{#if allAlerts.length > 0}
				<ul class="space-y-1 rounded bg-warning/10 p-2 text-sm">
					{#each allAlerts as alert (alert)}
						<li>⚠ {alert}</li>
					{/each}
				</ul>
			{/if}

			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Id</dt>
				<dd class="font-mono text-xs break-all">
					{row.id} ·
					<a
						class="underline"
						href={resolve('/(protected)/dashboard/admin/questions/[id]/preview', { id: row.id })}
						>aperçu admin</a
					>
				</dd>
				<dt class="text-muted-foreground">Type</dt>
				<dd>{typeLabel}</dd>
				<dt class="text-muted-foreground">Niveaux</dt>
				<dd>{row.grades.join(', ') || '—'}</dd>
				<dt class="text-muted-foreground">Rangement</dt>
				<dd>{nodePath.join(' > ') || '—'}</dd>
				{#if row.description}
					<dt class="text-muted-foreground">Description</dt>
					<dd>{row.description}</dd>
				{/if}
				{#if row.exercise_instruction}
					<dt class="text-muted-foreground">Consigne</dt>
					<dd>{row.exercise_instruction}</dd>
				{/if}
				<dt class="text-muted-foreground">Modifié</dt>
				<dd>{row.updated_at ? formatDate(row.updated_at) : '—'}</dd>
			</dl>

			<section class="space-y-2">
				<div class="text-sm font-semibold" role="heading" aria-level="3">Point du programme</div>
				{#if points.length === 0}
					<p class="text-sm text-muted-foreground">Aucun point : modèle hors programme.</p>
				{/if}
				{#each points as point (point.code)}
					<div class="text-sm">
						<p><span class="font-mono">{point.code}</span> — {point.name}</p>
						{#if point.bounds.length > 0}
							<ul class="ml-4 list-disc text-muted-foreground">
								{#each point.bounds as bound, i (i)}
									<li>{bound}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/each}
			</section>

			<section class="space-y-2">
				<div class="text-sm font-semibold" role="heading" aria-level="3">Plages et conditions</div>
				<ul class="space-y-0.5 font-mono text-xs break-all">
					{#each sharedVariables as v (v.name)}
						<li>commun : {v.name} = {v.expression}</li>
					{/each}
					{#each sharedConditions as c, i (i)}
						<li>commun : si {c}</li>
					{/each}
					{#each template.variations as variation, vi (vi)}
						{#each variation.variables ?? [] as v (v.name)}
							<li>v{vi + 1} : {v.name} = {v.expression}</li>
						{/each}
						{#each variation.conditions ?? [] as c, ci (ci)}
							<li>v{vi + 1} : si {c}</li>
						{/each}
					{/each}
				</ul>
			</section>

			<section class="space-y-2">
				<div class="text-sm font-semibold" role="heading" aria-level="3">Specs de test</div>
				{#if (template.testSpecs ?? []).length === 0}
					<p class="text-sm text-muted-foreground">Aucune spec.</p>
				{:else}
					<ul class="space-y-0.5 text-sm">
						{#each template.testSpecs ?? [] as spec, i (i)}
							<li>
								{spec.description} :
								<code class="font-mono text-xs">{(spec.answers ?? []).join(' | ')}</code>
								→ <span class="font-semibold">{STATUS_LABELS[spec.expected.status]}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="space-y-3">
				<div class="text-sm font-semibold" role="heading" aria-level="3">Aperçu des variations</div>
				{#each template.variations as _variation, i (i)}
					<VariationPreview {template} variationIndex={i} />
				{/each}
			</section>

			<form
				method="POST"
				action="?/saveReview"
				use:enhance={submitReview}
				class="space-y-2 rounded-md border p-3"
			>
				<input type="hidden" name="templateId" value={row.id} />
				<input type="hidden" name="verdict" value={draftVerdict ?? ''} />
				<div class="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant={draftVerdict === 'valide' ? 'default' : 'outline'}
						aria-pressed={draftVerdict === 'valide'}
						onclick={() => (draftVerdict = 'valide')}>✅ Validé</Button
					>
					<Button
						type="button"
						variant={draftVerdict === 'a_revoir' ? 'default' : 'outline'}
						aria-pressed={draftVerdict === 'a_revoir'}
						onclick={() => (draftVerdict = 'a_revoir')}>🔶 À revoir</Button
					>
					{#if review}
						<span class="text-xs text-muted-foreground">
							verdict du {formatDate(review.reviewedAt)}
						</span>
					{/if}
				</div>
				<Textarea
					name="comment"
					bind:value={draftComment}
					maxlength={4000}
					rows={3}
					placeholder="Commentaire (ce qu'il faut modifier, ou rien)"
					aria-label="Commentaire du verdict"
				/>
				<div class="flex flex-wrap gap-2">
					<Button type="submit" disabled={saving || draftVerdict === null}>
						Enregistrer le verdict
					</Button>
					{#if review}
						<Button type="submit" variant="ghost" formaction="?/deleteReview" disabled={saving}
							>Retirer le verdict</Button
						>
					{/if}
				</div>
			</form>
		</div>
	{/if}
</article>

<style>
	.verdict {
		border-radius: 9999px;
		padding: 0.05rem 0.5rem;
		font-weight: 600;
		border: 1px solid var(--color-border);
	}
	.verdict[data-verdict='valide'] {
		background: color-mix(in oklab, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}
	.verdict[data-verdict='a_revoir'] {
		background: color-mix(in oklab, var(--color-warning) 15%, transparent);
		color: var(--color-warning);
	}
	.verdict[data-verdict='none'] {
		color: var(--color-muted-foreground);
	}
</style>
