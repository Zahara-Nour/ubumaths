/**
 * Atelier — le pupitre de la vue Calcul
 *
 * Il tient ce que l'élève a écrit, ce que l'atelier a répondu, et le lien entre
 * le **panneau** et l'**historique** : une action cliquée sur un objet doit
 * produire une ligne, pas rien.
 *
 * ⚠️ Ce module existe à cause d'un défaut trouvé en revue. Le lot avait libéré
 * « Dériver », « Résoudre », « Variations » et « Image d'un nombre » dans le
 * panneau — les rendant actives — mais **aucun composant n'appelait
 * `runAction`**. L'élève cliquait et rien n'arrivait : ni résultat, ni message,
 * alors que le lot précédent affichait au moins « prochain lot ». Une action
 * visible qui ne répond pas est pire qu'une action désactivée qui s'explique.
 *
 * @module atelier/desk
 */

import type { Atelier, MovedStep, Refused, RemovedWithDependents } from './atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import {
	runInput,
	runAction,
	isExportCommand,
	runReciprocal,
	promote,
	derivativeNote,
	type Alternative,
	type CalcResult,
	type CalcSession
} from './calcul';
import { summarizeList, summarizeTable } from '$lib/statistics/describe';
import { formatLawIndicators, formatStatNumber, formatSummary } from '$lib/statistics/format';
import { categoryCounts } from './chart';
import { randomVariable } from '$lib/statistics/random-variable';
import { fitAffine } from '$lib/statistics/fit';
import { bivariateFit, type BivariateFit } from '$lib/statistics/bivariate';
import { roundFraction } from '$lib/statistics/rounding';
import type { Fraction } from '$lib/statistics/fraction';
import {
	affineExpression,
	exactCorrelationText,
	scatterNumber,
	shortestDecimal
} from '$lib/ubumark/utils/scatter-lines';
import { STAT_TEXT } from '$lib/ubumark/utils/stat-chart-text';
import { syncPlots } from './plot-sync';
import { removedLine, restoredLine } from './removal';
import { stepOf, type ImportedHistory } from './history-import';
import type { KeptHistory } from './history-storage';
import {
	NOTHING_TO_EXPORT,
	downloadHistory,
	exportFileName,
	type ExportFormat
} from './history-export';
import { termsOf } from './engine';
import { isFunction, isList, isQualitative, type AtelierObject, type ListObject } from './types';
import { wordsReason } from './actions';
import { lawFractions } from './simulate';
import { nextName, displayName } from './names';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';
import { commonRows, droppedNote, noCommonRowsMessage, valuesOn } from './pairs';

// =============================================================================
// Types
// =============================================================================

/** Une ligne d'historique, telle que l'écran la montre. */
export interface Entry {
	readonly id: number;
	/** Ce qui a produit cette ligne : la saisie, ou le nom de l'action. */
	readonly label: string;
	/**
	 * La saisie telle qu'ÉCRITE dans le champ « Écriture mathématique », en
	 * LaTeX : la ligne la montre à la place de `label`, qui reste le texte
	 * envoyé au moteur (`.dériver x^3`) — celui de l'export et du rejeu.
	 * Affichage seul.
	 */
	readonly inputLatex?: string;
	/** Ce qu'on affiche en toutes lettres. */
	readonly text: string;
	/** Le rendu mathématique, quand il y en a un de sûr. */
	readonly latex?: string;
	/** La ligne dit-elle un échec ? Elle reste affichée, en rouge. */
	readonly failed: boolean;
	/**
	 * Les étapes de résolution, quand `.résoudre` a su les produire.
	 *
	 * Elles se déplient sous la réponse (décision Q1) : l'historique reste
	 * dense, le raisonnement est là quand l'élève le demande.
	 */
	readonly steps?: readonly RenderedStep[];
	/**
	 * Les mêmes étapes en version résumée, pour l'interrupteur « Résumé /
	 * Détaillé » du dépliage. Absente = pas d'interrupteur : le résumé ne dirait
	 * rien de moins, ou la ligne n'en a pas (`.variations`).
	 */
	readonly summary?: readonly RenderedStep[];
	/**
	 * Le tableau de variations, quand l'action ou `.variations` en a produit un.
	 *
	 * Il se dessine sous la ligne — le moteur, lui, n'en rendait qu'une
	 * description en texte de terminal.
	 */
	readonly table?: VariationTableNode;
	/** Le graphique d'une simulation (`.fréquence`, `.échantillons`, Q80) */
	readonly chart?: StatChartScene;
	/**
	 * Une indication montrée avec la réponse, même composée en mathématiques
	 * (`.dériver t^2` : « Calcul par rapport à x… »).
	 */
	readonly note?: string;
	/**
	 * L'autre écriture de la réponse (valeur approchée ou exacte), montrée par
	 * le bouton de la ligne. Affichage seul : l'export et le rejeu l'ignorent.
	 */
	readonly alternative?: Alternative;
	/**
	 * Le texte d'un refus cite des formules en `$…$` (réciproques par morceau,
	 * lot 3 de la réciproque) : la vue les compose en mathématiques.
	 */
	readonly formulas?: true;
	/** Présent seulement pour une saisie : c'est ce que « Garder » consomme. */
	readonly result?: CalcResult;
	/**
	 * Le geste qui a produit la ligne, pour l'export et le rejeu (lot C).
	 * Absent d'une ligne secondaire : un geste n'est rejoué qu'une fois.
	 */
	readonly replay?: ReplayStep;
	/**
	 * L'étape d'Annuler / Rétablir que cette ligne a produite (lot 5, PR 2) :
	 * Annuler la barre, Rétablir la débarre. Absente d'une ligne qui n'a rien
	 * changé (un calcul). Jamais rangée : la pile ne survit pas au rechargement.
	 */
	readonly stepId?: number;
	/** L'étape de la ligne est annulée : la ligne est barrée (décision de David). */
	readonly undone?: true;
}

/**
 * Un geste rejouable : ce que l'élève a tapé, cliqué sur une carte, ou gardé.
 * Le rejeu le refait par le MÊME chemin (`submit`, `runFromPanel`, `image`,
 * `keep`) — rien n'est injecté dans l'atelier.
 */
