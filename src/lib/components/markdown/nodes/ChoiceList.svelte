<!--
	ChoiceList — liste des choix A, B, C (QCM corrigé, case « choix », bloc seul)
	=============================================================================

	- `corrected` : choix du résultat attendu (statuts du QCM : coché juste, coché à
	  tort, bonne réponse oubliée, bonne réponse), indicateur ○ / ● ou ☐ / ☑ comme à
	  la saisie, statut en toutes lettres (jamais la couleur seule). Rendu repris de
	  `ExpectedResultView` (QCM), partagé avec la case choix corrigée à sa place.
	- sinon : liste A, B, C non cliquable (bloc ```choix hors question : cours,
	  aperçu).

	Choix en bloc (```horloge, ```collection, ```monnaie) : dessinés à la taille
	d'un choix de QCM (monnaie : même échelle pour tous).

	@module components/markdown/nodes/ChoiceList
-->
<script lang="ts">
	import { Circle, CircleDot, Square, SquareCheck } from '@lucide/svelte';
	import MarkdownRenderer from '../MarkdownRenderer.svelte';
	import InlineMarkdown from '../InlineMarkdown.svelte';
	import { monnaieChoiceSize } from '$lib/ubumark/utils/monnaie-choix';
	import { choiceLetter } from '$lib/questions/choices';
	import type { ExpectedStatus } from '$lib/questions/expected-result';

	interface Item {
		/** Markdown du choix */
		content: string;
		/** Corrigé seulement */
		status?: ExpectedStatus;
		checked?: boolean;
	}

	interface Props {
		items: readonly Item[];
		/** Plusieurs réponses : cases ☐ / ☑ ; sinon ronds ○ / ● */
		multiple?: boolean;
		/** Résultat attendu (statuts) ; sinon liste non cliquable */
		corrected?: boolean;
	}

	let { items, multiple = false, corrected = false }: Props = $props();

	const monnaieSize = $derived(monnaieChoiceSize(items.map((c) => c.content)));

	/** Choix qui est un bloc : InlineMarkdown n'en garderait que le texte brut */
	function isBlockChoice(content: string): boolean {
		return content.trimStart().startsWith('```');
	}

	/** Libellé d'un choix corrigé, selon son statut et s'il est coché */
	function choiceLabel(item: Item): string {
		if (item.status === 'correct') return 'coché, juste';
		if (item.status === 'incorrect') return 'coché à tort';
		if (item.status === 'unoptimal') return 'bonne réponse oubliée';
		if (item.status === 'solution') return 'bonne réponse';
		return item.checked ? 'coché' : '';
	}
</script>

{#snippet content(item: Item)}
	{#if isBlockChoice(item.content)}
		<div
			class="@container min-w-0 flex-1 [--collection-taille:3cm] [--horloge-taille:3cm]"
			style:--monnaie-taille={monnaieSize}
		>
			<MarkdownRenderer content={item.content} />
		</div>
	{:else}
		<span class="min-w-0 flex-1"><InlineMarkdown content={item.content} /></span>
	{/if}
{/snippet}

{#if corrected}
	<ul class="choice-list space-y-2" data-kind="choices">
		{#each items as item, position (position)}
			{@const tone = `tone-${item.status ?? 'neutral'}`}
			<li
				class="choice {tone}"
				class:choice-bloc={isBlockChoice(item.content)}
				data-status={item.status ?? 'neutral'}
			>
				<span class="font-semibold">{choiceLetter(position)}</span>
				<!-- Même indicateur que la saisie (Q109 a) : case si plusieurs réponses, rond sinon -->
				{#if multiple}
					{#if item.checked}
						<SquareCheck
							class="choice-box h-4 w-4"
							aria-hidden="true"
							data-indicator="square-check"
						/>
					{:else}
						<Square class="choice-box h-4 w-4" aria-hidden="true" data-indicator="square" />
					{/if}
				{:else if item.checked}
					<CircleDot class="choice-box h-4 w-4" aria-hidden="true" data-indicator="circle-dot" />
				{:else}
					<Circle class="choice-box h-4 w-4" aria-hidden="true" data-indicator="circle" />
				{/if}
				{@render content(item)}
				{#if choiceLabel(item)}
					<span class="status-tag {tone}">{choiceLabel(item)}</span>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<ol class="choice-list space-y-2" data-kind="choice-static">
		{#each items as item, position (position)}
			<li class="choice" class:choice-bloc={isBlockChoice(item.content)}>
				<span class="font-semibold" data-letter>{choiceLetter(position)}</span>
				{@render content(item)}
			</li>
		{/each}
	</ol>
{/if}

<style>
	/* Couleurs du résultat attendu (mêmes valeurs que `ExpectedResultView`) */
	.choice-list {
		--choice-correct: var(
			--expected-correct,
			light-dark(var(--color-green-700, #15803d), var(--color-green-400, #4ade80))
		);
		--choice-incorrect: var(
			--expected-incorrect,
			light-dark(var(--color-red-700, #b91c1c), var(--color-red-400, #f87171))
		);
		--choice-unoptimal: var(
			--expected-unoptimal,
			light-dark(var(--color-amber-700, #b45309), var(--color-amber-400, #fbbf24))
		);
		list-style: none;
		padding: 0;
		margin: 0.5rem 0;
	}

	.choice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.375rem 0.75rem;
		color: var(--color-foreground);
	}

	/* Choix dessiné (monnaie…) : l'étiquette passe dessous, pour que chaque ligne laisse au dessin
	   la même largeur (sinon « bonne réponse » rétrécit sa ligne et casse l'échelle commune) */
	.choice-bloc {
		flex-wrap: wrap;
	}

	.choice-bloc .status-tag {
		flex-basis: 100%;
	}

	.status-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.status-tag.tone-correct,
	.status-tag.tone-solution {
		color: var(--choice-correct);
	}

	.status-tag.tone-incorrect {
		color: var(--choice-incorrect);
	}

	.status-tag.tone-unoptimal {
		color: var(--choice-unoptimal);
	}

	.choice.tone-correct,
	.choice.tone-solution {
		border-color: var(--choice-correct);
	}

	.choice.tone-incorrect {
		border-color: var(--choice-incorrect);
	}

	.choice.tone-unoptimal {
		border-color: var(--choice-unoptimal);
		border-style: dashed;
	}

	:global(.choice-box) {
		flex-shrink: 0;
		color: var(--color-muted-foreground);
	}
</style>
