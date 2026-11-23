<!--
	@component ReviewVerdictForm

	Verdict « validé / à revoir » + commentaire d'un modèle, dans la revue `/dev/modeles` (fiche
	et parcours d'une série). S'enregistre par l'action `?/saveReview` ; un échec se dit par un
	toast, et le verdict affiché ne change pas (il vient de la base, relue après chaque
	enregistrement).
-->
<script lang="ts">
	// Imports
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import type { TemplateReview, Verdict } from '#lib/questions/template-review.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';

	// Types
	interface Props {
		templateId: string;
		review: TemplateReview | null;
		/** Moins de place : commentaire sur 2 lignes, boutons petits */
		compact?: boolean;
	}

	// Variables
	let { templateId, review, compact = false }: Props = $props();

	// Brouillon du verdict : modifiable, il repart de la base à chaque relecture de la fiche
	// Dérivé de valeurs simples : relire la page (verdict d'une AUTRE fiche) recrée l'objet `review`
	// sans changer ces valeurs, et ne doit pas effacer ce qui est en cours de saisie ici
	const savedVerdict = $derived<Verdict | null>(review?.verdict ?? null);
	const savedComment = $derived(review?.comment ?? '');
	let draftVerdict = $derived<Verdict | null>(savedVerdict);
	let draftComment = $derived(savedComment);
	let saving = $state(false);

	const size = $derived(compact ? 'sm' : 'default');

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
				// `navigate: false` : depuis SvelteKit 3, `update()` va par défaut à l'adresse de
				// l'action (`?/saveReview`), qui perd la recherche de la page (`?serie=…`, `?noeud=…`)
				await update({ reset: false, navigate: false });
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

<form
	method="POST"
	action="?/saveReview"
	use:enhance={submitReview}
	class={compact ? 'space-y-2' : 'space-y-2 rounded-md border p-3'}
>
	<input type="hidden" name="templateId" value={templateId} />
	<input type="hidden" name="verdict" value={draftVerdict ?? ''} />
	<div class="flex flex-wrap items-center gap-2">
		<Button
			type="button"
			{size}
			variant={draftVerdict === 'valide' ? 'default' : 'outline'}
			aria-pressed={draftVerdict === 'valide'}
			onclick={() => (draftVerdict = 'valide')}>✅ Validé</Button
		>
		<Button
			type="button"
			{size}
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
		rows={compact ? 2 : 3}
		placeholder={compact
			? 'Commentaire (à scinder, en trop, à déplacer…)'
			: "Commentaire (ce qu'il faut modifier, ou rien)"}
		aria-label="Commentaire du verdict"
	/>
	<div class="flex flex-wrap gap-2">
		<Button type="submit" {size} disabled={saving || draftVerdict === null}>
			Enregistrer le verdict
		</Button>
		{#if review}
			<Button type="submit" {size} variant="ghost" formaction="?/deleteReview" disabled={saving}
				>Retirer le verdict</Button
			>
		{/if}
	</div>
</form>