export type ReplayStep =
	| { readonly kind: 'saisie'; readonly input: string }
	| {
			readonly kind: 'action';
			readonly action: string;
			readonly name: string;
			readonly value?: string;
	  }
	/** Supprimer un objet et ses dépendants (lot B) */
	| { readonly kind: 'supprimer'; readonly name: string }
	/**
	 * Annuler la dernière étape (lot 5, PR 2). Dans un fichier d'avant, il suit
	 * toujours la suppression qu'il défait : c'était alors la dernière étape.
	 */
	| { readonly kind: 'annuler' }
	/** Rétablir la dernière étape annulée (lot 5, PR 2) */
	| { readonly kind: 'rétablir' }
	/** `line` : l'indice, dans l'historique, de la ligne gardée */
	| { readonly kind: 'garder'; readonly line: number };

/** Ce qu'un rejeu a donné : tout, ou l'arrêt à une ligne (R3). */
export type ReplayReport =
	| { readonly ok: true; readonly replayed: number }
	| {
			readonly ok: false;
			readonly replayed: number;
			/** Le numéro (à partir de 1) de la ligne du fichier où le rejeu s'est arrêté */
			readonly line: number;
			readonly message: string;
	  };

/** Ce qu'une action venue du panneau a donné. */
export type PanelOutcome = 'ok' | 'needs-argument' | 'unsupported';

/** Décimales de l'ajustement, comme un bloc ```nuage par défaut (Q173) */
const FIT_PLACES = 3;

/**
 * La droite des moindres carrés EXACTE (`statistics/bivariate`, comme le bloc
 * ```nuage et `.ajustement`) des `used` premières paires, comme `fitAffine`.
 */
function exactFitOf(xs: readonly number[], ys: readonly number[], used: number): BivariateFit {
	const exact = (values: readonly number[]) => values.slice(0, used).map(shortestDecimal);
	// `fitAffine` a déjà refusé des abscisses toutes égales
	return bivariateFit(exact(xs), exact(ys))!;
}

/** Un coefficient arrondi une fois, point décimal, sans zéros inutiles ni groupement */
function fitCoefficient(value: Fraction): string {
	const { digits, exact } = roundFraction(value, FIT_PLACES);
	return exact && digits.includes('.') ? digits.replace(/\.?0+$/, '') : digits;
}

/**
 * La définition de la fonction créée, `1.001*x+1.003` : les MÊMES arrondis que
 * l'équation affichée (revue : `toFixed(3)` sur des flottants traçait `1*x`
 * sous un texte `1,001x`).
 */
function fitDefinition(fit: BivariateFit): string {
	const b = fitCoefficient(fit.intercept);
	const constant = /^-?0$/.test(b) ? '' : b.startsWith('-') ? b : `+${b}`;
	return `${fitCoefficient(fit.slope)}*x${constant}`;
}

/**
 * « f(x) = 3,686x + 7,933 — G(3,5 ; 20,833) — r ≈ 0,998 » : mêmes textes que
 * le bloc ```nuage et `.ajustement` (PR c, Q173 : r au lieu de R², point moyen).
 */
function fitSummary(functionName: string, fit: BivariateFit): string {
	const text = STAT_TEXT.fr.scatter;
	const round = (value: Fraction) => scatterNumber(value, FIT_PLACES, 'fr');
	const line = affineExpression(round(fit.slope).text, round(fit.intercept).text, 'x');
	const parts = [
		`${functionName}(x) = ${line}`,
		text.meanPoint(round(fit.meanX).text, round(fit.meanY).text)
	];
	// r n'existe pas si les ordonnées sont toutes égales
	if (fit.correlation !== null) {
		parts.push(`r ${exactCorrelationText(fit.correlation, FIT_PLACES, 'fr')}`);
	}
	return parts.join(' — ');
}

/** Les actions qui exigent des listes de NOMBRES (Q88) */
const NUMERIC_ROOTS: ReadonlySet<string> = new Set(['stats', 'law', 'scatter', 'fit', 'simulate']);

/** Les actions que la vue Calcul sait exécuter, et leur libellé dans l'historique. */
const PANEL_ACTIONS: Readonly<Record<string, string>> = {
	derive: 'Dériver',
	solve: 'Résoudre',
	variations: 'Variations'
};

// =============================================================================
// Le pupitre
// =============================================================================

/** Combien de termes « Premiers termes » écrit. */
const TERMS_SHOWN = 10;

/** Le nom d'une ligne de console dans l'infobulle d'Annuler : sa saisie, raccourcie. */
const STEP_LABEL_LENGTH = 40;

/** « Annuler : « f(x)=x^2 » » — la saisie telle que tapée, raccourcie au besoin. */
function lineStepLabel(text: string): string {
	const shown = text.length > STEP_LABEL_LENGTH ? `${text.slice(0, STEP_LABEL_LENGTH - 1)}…` : text;
	return `« ${shown} »`;
}

/** « dériver f », « tracer g »… : le nom d'une action de carte comme étape (lot 5). */
function actionStepLabel(actionId: string, name: string): string {
	const shown = displayName(name);
	const verbs: Readonly<Record<string, string>> = {
		plot: 'tracer',
		figure: 'Géométrie :',
		derive: 'dériver',
		reciprocal: 'réciproque de',
		table: 'tabuler',
		terms: 'premiers termes de',
		data: 'données de'
	};
	const root = actionId.split(':')[0];
	return `${verbs[root] ?? 'action sur'} ${shown}`;
}

/** Six chiffres significatifs, la virgule (comme le reste de l'atelier). */
const TERM_FORMAT = new Intl.NumberFormat('fr-FR', {
	maximumSignificantDigits: 6,
	useGrouping: false
});

export class CalcDesk {
	readonly atelier: Atelier;
	readonly session: CalcSession;

	draft = $state('');
	entries = $state<Entry[]>([]);
	notice = $state<string | null>(null);

	#nextId = 0;

	/** Le geste en cours : attaché à la PREMIÈRE ligne qu'il écrit, puis oublié. */
	#gesture: ReplayStep | null = null;

	/** L'étape d'Annuler en attente de sa ligne (`#step`), comme `#gesture`. */
	#pendingStep: number | null = null;

