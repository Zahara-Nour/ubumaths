<!--
	Cadres de réponse d'un exercice de la fiche, en lignes (ADR 0030, lot 4)
	=======================================================================

	Sous l'exercice, seulement si la fiche a « réponses sur le sujet » : une
	ligne par question (« Question 1 [−] 3 lignes [+] auto »), ou une seule
	ligne « Cadre » en mode « après l'exercice » (ou énoncé sans question).
	« auto » : l'estimation d'après le corrigé de la version guidée (celle de
	l'aperçu PDF) ; « modifié ↺ » sinon, ↺ remet en auto ; 0 ligne = pas de cadre.

	Sauvegarde après chaque changement (regroupés par `saveDelayMs`, puis en
	série), optimiste : `onchange` part tout de suite, et revient à la dernière
	valeur enregistrée si la sauvegarde du dernier réglage échoue. Démonté avant
	le délai : la sauvegarde part aussitôt (`keepalive`).
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Minus, Plus, RotateCcw, TriangleAlert } from '@lucide/svelte';
	import {
		ANSWER_FRAME_MAX_LINES,
		type AnswerFrameLines,
		type AnswerFrameMode,
		type WorksheetExerciseWithExercise
	} from '$lib/types/worksheets';
	import type { ContentLocale } from '$lib/types/locale';
	import { estimateAnswerFrames } from '$lib/worksheets/document/answer-frames';
	import {
		answerFrameRows,
		setExerciseLines,
		setQuestionLines,
		toAnswerFrameLines
	} from '$lib/worksheets/document/answer-frame-lines';
	import { resolveWorksheetExerciseCopy } from '$lib/worksheets/worksheet-copy';
	import { DEFAULT_GUIDANCE_LEVEL } from '$lib/worksheets/student-copy';

	interface Props {
		worksheetId: string;
		exercise: WorksheetExerciseWithExercise;
		mode: AnswerFrameMode;
		language?: ContentLocale;
		readonly?: boolean;
		/** Délai avant sauvegarde : les clics rapprochés partent en une fois */
		saveDelayMs?: number;
		/** Nouvelle valeur de la colonne (optimiste, puis retour arrière si échec) */
		onchange?: (lines: AnswerFrameLines | null) => void;
	}

	let {
		worksheetId,
		exercise,
		mode,
		language = 'fr',
		readonly = false,
		saveDelayMs = 600,
		onchange
	}: Props = $props();

	// Réglage courant : la valeur de l'exercice, tenue à jour par le parent
	const chosen = $derived(toAnswerFrameLines(exercise.answer_frame_lines));

	// L'estimation de départ : la copie guidée hors affectation, comme l'aperçu PDF
	const estimate = $derived.by(() => {
		if (!exercise.exercise) return estimateAnswerFrames('', null);
		const copy = resolveWorksheetExerciseCopy(
			{
				id: exercise.id,
				variation_index: exercise.variation_index ?? null,
				exercise: exercise.exercise
			},
			{
				assignmentId: null,
				worksheetId,
				level: DEFAULT_GUIDANCE_LEVEL,
				individualized: false,
				locale: language
			}
		);
		return estimateAnswerFrames(copy.statement, copy.solution || null);
	});

	const view = $derived(answerFrameRows(estimate, chosen, mode));

	// Sauvegardes EN SÉRIE (revue) : une seule requête à la fois, chacune avec la
	// dernière valeur ; l'échec d'une ancienne n'efface pas un réglage plus récent.
	/** Dernière valeur sûre en base : le retour arrière si la sauvegarde échoue */
	let confirmed: AnswerFrameLines | null = null;
	/** Valeur à envoyer, et son numéro (chaque changement l'incrémente) */
	let latest: AnswerFrameLines | null = null;
	let generation = 0;
	/** Un changement pas encore confirmé (envoyé ou non) */
	let dirty = false;
	let inFlight = false;
	let queued = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function label(index: number): string {
		return view.kind === 'exercise' ? 'Cadre' : `Question ${index + 1}`;
	}

	function linesText(lines: number): string {
		if (lines === 0) return '0 ligne (pas de cadre)';
		return lines === 1 ? '1 ligne' : `${lines} lignes`;
	}

	function change(index: number, lines: number | null) {
		if (readonly) return;
		// Début d'une série de changements : la valeur affichée est celle en base
		// (elle a pu changer par un autre chemin depuis le montage)
		if (!dirty) confirmed = chosen;
		dirty = true;
		const next =
			view.kind === 'exercise'
				? setExerciseLines(chosen, lines)
				: setQuestionLines(chosen, view.rows.length, index, lines);
		latest = next;
		generation += 1;
		onchange?.(next);
		clearTimeout(timer);
		timer = setTimeout(() => flush(), saveDelayMs);
	}

	async function flush(keepalive = false) {
		timer = undefined;
		if (inFlight) {
			queued = true;
			return;
		}
		inFlight = true;
		const sent = latest;
		const sentGeneration = generation;
		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises/${exercise.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ answer_frame_lines: sent }),
				keepalive
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message || 'Cadres de réponse non enregistrés');
			}
			confirmed = sent;
			if (sentGeneration === generation) dirty = false;
		} catch (err) {
			// Un réglage plus récent attend : sa sauvegarde porte la valeur entière
			if (sentGeneration === generation) {
				dirty = false;
				onchange?.(confirmed);
				toaster.error(err instanceof Error ? err.message : 'Cadres de réponse non enregistrés');
			}
		} finally {
			inFlight = false;
			if (queued) {
				queued = false;
				void flush(keepalive);
			}
		}
	}

	// Démontage (exercice déplacé, option décochée, page quittée) : la sauvegarde
	// en attente part tout de suite au lieu d'être perdue
	onDestroy(() => {
		if (timer === undefined) return;
		clearTimeout(timer);
		void flush(true);
	});
