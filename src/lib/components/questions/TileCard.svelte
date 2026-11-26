<script lang="ts">
	/**
	 * Flash-card d'une tuile (catalogue Automaths, Ma série), sous une ligne fine
	 *
	 * Phase 0 validée par David (2026-11-26, chantier `automaths`) : à gauche le
	 * badge des niveaux du modèle (« CM1–CM2 », « CM1 · 6e ») ; à droite
	 * « ‹ 2/5 › » quand le modèle a au moins deux variations. Les flèches
	 * changent seulement l'exemple affiché : rien ne change dans la série. Un
	 * exemple de variation est toujours le même (graine fixe, `variationExample`).
	 * Bouton de retournement plus petit dans les tuiles (32 px) ; la carte de
	 * l'élève garde le sien.
	 *
	 * PR A2 (phase 0 validée le 2026-11-26) : avec `onvariationschange` (prof,
	 * Ma série), les flèches parcourent TOUTES les variations, retirées
	 * comprises ; le numéro garde ou retire la variation affichée (vert / rouge
	 * barré, jamais la couleur seule) ; la dernière gardée ne se retire pas. Avec
	 * `onchoicechange`, case « En QCM » pour la variation affichée quand elle
	 * peut se poser en QCM. Remplace la fenêtre de `VariationPicker` dans Ma série.
	 *
	 * PR A3 (2026-11-26) : sous la ligne fine, « 2 variations sur 3 · 1 en QCM »
	 * (variations gardées en QCM seulement) ; chaque partie seulement si elle dit
	 * quelque chose.
	 */
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import { canBeChoice, mayBeChoice } from '#lib/questions/choice-from-errors.ts';
	import { allowedVariations, variationExample } from '#lib/questions/series-draw.ts';
	import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
	import { formatGradeBadge } from '#lib/utils/grade-badge.ts';
	import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';

	let {
		template,
		preview,
		variations,
		height,
		onvariationschange,
		choiceVariations,
		onchoicechange
	}: {
		template: QuestionTemplate;
		/** Exemple montré d'abord (aperçu du modèle ou de la ligne de série) */
		preview: QuestionInstance;
		/** Variations permises (choix du prof dans Ma série) ; absent = toutes */
		variations?: readonly number[];
		height: string;
		/** Choix des variations sur la carte (prof) ; `undefined` = toutes. Absent : flèches seules */
		onvariationschange?: (variations: number[] | undefined) => void;
		/** Variations en QCM ; absent = aucune */
		choiceVariations?: readonly number[];
		/** Nouvelles variations en QCM ; `undefined` = aucune. Absent : pas de case « En QCM » */
		onchoicechange?: (choiceVariations: number[] | undefined) => void;
	} = $props();

	// Variation choisie aux flèches ; null = celle de l'aperçu
	let chosen = $state<number | null>(null);

	let gradeBadge = $derived(formatGradeBadge(template.grades ?? []));
	let editable = $derived(onvariationschange !== undefined);
	let count = $derived(template.variations?.length ?? 0);
	let kept = $derived(allowedVariations(template, variations));
	// Prof : toutes les variations défilent (sinon une variation retirée ne se remet plus)
	let list = $derived(editable ? Array.from({ length: count }, (_, index) => index) : kept);
	// Aperçu d'une variation que le prof n'a pas gardée → première variation gardée
	let previewIndex = $derived(
		preview.selectedVariationIndex !== undefined && kept.includes(preview.selectedVariationIndex)
			? preview.selectedVariationIndex
			: kept[0]
	);
	// Choix qui n'est plus permis (variations changées) → retour à l'aperçu
	let current = $derived(chosen !== null && list.includes(chosen) ? chosen : previewIndex);
	let position = $derived(Math.max(0, list.indexOf(current)));
	let shown = $derived(
		current === preview.selectedVariationIndex
			? preview
			: variationExample(template, current, generateInstance)
	);

	let isKept = $derived(kept.includes(current));
	let isLastKept = $derived(isKept && kept.length === 1);
	let numberTitle = $derived(
		isLastKept
			? 'Seule variation gardée : la dernière ne se retire pas'
			: isKept
				? 'Retirer cette variation de la série'
				: 'Remettre cette variation'
	);
	// Commence par le texte visible « 2/3 » (WCAG 2.5.3) ; la raison du refus aussi
	// au clavier et au tactile, où l'infobulle ne se voit pas
	let numberLabel = $derived(
		`${position + 1}/${list.length}, ${isKept ? 'gardée' : 'retirée'}` +
			(isLastKept ? ', seule variation gardée : ne se retire pas' : '')
	);
	// Variation affichée qui se pose VRAIMENT en QCM : l'exemple à graine fixe tranche
	// (comme l'ancienne fenêtre de choix), calculé pour la seule variation affichée
	let choosable = $derived.by(() => {
		const variation = template.variations?.[current];
		if (!onchoicechange || !variation || !mayBeChoice(variation)) return false;
		const example = variationExample(template, current, generateInstance);
		return example !== null && canBeChoice(example);
	});
	// En QCM et encore gardées (une variation retirée ne compte plus)
	let inChoice = $derived((choiceVariations ?? []).filter((index) => kept.includes(index)));
	// Ligne sous la carte (prof) : « 2 variations sur 3 · 1 en QCM » ; chaque partie
	// seulement quand elle dit quelque chose (PR A3, décision de David du 2026-11-26)
	let summary = $derived(
		[
			kept.length < count
				? `${kept.length} variation${kept.length > 1 ? 's' : ''} sur ${count}`
				: '',
			inChoice.length > 0 ? `${inChoice.length} en QCM` : ''
		]
			.filter(Boolean)
			.join(' · ')
	);

	function toggleKept() {
		if (!onvariationschange || isLastKept) return;
		// La carte reste sur la variation retirée (sinon elle retombe sur la première gardée)
		chosen = current;
		const next = isKept
			? kept.filter((index) => index !== current)
			: [...kept, current].sort((a, b) => a - b);
		// Variation retirée : son QCM part avec elle
		if (isKept && choiceVariations?.includes(current)) {
			const rest = inChoice.filter((index) => index !== current);
			onchoicechange?.(rest.length > 0 ? rest : undefined);
		}
		onvariationschange(next.length === count ? undefined : next);
	}

	function toggleChoice(checked: boolean) {
		const next = checked
			? [...inChoice, current].sort((a, b) => a - b)
			: inChoice.filter((index) => index !== current);
		onchoicechange?.(next.length > 0 ? next : undefined);
	}

	function step(delta: number) {
		chosen = list[(position + delta + list.length) % list.length];
	}