	/** L'étape de chaque suppression : le toast « Annuler » barre sa ligne. */
	#removalSteps = new WeakMap<RemovedWithDependents, number>();

	/** La dernière suppression, pour rejouer une annulation. */
	#lastRemoval: RemovedWithDependents | null = null;

	/**
	 * Les saisies TAPÉES, pour ↑ / ↓ (phase 0 `atelier-cas-phase0.md`, PR 1) :
	 * jamais une ligne écrite par un bouton du panneau, même quand il passe par
	 * `submit` (« Comparer avec M »).
	 */
	#typed: string[] = [];

	/** L'indice, dans `#typed`, de la saisie rappelée ; `null` hors rappel. */
	#recalled: number | null = null;

	/** Ce que le champ contenait avant le premier ↑ : ↓ le rend au bout. */
	#draftBeforeRecall = '';

	/**
	 * Le téléchargement de `.exporter` : celui du bouton « JSON (pour
	 * rejouer) ». Remplacé par les tests, qui n'ont pas de page.
	 */
	download: (entries: readonly Entry[], format: ExportFormat) => void = downloadHistory;

	constructor(atelier: Atelier, engine: WebReplEngine = new WebReplEngine()) {
		this.atelier = atelier;
		this.session = { atelier, engine };
	}

	#push(entry: Omit<Entry, 'id'>): void {
		const replay = this.#gesture;
		this.#gesture = null;
		const stepId = this.#pendingStep;
		this.#pendingStep = null;
		this.entries = [
			...this.entries,
			{
				id: this.#nextId++,
				...entry,
				...(replay !== null && { replay }),
				...(stepId !== null && { stepId })
			}
		];
	}

	/**
	 * Une étape d'Annuler faite depuis la console : son identifiant va à la
	 * ligne qu'elle écrit — pendant l'étape (une action de carte) ou juste après
	 * (une saisie). Une étape emboîtée n'a pas d'identifiant à elle.
	 */
	#step<T>(label: string, run: () => T): T {
		if (this.atelier.inStep) return this.atelier.step(label, run);
		this.#pendingStep = null;
		const from = this.entries.length;
		const result = this.atelier.step(label, run);
		const id = this.atelier.lastStepId;
		if (id === null) return result;
		const written = this.entries[from];
		if (written === undefined) this.#pendingStep = id;
		else this.#withStep(written.id, id);
		return result;
	}

	/** Poser l'étape `stepId` sur la ligne `entryId`. */
	#withStep(entryId: number, stepId: number): void {
		this.entries = this.entries.map((e) => (e.id === entryId ? { ...e, stepId } : e));
	}

	/** Barrer (Annuler) ou débarrer (Rétablir) la ligne de cette étape. */
	#strike(stepId: number, undone: boolean): void {
		this.entries = this.entries.map((e) => {
			if (e.stepId !== stepId) return e;
			if (undone) return { ...e, undone: true as const };
			const { undone: _was, ...rest } = e;
			return rest;
		});
	}

	/**
	 * Annuler la dernière étape (barre, Ctrl/Cmd+Z), et le dire dans la console :
	 * la ligne de l'étape est barrée, et une ligne « Annuler » s'écrit — rejouable,
	 * sinon le rejeu d'un export referait ce qui a été annulé (revue de #1517).
	 */
	undo(): MovedStep | null {
		const moved = this.atelier.undoStep();
		if (moved === null) return null;
		this.#strike(moved.id, true);
		// Un remplacement d'atelier n'a pas de ligne : son Annuler ne se rejoue pas
		this.#gesture = this.atelier.isReplacement(moved.id) ? null : { kind: 'annuler' };
		this.#pendingStep = null;
		this.#push({ label: 'Annuler', text: `Annulé : ${moved.label}.`, failed: false });
		return moved;
	}

	/** Rétablir la dernière étape annulée, et le dire : la ligne est débarrée. */
	redo(): MovedStep | null {
		const moved = this.atelier.redoStep();
		if (moved === null) return null;
		this.#strike(moved.id, false);
		this.#gesture = this.atelier.isReplacement(moved.id) ? null : { kind: 'rétablir' };
		this.#pendingStep = null;
		this.#push({ label: 'Rétablir', text: `Rétabli : ${moved.label}.`, failed: false });
		return moved;
	}

	/**
	 * L'image d'un nombre, calculée depuis la CARTE (phase 0 `/grapheur` §3 A4).
	 *
	 * La carte ne la propose plus (2026-10-18) : ce chemin sert au rejeu des
	 * historiques exportés avant, qui contiennent le geste `image`.
	 *
	 * ⚠️ Ne passe PAS par `submit`, qui vide le brouillon de Calcul : l'élève
	 * pouvait y être en train de taper autre chose. La ligne va dans
	 * l'historique comme toute action (G7) ; la carte affiche le résultat.
	 */
	image(name: string, value: string): { readonly text: string; readonly failed: boolean } {
		this.#gesture = { kind: 'action', action: 'image', name, value: value.trim() };
		const outcome = this.#step(`image par ${displayName(name)}`, () =>
			runAction(this.session, 'image', name, value.trim())
		);
		const text = outcome.ok ? outcome.output : outcome.message;
		this.#push({
			label: `${displayName(name)}(${value.trim()})`,
			text,
			...(outcome.ok && outcome.latex !== undefined ? { latex: outcome.latex } : {}),
			...(outcome.ok && outcome.alternative !== undefined
				? { alternative: outcome.alternative }
				: {}),
			failed: !outcome.ok
		});
		return { text, failed: !outcome.ok };
	}

	/** Les saisies tapées, rappelables par ↑ / ↓ : rangées avec les lignes. */
	get typedInputs(): readonly string[] {
		return this.#typed;
	}

	/**
	 * Reprendre les lignes rangées au rechargement (`history-storage.ts`).
	 *
	 * ⚠️ Rien n'est REFAIT : ni calcul, ni définition, ni action — une ligne
	 * `f(x) = x^2` restaurée ne crée ni ne change aucune carte. Sans l'arbre du
	 * résultat, la ligne n'a pas de « Garder » (`keep` le dit), ni d'étapes.
	 * Sans effet sur un historique déjà commencé.
	 */
	restoreHistory(history: KeptHistory): void {
		if (this.entries.length > 0 || this.#typed.length > 0) return;
		this.entries = history.lines.map((line) => ({ id: this.#nextId++, ...line }));
		this.#typed = [...history.typed];
	}

	/** Vider l'historique (« Repartir de zéro ») ; le brouillon est laissé. */
	clear(): void {
		this.#gesture = null;
		this.#lastRemoval = null;
		this.entries = [];
		this.notice = null;
		this.#typed = [];
		this.#recalled = null;
	}

	/**
	 * ↑ : la saisie précédente. Sur la plus ancienne, rien ne bouge.
	 *
	 * Une ligne rappelée que l'élève a modifiée n'est pas perdue : ↑ repart de
	 * la plus récente, et ↓ rendra la modification au bout.
	 */
	recallPrevious(): void {
		if (this.#typed.length === 0) return;
		if (this.#recalled === null || this.draft !== this.#typed[this.#recalled]) {
			this.#draftBeforeRecall = this.draft;
			this.#recalled = this.#typed.length - 1;
		} else if (this.#recalled > 0) {
			this.#recalled--;
		}
		this.draft = this.#typed[this.#recalled];
	}

	/** ↓ : la saisie suivante ; après la plus récente, le brouillon d'avant ↑. */
	recallNext(): void {
		if (this.#recalled === null) return;
		// L'élève corrige la ligne rappelée : ↓ ne l'écrase pas
		if (this.draft !== this.#typed[this.#recalled]) {
			this.#recalled = null;
			return;
		}
		if (this.#recalled < this.#typed.length - 1) {
			this.#recalled++;
			this.draft = this.#typed[this.#recalled];
			return;
		}
		this.#recalled = null;
		this.draft = this.#draftBeforeRecall;
	}

	/**
	 * Traiter ce que l'élève vient de taper. `inputLatex` : la même saisie,
	 * écrite dans le champ mathématique — la ligne la montrera.
	 */
	submit(text: string, inputLatex?: string): void {
		this.#submit(text, true, inputLatex);
	}

	/** `typed` : tapée par l'élève (rappelable par ↑), ou écrite par un bouton. */
	#submit(text: string, typed: boolean, inputLatex?: string): void {
		// `.exporter` : le pupitre tient l'historique, le moteur ne l'a jamais eu.
		// Pas de ligne : l'historique exporté reste celui de l'élève
		if (isExportCommand(this.session.engine, text)) {
			if (typed) this.#exportTyped(text);
			return;
		}
		// Une ligne = une étape (lot 5) ; un calcul qui ne change rien n'en fait pas
		const result = this.#step(lineStepLabel(text), () => runInput(this.session, text, 'text'));
		// La carte d'une mesure dit ce que dit la console : elle en recopie le mode
		this.session.atelier.setCalcMode(
			this.session.engine.getState().mode === 'decimal' ? 'decimal' : 'exact'
		);
		if (result.kind === 'vide') {
			this.#pendingStep = null;
			return;
		}
		this.#gesture = { kind: 'saisie', input: text };
		// Seule une saisie tapée clôt le rappel : « Comparer » rend le brouillon
		// intact, ↓ doit encore pouvoir revenir à celui d'avant ↑ (revue)
		if (typed) {
			this.#recalled = null;
			// Deux saisies identiques de suite : rappelées une seule fois
			if (this.#typed.at(-1) !== text) this.#typed.push(text);
		}

		this.#push({
			label: text,
			...(inputLatex !== undefined && { inputLatex }),
			...entryOf(result),
			result
		});
		this.draft = '';
		this.notice = null;
	}

	/**
	 * `.exporter` tapé : le même fichier que le bouton JSON, ou la même raison
	 * que le bouton désactivé. Un rejeu ne télécharge rien (il n'appelle pas ici).
	 */
	#exportTyped(text: string): void {
		this.#recalled = null;
		if (this.#typed.at(-1) !== text) this.#typed.push(text);
		this.draft = '';
		if (this.entries.length === 0) {
			this.notice = NOTHING_TO_EXPORT;
			return;
		}
		this.download(this.entries, 'json');
		this.notice = `Historique exporté : ${exportFileName('json', new Date())}.`;
	}

	/**
	 * Rejouer un historique relu (lot C2) : chaque geste est refait par le MÊME
	 * chemin que l'élève — saisie, clic sur une carte, « Garder ».
	 *
	 * S'arrête à la première ligne qui échoue alors qu'elle avait réussi (R3) ;
	 * une ligne qui avait échoué peut échouer encore. Ce qui précède reste.
	 * L'atelier n'est PAS vidé ici : c'est au conteneur de le faire, après
	 * confirmation (R2).
	 */
	replay(history: ImportedHistory, graph?: GrapheurStore): ReplayReport {
		// Le brouillon de l'élève survit au rejeu : `submit` le vide (revue)
		const draft = this.draft;
		// Indice dans le fichier → indice rejoué : « Garder » vise une ligne du
		// fichier, et un geste peut écrire plus ou moins de lignes qu'à l'export
		const rows: number[] = [];
		let replayed = 0;
		let stop: { line: number; message: string } | null = null;
		for (const [index, entry] of history.entries.entries()) {
			const step = stepOf(entry);
			if (step === null) continue;
			// `.exporter` n'écrit aucune ligne : rien à refaire, et un rejeu ne
			// télécharge rien
			if (step.kind === 'saisie' && isExportCommand(this.session.engine, step.input)) continue;
			const before = this.entries.length;
			this.notice = null;
			const missed = this.#replayStep(step, rows, graph);
			const first = this.entries[before];
			if (first !== undefined) rows[index] = before;
			// R3 : on ne s'arrête que si la ligne AVAIT réussi. Une définition
			// rangée en erreur ne l'arrête pas : un export d'avant le 2026-10-13
			// la disait réussie, et la carte existe bel et bien
			const broken =
				missed ??
				(entry.failed
					? null
					: first === undefined
						? (this.notice ?? 'cette ligne ne s’est pas rejouée.')
						: first.failed && first.result?.kind !== 'definition'
							? first.text
							: null);
			if (broken !== null) {
				stop = { line: index + 1, message: broken };
				break;
			}
			replayed++;
		}
		this.draft = draft;
		if (stop !== null) {
			this.notice = `Rejeu arrêté à la ligne ${stop.line} : ${stop.message}`;
			return { ok: false, replayed, ...stop };
		}
		this.notice = `Historique rejoué : ${replayed} ${replayed > 1 ? 'lignes' : 'ligne'}.`;
		return { ok: true, replayed };
	}

	/** Refaire un geste ; rend la raison d'un échec que la ligne ne dirait pas, sinon null. */
	#replayStep(step: ReplayStep, rows: readonly number[], graph?: GrapheurStore): string | null {
		switch (step.kind) {
			case 'saisie':
				// Un rejeu est un chargement : comme au rechargement, rien à rappeler
				// par ↑ (« Comparer avec M » y est rejoué comme une saisie)
				this.#submit(step.input, false);
				return null;
			case 'action':
				if (step.action === 'image') this.image(step.name, step.value ?? '');
				else this.runFromPanel(step.action, step.name, graph);
				return null;
			case 'supprimer': {
				const removed = this.remove(step.name);
				return removed.ok ? null : removed.message;
			}
			// Juste après une suppression, c'est elle qu'on annule, avec la même ligne
			// qu'au toast (un fichier d'avant le lot 5 PR 2 n'a que ce cas) ; sinon
			// la dernière étape, comme Ctrl+Z
			case 'annuler':
				if (this.#lastRemoval !== null && this.undoRemoval(this.#lastRemoval)) return null;
				return this.undo() !== null ? null : 'il n’y avait rien à annuler.';
			case 'rétablir':
				return this.redo() !== null ? null : 'il n’y avait rien à rétablir.';
			case 'garder': {
				const row = rows[step.line];
				const kept = row === undefined ? undefined : this.entries[row];
				if (kept === undefined) return 'la ligne à garder n’a pas été rejouée.';
				this.keep(kept);
				return null;
			}
		}
	}

	/**
	 * Supprimer un objet et ses dépendants, et le dire dans l'historique (G7 ;
	 * retour de David : « quand je supprime une carte, on ne voit rien »).
	 * La confirmation est l'affaire de la vue.
	 */
	remove(name: string): RemovedWithDependents | Refused {
		const outer = !this.atelier.inStep;
		const result = this.atelier.removeWithDependents(name);
		if (!result.ok) return result;
		this.#lastRemoval = result;
		this.#gesture = { kind: 'supprimer', name };
		// Une suppression est une étape : sa ligne se barre quand on l'annule
		const stepId = outer ? this.atelier.lastStepId : null;
		this.#pendingStep = stepId;
		if (stepId !== null) this.#removalSteps.set(result, stepId);
		this.#push({
			label: `Supprimer ${displayName(name)}`,
			text: removedLine(result.removed),
			failed: false
		});
		return result;
	}

	/**
	 * Annuler cette suppression, et le dire. Refusée — sans ligne, la vue le
	 * dit — si l'atelier a changé depuis (L4).
	 */
	undoRemoval(result: RemovedWithDependents): boolean {
		if (!this.atelier.undoRemoval(result)) return false;
		// La ligne « Supprimer » de cette suppression est barrée, comme par Annuler
		const removedStep = this.#removalSteps.get(result);
		if (removedStep !== undefined) this.#strike(removedStep, true);
		// Rejouable seulement si la suppression est dans CET historique : après
		// « Repartir de zéro », le fichier n'aurait qu'un `annuler` orphelin (revue)
		this.#gesture = result === this.#lastRemoval ? { kind: 'annuler' } : null;
		this.#lastRemoval = null;
		this.#push({
			label: 'Annuler la suppression',
			text: restoredLine(result.removed),
			failed: false
		});
		return true;
	}

	/** Garder une ligne sous un nom — décision D5. */
	keep(entry: Entry): void {
		if (entry.result === undefined) {
			this.notice = "Il n'y a rien à garder dans cette ligne.";
			return;
		}
		const result = entry.result;
		const kept = this.#step('garder une ligne', () => promote(this.session, result));
		this.notice = kept.ok ? `Gardé sous le nom « ${kept.object.name} ».` : kept.message;
		// Une ligne aussi (toute action laisse sa trace dans Calcul, G7) : sans
		// elle, le rejeu perdrait l'objet gardé et les lignes qui le citent
		const line = this.entries.indexOf(entry);
		// Une ligne qui n'est plus dans l'historique (« Repartir de zéro ») ne se
		// rejouerait pas : l'objet est gardé, mais sans geste à rejouer
		if (kept.ok) {
			this.#gesture = line >= 0 ? { kind: 'garder', line } : null;
			this.#push({ label: 'Garder', text: this.notice, failed: false });
		}
	}

	/** La liste nommée, si c'en est une et qu'elle est exploitable. */
	#listNamed(name: string): ListObject | null {
		const object = this.atelier.get(name);
		return object !== undefined && isList(object) ? object : null;
	}

	/**
	 * La liste à prendre comme ordonnées.
	 *
	 * ⚠️ Elle est **nommée par l'identifiant de l'action** (`scatter:M`) : c'est
	 * l'élève qui a choisi en cliquant, le catalogue lui ayant proposé une action
	 * par partenaire possible. Rien n'est redeviné ici.
	 *
	 * Sans nom — appel programmatique, ou atelier à deux listes — on retombe sur
	 * la suivante du panneau, ce qui ne laisse aucune ambiguïté à deux.
	 */
	#partnerOf(name: string, wanted?: string): ListObject | null {
		const lists = this.atelier.objects.filter(isList);
		if (wanted !== undefined) {
			return lists.find((l) => l.name === wanted) ?? null;
		}
		const index = lists.findIndex((l) => l.name === name);
		if (index === -1) return null;
		return lists[index + 1] ?? lists[0 === index ? 1 : 0] ?? null;
	}

	/** Les statistiques d'une liste, écrites en français. */
	#describe(name: string): void {
		const list = this.#listNamed(name);
		const outcome = list === null ? null : summarizeList(list.values);

		if (outcome === null) {
			this.#push({
				label: `Statistiques ${name}`,
				text: `« ${name} » n'a pas encore de valeurs.`,
				failed: true
			});
			return;
		}
		// Une liste invalide (trop de valeurs) n'est pas une liste vide : le dire
		if (!outcome.ok) {
			this.#push({ label: `Statistiques ${name}`, text: outcome.message, failed: true });
			return;
		}
		// La mise en forme du module statistique : la même que `.stats` (Q38)
		this.#push({
			label: `Statistiques ${name}`,
			text: formatSummary(outcome.value, 'fr').join('\n'),
			failed: false
		});
	}

	/**
	 * Espérance, variance et écart type d'une variable aléatoire : valeurs dans
	 * une liste, probabilités dans une autre (lot 6, Q44).
	 *
	 * La conversion en fractions est partagée avec `.simuler` (`lawFractions`).
	 */
	#law(name: string, partner: string): void {
		const label = `Loi de ${name} avec probabilités ${partner}`;
		const values = this.#listNamed(name);
		const probabilities = this.#listNamed(partner);
		if (values === null || probabilities === null) {
			this.#push({
				label,
				text: 'Il faut deux listes : les valeurs et leurs probabilités.',
				failed: true
			});
			return;
		}
		const law = lawFractions(values, probabilities);
		if (!law.ok) {
			this.#push({ label, text: law.message, failed: true });
			return;
		}
		const xs = law.values;
		const ps = law.probabilities;
		const outcome = randomVariable(xs, ps);
		if (outcome === null || !outcome.ok) {
			const text = outcome === null ? `« ${name} » n'a pas encore de valeurs.` : outcome.message;
			this.#push({ label, text, failed: true });
			return;
		}
		this.#push({
			label,
			text: formatLawIndicators(name, outcome.value, 'fr').join('\n'),
			failed: false
		});
	}

	/** Les effectifs et fréquences des modalités d'une liste qualitative (Q88) */
	#counts(name: string): void {
		const list = this.#listNamed(name);
		const categories = list?.categories ?? [];
		const total = categories.length;
		this.#push({
			label: `Effectifs de ${name}`,
			text:
				total === 0
					? `« ${name} » n'a pas encore de valeurs.`
					: categoryCounts(categories)
							.map(
								({ label, count }) =>
									`${label} : ${count} (${formatStatNumber(Number(((100 * count) / total).toFixed(1)), 'fr')} %)`
							)
							.join('\n'),
			failed: total === 0
		});
	}

	/** Les statistiques d'une liste de valeurs, effectifs pris dans une autre (Q35). */
	#describeWith(name: string, partner: string): void {
		const label = `Statistiques ${name} avec effectifs ${partner}`;
		const values = this.#listNamed(name);
		const counts = this.#listNamed(partner);
		if (values === null || counts === null) {
			this.#push({
				label,
				text: 'Il faut deux listes : les valeurs et leurs effectifs.',
				failed: true
			});
			return;
		}
		// Une valeur et son effectif sur la même LIGNE (P1)
		const { rows, dropped } = commonRows([values, counts]);
		const outcome = summarizeTable(valuesOn(values, rows), valuesOn(counts, rows));
		if (outcome === null || !outcome.ok) {
			const text = outcome === null ? `« ${name} » n'a pas encore de valeurs.` : outcome.message;
			this.#push({ label, text, failed: true });
			return;
		}
		this.#push({
			label,
			text: [
				...formatSummary(outcome.value.summary, 'fr'),
				...(dropped > 0 ? [droppedNote(dropped)] : [])
			].join('\n'),
			failed: false
		});
	}

	/** Poser le nuage de deux listes dans le grapheur. */
	#scatter(name: string, graph: GrapheurStore | undefined, partner?: string): void {
		const xs = this.#listNamed(name);
		const ys = xs === null ? null : this.#partnerOf(name, partner);

		if (xs === null || ys === null || graph === undefined) {
			this.#push({
				label: `Nuage ${name}`,
				text: 'Il faut deux listes pour tracer un nuage de points.',
				failed: true
			});
			return;
		}

		// Les lignes où les deux colonnes ont un nombre (P1) : `plot-sync` trace les
		// mêmes, et on dit combien on en écarte
		const ignored = commonRows([xs, ys]).dropped;

		// ⚠️ On MARQUE la liste plutôt que de poser le nuage directement : c'est
		// la synchronisation qui pose et qui suit, exactement comme « Tracer » au
		// lot 2. Sans ça, modifier la liste laisserait le nuage figé (§3 N2).
		this.atelier.setPlotted(xs.name, true, ys.name);
		syncPlots(this.atelier, graph);

		// A5 (phase 0 `/grapheur`) : un nuage se VOIT dans le Graphe, il n'écrit
		// rien dans Calcul… sauf s'il a quelque chose à dire que le dessin tait :
		// des valeurs ignorées (§4 L1 de la v1 — sinon l'élève compte ses points
		// et ne comprend pas).
		if (ignored === 0) return;
		this.#push({
			label: `Nuage ${name}`,
			text: `Nuage de ${xs.name} (abscisses) et ${ys.name} (ordonnées) — ${droppedNote(ignored)}`,
			failed: false
		});
	}

	/**
	 * Les premiers termes d'une suite, écrits dans Calcul (phase 0 `/grapheur`
	 * §5 U3) : dix termes à partir du premier, la virgule à la française.
	 */
	#terms(name: string): void {
		const object = this.atelier.get(name);
		const first = object?.kind === 'sequence' ? object.firstIndex : 0;
		const result = termsOf(this.atelier, name, first + TERMS_SHOWN - 1);
		if (!result.ok || result.terms.length === 0) {
			this.#push({
				label: `Premiers termes de ${name}`,
				text: result.ok ? `« ${name} » ne donne aucun terme fini.` : result.message,
				failed: true
			});
			return;
		}
		this.#push({
			label: `Premiers termes de ${name}`,
			text: result.terms.map((t) => `${name}(${t.n}) = ${TERM_FORMAT.format(t.value)}`).join(' ; '),
			failed: false
		});
	}

	/** Ajuster une droite sur deux listes, et en faire une fonction. */
	#fit(name: string, partner?: string): void {
		const xs = this.#listNamed(name);
		const ys = xs === null ? null : this.#partnerOf(name, partner);

		if (xs === null || ys === null) {
			this.#push({
				label: `Ajustement ${name}`,
				text: 'Il faut deux listes pour ajuster une droite.',
				failed: true
			});
			return;
		}

		// Les points des lignes où les deux colonnes ont un nombre (P1)
		const { rows, dropped } = commonRows([xs, ys]);
		if (rows.length === 0) {
			this.#push({ label: `Ajustement ${name}`, text: noCommonRowsMessage(xs, ys), failed: true });
			return;
		}
		const xValues = valuesOn(xs, rows);
		const yValues = valuesOn(ys, rows);
		const fit = fitAffine(xValues, yValues);
		if (!fit.ok) {
			// Les lignes écartées expliquent souvent un « il faut deux points »
			const text = [fit.message, ...(dropped > 0 ? [droppedNote(dropped)] : [])].join(' — ');
			this.#push({ label: `Ajustement ${name}`, text, failed: true });
			return;
		}

		// §4 N4 : l'ajustement produit un OBJET, donc quelque chose de traçable —
		// c'est ce qui permet de voir la droite passer dans le nuage.
		const exact = exactFitOf(xValues, yValues, fit.used);
		const created = this.atelier.create({
			kind: 'function',
			name: nextName('function', this.atelier.names),
			definition: fitDefinition(exact)
		});

		this.#push({
			label: `Ajustement ${name}`,
			text: created.ok
				? [
						fitSummary(created.object.name, exact),
						...(dropped > 0 ? [droppedNote(dropped)] : [])
					].join(' — ')
				: created.message,
			failed: !created.ok
		});
	}

	/** Montrer ou retirer 𝒞f de la vue Géométrie, et l'écrire (K1). */
	#toggleInFigure(name: string): void {
		const object = this.atelier.get(name);
		if (object === undefined || !isFunction(object)) {
			this.#push({ label: name, text: `« ${name} » n'est pas une fonction.`, failed: true });
			return;
		}
		const shown = object.inFigure !== true;
		this.atelier.setInFigure(name, shown);
		const shownName = displayName(name);
		this.#push({
			label: `${shown ? 'Afficher dans Géométrie' : 'Retirer de Géométrie'} ${shownName}`,
			text: shown
				? `La courbe de ${shownName} est affichée dans Géométrie.`
				: `La courbe de ${shownName} est retirée de Géométrie.`,
			failed: false
		});
		this.notice = null;
	}

	/**
	 * Exécuter une action cliquée dans le panneau.
	 *
	 * « Image d'un nombre » n'en est plus une : `f(2)` s'écrit dans la console
	 * (décision de David du 2026-10-18). `image` ne sert plus qu'au rejeu.
	 */
	runFromPanel(actionId: string, name: string, graph?: GrapheurStore): PanelOutcome {
		// Posé avant tout : « Comparer » passe par `submit`, qui le remplace par
		// la commande tapée — c'est elle qu'on rejouera
		this.#gesture = { kind: 'action', action: actionId, name };
		try {
			// Une action de carte = une étape (lot 5) ; « Comparer » passe par une
			// ligne de console, étape emboîtée qui se fond dans celle-ci
			return this.#step(actionStepLabel(actionId, name), () =>
				this.#runFromPanel(actionId, name, graph)
			);
		} finally {
			// Une action sans ligne (diagramme, commande préparée) ne doit pas
			// léguer son geste à la ligne d'un autre (revue du lot C1), ni son étape
			this.#gesture = null;
			this.#pendingStep = null;
		}
	}

	/**
	 * Préparer une commande dans la console : elle s'AJOUTE à ce que l'élève a
	 * déjà tapé, jamais à sa place (décision de David du 2026-10-18).
	 */
	#prepare(command: string) {
		const draft = this.draft;
		if (draft.trim() === '') this.draft = command;
		else this.draft = draft.endsWith(' ') ? draft + command : `${draft} ${command}`;
	}

	#runFromPanel(actionId: string, name: string, graph?: GrapheurStore): PanelOutcome {
		// « Tableau croisé avec M » (Q89) : la commande est préparée, l'élève peut
		// ajouter `lignes`, `colonnes` ou `fréquences` avant de valider
		if (actionId.startsWith('cross:')) {
			this.#prepare(`.croiser ${name} ${actionId.slice('cross:'.length)}`);
			return 'needs-argument';
		}
		// « Simuler » a besoin de n : la commande est préparée, 100 par défaut
		// (Q77), l'élève valide ou change le nombre
		if (actionId.startsWith('simulate:')) {
			this.#prepare(`.simuler ${name} ${actionId.slice('simulate:'.length)} 100`);
			return 'needs-argument';
		}

		// ⚠️ `scatter:M` nomme sa partenaire : la racine dit QUOI faire, le suffixe
		// AVEC QUI. Sans cette lecture, les actions du catalogue seraient des
		// boutons morts — le bloquant de la revue #339.
		const [root, partner] = actionId.split(':');

		// Une liste qualitative (Q88) ne se prête à aucune action numérique : le
		// panneau les désactive, mais elles restent atteignables autrement — la
		// raison du bouton plutôt qu'un « 0 valeur(s) » faux (revue)
		if (NUMERIC_ROOTS.has(root) || (root === 'chart' && partner !== undefined)) {
			const qualitative = [name, partner].find((n) => {
				const list = n === undefined ? null : this.#listNamed(n);
				return list !== null && isQualitative(list);
			});
			if (qualitative !== undefined) {
				this.#push({ label: name, text: wordsReason(qualitative), failed: true });
				return 'ok';
			}
		}

		// « Comparer avec M » (Q113) : rien à compléter, la commande s'exécute et
		// reste lisible dans l'historique
		// ⚠️ Le brouillon de l'élève survit au clic : `submit` le vide (revue)
		if (root === 'compare' && partner !== undefined) {
			const { draft, notice } = this;
			this.#submit(`.comparer ${name} ${partner}`, false);
			this.draft = draft;
			this.notice = notice;
			return 'ok';
		}
		if (root === 'stats') {
			if (partner === undefined) this.#describe(name);
			else this.#describeWith(name, partner);
			return 'ok';
		}
		// Le diagramme vit dans la vue Données, sous la liste : on bascule son
		// affichage, sans ligne d'historique (Q36)
		if (root === 'law' && partner !== undefined) {
			this.#law(name, partner);
			return 'ok';
		}
		if (root === 'chart') {
			this.atelier.toggleChart(name, partner ?? null);
			return 'ok';
		}
		// Liste qualitative (Q88) : diagramme circulaire des modalités, effectifs
		if (root === 'pie') {
			this.atelier.toggleChart(name, null, 'circulaire');
			return 'ok';
		}
		if (root === 'counts') {
			this.#counts(name);
			return 'ok';
		}
		if (root === 'scatter') {
			this.#scatter(name, graph, partner);
			return 'ok';
		}
		if (root === 'terms') {
			this.#terms(name);
			return 'ok';
		}
		if (root === 'fit') {
			this.#fit(name, partner);
			return 'ok';
		}

		// « Afficher dans Géométrie » (géométrie v2, K1) : bascule l'état
		// d'affichage, et le dit dans Calcul (G2) — la ligne porte le geste, que
		// le rejeu refait par ce même chemin
		if (actionId === 'figure') {
			this.#toggleInFigure(name);
			return 'ok';
		}

		// « Réciproque » (lot 3 de la réciproque, R1) : la même ligne que
		// `.réciproque f`, et la carte `f⁻¹` — sans changer de vue
		if (actionId === 'reciprocal') {
			this.#push({
				label: `Réciproque ${displayName(name)}`,
				...entryOf(runReciprocal(this.session, name))
			});
			this.notice = null;
			return 'ok';
		}

		const label = PANEL_ACTIONS[actionId];
		if (label === undefined) return 'unsupported';

		const outcome = runAction(this.session, actionId, name);

		// « Dériver » crée aussi la carte `f′` (phase 0 `/grapheur` §2 D1) : la
		// ligne ci-dessous en garde le calcul, la carte en fait un objet
		// Seulement si le calcul a abouti : sur une fonction en attente, la ligne
		// dit déjà pourquoi, et une carte n'aurait rien à valoir
		const derivative =
			actionId === 'derive' && outcome.ok ? this.atelier.createDerivative(name) : null;
		// L1 : déjà là, on le dit ; E3 : impossible, on dit pourquoi
		const note = derivativeNote(derivative);

		this.#push({
			label: `${label} ${displayName(name)}`,
			text: outcome.ok ? outcome.output : outcome.message,
			// À part du texte : visible même quand la réponse est en mathématiques
			...(note !== null && { note }),
			...(outcome.ok && outcome.latex !== undefined ? { latex: outcome.latex } : {}),
			...(outcome.ok && outcome.steps !== undefined ? { steps: outcome.steps } : {}),
			...(outcome.ok && outcome.summary !== undefined ? { summary: outcome.summary } : {}),
			...(outcome.ok && outcome.table !== undefined ? { table: outcome.table } : {}),
			...(outcome.ok && outcome.alternative !== undefined
				? { alternative: outcome.alternative }
				: {}),
			failed: !outcome.ok
		});
		this.notice = null;
		return 'ok';
	}
}

