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

import type { Atelier } from './atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import {
	runInput,
	runAction,
	promote,
	derivativeNote,
	type CalcResult,
	type CalcSession
} from './calcul';
import { summarizeList, summarizeTable } from '$lib/statistics/describe';
import { formatLawIndicators, formatStatNumber, formatSummary } from '$lib/statistics/format';
import { categoryCounts } from './chart';
import { randomVariable } from '$lib/statistics/random-variable';
import { fitAffine } from '$lib/statistics/fit';
import { syncPlots } from './plot-sync';
import { termsOf } from './engine';
import { isList, isQualitative, type ListObject } from './types';
import { wordsReason } from './actions';
import { lawFractions } from './simulate';
import { nextName, displayName } from './names';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Types
// =============================================================================

/** Une ligne d'historique, telle que l'écran la montre. */
export interface Entry {
	readonly id: number;
	/** Ce qui a produit cette ligne : la saisie, ou le nom de l'action. */
	readonly label: string;
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
	 * Le tableau de variations, quand l'action en a produit un.
	 *
	 * Il se dessine sous la ligne — le moteur, lui, n'en rendait qu'une
	 * description en texte de terminal.
	 */
	readonly table?: VariationTableNode;
	/** Le graphique d'une simulation (`.fréquence`, `.échantillons`, Q80) */
	readonly chart?: StatChartScene;
	/** Présent seulement pour une saisie : c'est ce que « Garder » consomme. */
	readonly result?: CalcResult;
}

/** Ce qu'une action venue du panneau a donné. */
export type PanelOutcome = 'ok' | 'needs-argument' | 'unsupported';

/** Un nombre écrit comme l'élève l'écrit : virgule décimale, trois décimales au plus. */
function fr(value: number): string {
	return Number(value.toFixed(3)).toString().replace('.', ',');
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

	constructor(atelier: Atelier, engine: WebReplEngine = new WebReplEngine()) {
		this.atelier = atelier;
		this.session = { atelier, engine };
	}

	#push(entry: Omit<Entry, 'id'>): void {
		this.entries = [...this.entries, { id: this.#nextId++, ...entry }];
	}

	/**
	 * L'image d'un nombre, calculée depuis la CARTE (phase 0 `/grapheur` §3 A4).
	 *
	 * ⚠️ Ne passe PAS par `submit`, qui vide le brouillon de Calcul : l'élève
	 * pouvait y être en train de taper autre chose. La ligne va dans
	 * l'historique comme toute action (G7) ; la carte affiche le résultat.
	 */
	image(name: string, value: string): { readonly text: string; readonly failed: boolean } {
		const outcome = runAction(this.session, 'image', name, value.trim());
		const text = outcome.ok ? outcome.output : outcome.message;
		this.#push({
			label: `${displayName(name)}(${value.trim()})`,
			text,
			...(outcome.ok && outcome.latex !== undefined ? { latex: outcome.latex } : {}),
			failed: !outcome.ok
		});
		return { text, failed: !outcome.ok };
	}

	/** Traiter ce que l'élève vient de taper. */
	submit(text: string): void {
		const result = runInput(this.session, text, 'text');
		if (result.kind === 'vide') return;

		this.#push({
			label: text,
			text: textOf(result),
			...(result.kind === 'calcul' || result.kind === 'commande' ? { latex: result.latex } : {}),
			...(result.kind === 'commande' && result.steps !== undefined ? { steps: result.steps } : {}),
			...(result.kind === 'commande' && result.chart !== undefined ? { chart: result.chart } : {}),
			failed: result.kind === 'refus',
			result
		});
		this.draft = '';
		this.notice = null;
	}

	/** Garder une ligne sous un nom — décision D5. */
	keep(entry: Entry): void {
		if (entry.result === undefined) {
			this.notice = "Il n'y a rien à garder dans cette ligne.";
			return;
		}
		const kept = promote(this.session, entry.result);
		this.notice = kept.ok ? `Gardé sous le nom « ${kept.object.name} ».` : kept.message;
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
		const outcome = summarizeTable(values.values, counts.values);
		if (outcome === null || !outcome.ok) {
			const text = outcome === null ? `« ${name} » n'a pas encore de valeurs.` : outcome.message;
			this.#push({ label, text, failed: true });
			return;
		}
		this.#push({
			label,
			text: formatSummary(outcome.value.summary, 'fr').join('\n'),
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

		const drawn = Math.min(xs.values.length, ys.values.length);
		const ignored = Math.max(xs.values.length, ys.values.length) - drawn;

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
			text: `Nuage de ${xs.name} (abscisses) et ${ys.name} (ordonnées) — ${ignored} valeur${ignored > 1 ? 's' : ''} ignorée${ignored > 1 ? 's' : ''}`,
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

		const fit = fitAffine(xs.values, ys.values);
		if (!fit.ok) {
			this.#push({ label: `Ajustement ${name}`, text: fit.message, failed: true });
			return;
		}

		// §4 N4 : l'ajustement produit un OBJET, donc quelque chose de traçable —
		// c'est ce qui permet de voir la droite passer dans le nuage.
		const created = this.atelier.create({
			kind: 'function',
			name: nextName('function', this.atelier.names),
			definition: `${fr(fit.slope)}*x+${fr(fit.intercept)}`.replace(/\+-/, '-')
		});

		this.#push({
			label: `Ajustement ${name}`,
			text: created.ok
				? `${created.object.name}(x) = ${fr(fit.slope)}x + ${fr(fit.intercept)} — R² = ${fr(fit.r2)}`
				: created.message,
			failed: !created.ok
		});
	}

	/**
	 * Exécuter une action cliquée dans le panneau.
	 *
	 * « Image d'un nombre » n'en est plus une : c'est un champ de la carte
	 * (`image`, phase 0 `/grapheur` §3 A4).
	 */
	runFromPanel(actionId: string, name: string, graph?: GrapheurStore): PanelOutcome {
		// « Tableau croisé avec M » (Q89) : la commande est préparée, l'élève peut
		// ajouter `lignes`, `colonnes` ou `fréquences` avant de valider
		if (actionId.startsWith('cross:')) {
			this.draft = `.croiser ${name} ${actionId.slice('cross:'.length)}`;
			return 'needs-argument';
		}
		// « Simuler » a besoin de n : la commande est préparée, 100 par défaut
		// (Q77), l'élève valide ou change le nombre
		if (actionId.startsWith('simulate:')) {
			this.draft = `.simuler ${name} ${actionId.slice('simulate:'.length)} 100`;
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
			this.submit(`.comparer ${name} ${partner}`);
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
			text: (outcome.ok ? outcome.output : outcome.message) + note,
			...(outcome.ok && outcome.latex !== undefined ? { latex: outcome.latex } : {}),
			...(outcome.ok && outcome.steps !== undefined ? { steps: outcome.steps } : {}),
			...(outcome.ok && outcome.table !== undefined ? { table: outcome.table } : {}),
			failed: !outcome.ok
		});
		this.notice = null;
		return 'ok';
	}
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
			return `« ${result.name} » est dans tes objets.`;
		default:
			return '';
	}
}
