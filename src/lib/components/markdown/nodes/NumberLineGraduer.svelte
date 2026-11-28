<!--
	NumberLineGraduer — droite à graduer (```line + `graduer:`)
	============================================================

	L'élève partage lui-même chaque intervalle de `step` en parts égales (outil
	n° 61, `docs/wip/outil-graduer-segment-progress.md`) :

	- Sous la droite : « Parts dans une unité : − 1 + » (1 au départ, de 1 à 12).
	  L'écran coupe chaque intervalle de `step` en autant de parts égales ; les
	  nombres écrits restent ceux de `step`.
	- Points de `placer:` (facultatif) : le geste de `NumberLinePlacer`, sur les
	  graduations de l'élève (une part : 0, 1, 2 seulement). Changer le nombre de
	  parts retire les points posés, à reposer.
	- Dans une question (`answers`) : case 0 = le nombre de parts (`3`), case 1 + k =
	  le point k (sa valeur, `\frac{5}{3}`). Faux : « Tu as partagé l'unité en 4
	  parts ; il en fallait 3. », « Tu as placé A sur 4/3. », « Tu n'as pas placé A. »
	  et la droite juste à côté (d parts, points en vert).
	- Le nombre de parts attendu n'est JAMAIS affiché ni dit avant la correction ;
	  masqué (`graduer: ?`), le geste marche sans lui.

	@module components/markdown/nodes/NumberLineGraduer
-->
<script lang="ts">
	import type { NumberLineNode, NumberLineTarget } from '#lib/ubumark/types/number-line.ts';
	import { phoneGapWarning } from '#lib/ubumark/utils/number-line-render.ts';
	import { indexOfAnswer, placerText } from '#lib/ubumark/utils/number-line-placer.ts';
	import {
		graduerConfig,
		graduerSolutionNode,
		MAX_PARTS,
		MIN_PARTS,
		partsAnswer,
		partsMistake,
		partsOfAnswer
	} from '#lib/ubumark/utils/number-line-graduer.ts';
	import NumberLine from './NumberLine.svelte';
	import NumberLinePlacer from './NumberLinePlacer.svelte';
	import { readAuthoringAdvice, readAuthoringErrors } from '../authoring-errors';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		/** Droite à graduer (`graduer:` défini) */
		node: NumberLineNode;
		/** Case des parts, puis une case par point de `placer:` */
		answers?: BuildCase[];
		/** Avertissements d'auteur (par défaut : contexte d'édition) ; la correction n'en montre pas */
		showErrors?: boolean;
		/** false : droite seule, nombre de parts écrit, sans boutons (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showErrors, showControls = true, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());
	/** Conseil « téléphone » : pas dans les onglets qui imitent l'élève (aperçu prof) */
	const advice = readAuthoringAdvice();

	let targets = $derived<NumberLineTarget[]>(node.placer ?? []);
	let expected = $derived(node.graduer?.parts ?? null);
	let locked = $derived(answers?.some((a) => a.disabled) ?? false);

	/**
	 * Parts choisies par l'élève : relues de la case (composant remonté, copie),
	 * réassignées à chaque geste (dérivé modifiable)
	 */
	let parts = $derived(partsOfAnswer(answers?.[0]?.value ?? '') ?? MIN_PARTS);
	/** Réponses des points, gardées ici pour les retirer quand le partage change */
	let pointValues = $derived(targets.map((_, k) => answers?.[k + 1]?.value ?? ''));

	/** La droite de l'élève : ses parts, sans `graduer:` */
	let studentConfig = $derived(graduerConfig(node.config, parts));
	let studentNode = $derived<NumberLineNode>({
		...node,
		config: studentConfig,
		graduer: undefined,
		placer: targets.length > 0 ? targets : undefined,
		caseIndex: undefined
	});

	/** Cases du geste des points : jamais jugées par lui (la correction est ici) */
	let pointCases = $derived<BuildCase[]>(
		targets.map((_, k) => ({
			value: pointValues[k] ?? '',
			isCorrect: null,
			disabled: locked,
			onChange: (value: string) => {
				pointValues = pointValues.with(k, value);
				answers?.[k + 1]?.onChange(value);
			}
		}))
	);

	/** Prof : graduations de la droite juste trop serrées pour le doigt sur un téléphone */
	let phoneWarning = $derived(
		expected === null || targets.length === 0
			? null
			: phoneGapWarning(graduerConfig(node.config, expected))
	);

	let verdict = $derived.by<boolean | null>(() => {
		if (!answers || answers.length === 0) return null;
		if (answers.some((a) => a.isCorrect === false)) return false;
		return answers.every((a) => a.isCorrect === true) ? true : null;
	});

	/** Nom d'un point dans les phrases : « le point », ou « A » */
	function pointName(i: number): string {
		return targets[i]?.name || 'le point';
	}

	/** Phrases de la correction : les parts, puis une par point faux */
	let mistakes = $derived.by(() => {
		const sentences: string[] = [];
		if (answers?.[0]?.isCorrect === false) {
			sentences.push(partsMistake(partsOfAnswer(answers[0].value), expected));
		}
		targets.forEach((target, i) => {
			if (answers?.[i + 1]?.isCorrect !== false) return;
			const k = indexOfAnswer(studentConfig, pointValues[i] ?? '');
			if (targets.length === 1 && !target.name) {
				sentences.push(
					k === null
						? 'Tu n’as rien placé.'
						: `Tu as placé le point sur ${placerText(studentConfig, k)}.`
				);
				return;
			}
			sentences.push(
				k === null
					? `Tu n’as pas placé ${pointName(i)}.`
					: `Tu as placé ${pointName(i)} sur ${placerText(studentConfig, k)}.`
			);
		});
		return sentences;
	});

	let solution = $derived(graduerSolutionNode(node));

	/** Nouveau partage : la case des parts, et les points posés retirés */
	function setParts(next: number) {
		if (locked) return;
		const clamped = Math.max(MIN_PARTS, Math.min(MAX_PARTS, next));
		if (clamped === parts) return;
		parts = clamped;
		answers?.[0]?.onChange(partsAnswer(clamped));
		pointValues.forEach((value, k) => {
			if (value !== '') answers?.[k + 1]?.onChange('');
		});
		pointValues = targets.map(() => '');
	}
</script>

<div class="graduer-bloc my-2 flex flex-col items-center gap-1 {className}">
	<div
		class="graduer-droite w-full rounded-md border"
		class:graduer-juste={verdict === true}
		class:graduer-faux={verdict === false}
	>
		{#if targets.length > 0}
			{#key parts}
				<NumberLinePlacer
					node={studentNode}
					answers={pointCases}
					showErrors={false}
					{showControls}
				/>
			{/key}
		{:else}
			<NumberLine node={studentNode} showErrors={false} />
		{/if}
	</div>

	{#if showControls}
		<div
			class="flex items-center justify-center gap-2"
			role="group"
			aria-label="Parts dans une unité"
		>
			<span class="text-sm">Parts dans une unité :</span>
			<button
				type="button"
				class="graduer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Une part de moins"
				disabled={locked || parts <= MIN_PARTS}
				onclick={() => setParts(parts - 1)}
			>
				<span aria-hidden="true">−</span>
			</button>
			<span class="graduer-parts min-w-6 text-center font-semibold" aria-live="polite">{parts}</span
			>
			<button
				type="button"
				class="graduer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
				aria-label="Une part de plus"
				data-graduer-focus
				disabled={locked || parts >= MAX_PARTS}
				onclick={() => setParts(parts + 1)}
			>
				<span aria-hidden="true">+</span>
			</button>
		</div>
	{:else}
		<p class="text-sm">Parts dans une unité : <span class="graduer-parts">{parts}</span></p>
	{/if}

	{#if errorsVisible && advice() && phoneWarning !== null}
		<ul class="nl-warnings w-full text-xs text-warning">
			<li>Droite graduée — {phoneWarning}</li>
		</ul>
	{/if}

	{#if verdict !== null}
		<p class="sr-only" role="status">
			{verdict ? 'réponse juste' : 'réponse fausse'}
		</p>
	{/if}

	{#if verdict === false}
		{#each mistakes as mistake (mistake)}
			<p class="text-sm">{mistake}</p>
		{/each}
		{#if solution}
			<div class="graduer-correction flex w-full flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<NumberLine node={solution} showErrors={false} pointsOnLine />
			</div>
		{/if}
	{/if}
</div>

<style>
	.graduer-droite {
		border-color: transparent;
	}

	.graduer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.graduer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}
</style>