/** Ce qu'une ligne affiche, tiré du résultat d'une saisie (ou de « Réciproque »). */
function entryOf(result: CalcResult): Omit<Entry, 'id' | 'label'> {
	return {
		text: textOf(result),
		...(result.kind === 'calcul' || result.kind === 'commande' ? { latex: result.latex } : {}),
		// Un refus peut aussi porter des étapes (`.intégrer`, pôle dans [a ; b])
		...((result.kind === 'commande' || result.kind === 'refus') && result.steps !== undefined
			? { steps: result.steps }
			: {}),
		...((result.kind === 'commande' || result.kind === 'refus') && result.summary !== undefined
			? { summary: result.summary }
			: {}),
		...(result.kind === 'commande' && result.chart !== undefined ? { chart: result.chart } : {}),
		...(result.kind === 'commande' && result.table !== undefined ? { table: result.table } : {}),
		...((result.kind === 'calcul' || result.kind === 'commande') && result.alternative !== undefined
			? { alternative: result.alternative }
			: {}),
		...('note' in result && result.note !== undefined ? { note: result.note } : {}),
		...(result.kind === 'refus' && result.formulas === true && { formulas: true as const }),
		// Une définition rangée mais en erreur (`h(x) = x^^2`) : la ligne aussi
		failed:
			result.kind === 'refus' || (result.kind === 'definition' && result.object.status === 'error')
	};
}