</script>

<div class="flex flex-col gap-1">
	<div
		class="flex min-h-6 flex-wrap items-center justify-between gap-x-2 text-xs text-muted-foreground"
	>
		<span title="Niveaux" data-tile-grades>{gradeBadge}</span>
		<div class="ml-auto flex items-center gap-3">
			{#if choosable}
				<MyCheckbox
					checked={inChoice.includes(current)}
					disabled={!isKept}
					label="En QCM"
					aria-label="Variation {current + 1} en QCM"
					labelClass="text-xs font-normal"
					onchange={toggleChoice}
				/>
			{/if}
			{#if list.length >= 2}
				<div class="flex items-center" data-tile-variations>
					<button
						type="button"
						class="variation-arrow"
						onclick={() => step(-1)}
						aria-label="Variation précédente"
					>
						<ChevronLeft class="h-4 w-4" aria-hidden="true" />
					</button>
					{#if editable}
						<button
							type="button"
							class="variation-number tabular-nums {isKept
								? 'text-green-700 dark:text-green-400'
								: 'text-red-700 line-through dark:text-red-400'}"
							aria-label={numberLabel}
							aria-disabled={isLastKept ? 'true' : undefined}
							title={numberTitle}
							onclick={toggleKept}
							data-variation-number
						>
							{position + 1}/{list.length}
						</button>
						<!-- Annonce du changement aux flèches (le focus reste sur la flèche) -->
						<span class="sr-only" aria-live="polite">
							Variation {position + 1}, {isKept ? 'gardée' : 'retirée'}
						</span>
					{:else}
						<span class="tabular-nums" aria-live="polite">
							<span class="sr-only">Variation </span>{position + 1}/{list.length}
						</span>
					{/if}
					<button
						type="button"
						class="variation-arrow"
						onclick={() => step(1)}
						aria-label="Variation suivante"
					>
						<ChevronRight class="h-4 w-4" aria-hidden="true" />
					</button>
				</div>
			{/if}
		</div>
	</div>
	{#if editable && summary}
		<div class="text-right text-xs text-muted-foreground" data-variations-gardees>
			{summary}
		</div>
	{/if}

	{#if shown}
		<FlashCard instance={shown} interactive={false} size="sm" {height} compactFlip />
	{:else}
		<div
			class="rounded-xl border p-6 text-center text-sm text-muted-foreground italic"
			role="status"
		>
			Aperçu indisponible
		</div>
	{/if}
</div>

<style>
	.variation-arrow {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		color: inherit;
	}

	/* Zone de clic de 40 px (au doigt) sans grossir la ligne fine */
	.variation-arrow::before {
		content: '';
		position: absolute;
		inset: -0.5rem;
	}

	.variation-number {
		position: relative;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		font-weight: 600;
	}

	.variation-number::before {
		content: '';
		position: absolute;
		inset: -0.5rem 0;
	}

	.variation-number:not([aria-disabled='true']):hover {
		background: var(--color-muted);
	}

	.variation-number[aria-disabled='true'] {
		cursor: not-allowed;
	}

	.variation-number:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}

	.variation-arrow:hover {
		background: var(--color-muted);
		color: var(--color-foreground);
	}

	.variation-arrow:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}
</style>