</script>

<div class="mt-1 ml-8 rounded-md border border-dashed px-3 py-2 text-sm">
	<div class="mb-1 font-medium text-muted-foreground">Cadres de réponse</div>
	{#if view.outdated}
		<p class="mb-1 flex items-center gap-1 text-xs text-amber-600">
			<TriangleAlert class="h-3 w-3 shrink-0" />
			Les questions de l’exercice ont changé : cadres remis en automatique.
		</p>
	{/if}
	<ul class="space-y-1">
		{#each view.rows as row, index (index)}
			<li class="flex flex-wrap items-center gap-2" data-testid="cadre-ligne">
				<span class="w-24 shrink-0">{label(index)}</span>
				<Button
					variant="outline"
					size="icon"
					class="h-6 w-6"
					disabled={readonly || row.lines <= 0}
					onclick={() => change(index, row.lines - 1)}
					aria-label="Une ligne de moins, {label(index).toLowerCase()}"
				>
					<Minus class="h-3 w-3" />
				</Button>
				<span class="min-w-36 text-center tabular-nums">{linesText(row.lines)}</span>
				<Button
					variant="outline"
					size="icon"
					class="h-6 w-6"
					disabled={readonly || row.lines >= ANSWER_FRAME_MAX_LINES}
					onclick={() => change(index, row.lines + 1)}
					aria-label="Une ligne de plus, {label(index).toLowerCase()}"
				>
					<Plus class="h-3 w-3" />
				</Button>
				{#if row.auto}
					<span class="text-xs text-muted-foreground">auto</span>
				{:else}
					<span class="text-xs text-primary">modifié</span>
					<Button
						variant="ghost"
						size="icon"
						class="h-6 w-6"
						disabled={readonly}
						onclick={() => change(index, null)}
						aria-label="Remettre en automatique, {label(index).toLowerCase()}"
						title="Remettre en automatique"
					>
						<RotateCcw class="h-3 w-3" />
					</Button>
				{/if}
			</li>
		{/each}
	</ul>
</div>