/** Ce qu'une ligne affiche en toutes lettres. */
function textOf(result: CalcResult): string {
	switch (result.kind) {
		case 'calcul':
		case 'commande':
			return result.output;
		case 'refus':
			return result.message;
		case 'definition':
			return definitionText(result.name, result.object);
		default:
			return '';
	}
}

/**
 * La ligne d'une définition dit ce que dit la carte (décision de David,
 * 2026-10-13) : rangée, mais en erreur ou en attente, elle reprend le
 * message de la carte au lieu d'annoncer un objet prêt.
 */
function definitionText(name: string, object: AtelierObject): string {
	// Réussie : « f est correctement défini » (demande de David, 2026-10-18 :
	// « est dans tes objets » ne disait pas si tout allait bien). La console
	// colore le nom (`definedName`).
	const defined = `${name}${DEFINED_SUFFIX}`;
	const placed = `« ${name} » est dans tes objets`;
	if (object.message === undefined) return defined;
	if (object.status === 'error') return `${placed}, mais elle est en erreur : ${object.message}`;
	if (object.status === 'pending') {
		return `${placed}, ${object.message.charAt(0).toLowerCase()}${object.message.slice(1)}`;
	}
	return defined;
}

/** La fin de la ligne d'une définition réussie, après le nom. */
const DEFINED_SUFFIX = ' est correctement défini.';

/**
 * Le nom d'une ligne « f est correctement défini », pour que la console le
 * colore — ou `null` : une autre ligne.
 */
export function definedName(entry: Pick<Entry, 'result' | 'text' | 'failed'>): string | null {
	if (entry.failed || entry.result?.kind !== 'definition') return null;
	const name = entry.result.name;
	return entry.text === `${name}${DEFINED_SUFFIX}` ? name : null;
}
