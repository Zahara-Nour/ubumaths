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
import { runInput, runAction, promote, type CalcResult, type CalcSession } from './calcul';
import { summarizeList, summarizeTable } from '$lib/statistics/describe';
import { formatLawIndicators, formatStatNumber, formatSummary } from '$lib/statistics/format';
import { Fraction } from '$lib/statistics/fraction';
import { randomVariable } from '$lib/statistics/random-variable';
import { fitAffine } from '$lib/statistics/fit';
import { differentiate } from '$lib/mathAST/differentiation';
import { toCustom } from '$lib/mathAST/custom-generator';
import { expressionOf } from './engine';
import { syncPlots } from './plot-sync';
import { isList, type ListObject } from './types';
import { astOf, readListValue } from './parse';
import { nextName } from './names';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

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
	/** Présent seulement pour une saisie : c'est ce que « Garder » consomme. */
	readonly result?: CalcResult;
}

/** Ce qu'une action venue du panneau a donné. */
export type PanelOutcome = 'ok' | 'needs-argument' | 'unsupported';

/**
 * Une valeur de liste telle que l'élève l'a tapée (`1/10007`), sinon son
 * décimal : le message doit se retrouver dans la liste (revue Q51).
 */
function typedAs(lists: readonly ListObject[], value: number): string {
	for (const list of lists) {
		const typed = list.definition
			.split(';')
			.map((piece) => piece.trim())
			.find((piece) => readListValue(piece) === value);
		if (typed !== undefined) return typed;
	}
	return formatStatNumber(value, 'fr');
}

/** Un nombre écrit comme l'élève l'écrit : virgule décimale, trois décimales au plus. */
function fr(value: number): string {
	return Number(value.toFixed(3)).toString().replace('.', ',');
}

/** Les actions que la vue Calcul sait exécuter, et leur libellé dans l'historique. */
const PANEL_ACTIONS: Readonly<Record<string, string>> = {
	derive: 'Dériver',
	solve: 'Résoudre',
	variations: 'Variations'
};

// =============================================================================
// Le pupitre
// =============================================================================

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

	/** Traiter ce que l'élève vient de taper. */
	submit(text: string): void {
		const result = runInput(this.session, text, 'text');
		if (result.kind === 'vide') return;

		this.#push({
			label: text,
			text: textOf(result),
			...(result.kind === 'calcul' || result.kind === 'commande' ? { latex: result.latex } : {}),
			...(result.kind === 'commande' && result.steps !== undefined ? { steps: result.steps } : {}),
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
	 * ⚠️ Une liste contient des décimaux de la machine (1/6 y vaut 0,1666…) : ils
	 * repassent en fractions (dénominateur ≤ 10 000) pour que la somme fasse
	 * EXACTEMENT 1 et que E(X) s'écrive 7/2.
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
		const numbers = [...values.values, ...probabilities.values];
		const fractions = numbers.map((n) => Fraction.fromNumber(n));
		// Nommer la valeur fautive (Q51) : l'élève la retrouve dans sa liste
		const faulty = fractions.indexOf(null);
		if (faulty !== -1) {
			this.#push({
				label,
				text: `${typedAs([values, probabilities], numbers[faulty])} ne s’écrit pas comme une fraction simple : la loi ne peut pas être calculée exactement.`,
				failed: true
			});
			return;
		}
		const xs = fractions.slice(0, values.values.length) as Fraction[];
		const ps = fractions.slice(values.values.length) as Fraction[];
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

		// §4 L1 : on dit ce qui n'a pas été tracé, sinon l'élève compte ses points
		// et ne comprend pas.
		const note =
			ignored === 0
				? ''
				: ` — ${ignored} valeur${ignored > 1 ? 's' : ''} ignorée${ignored > 1 ? 's' : ''}`;
		this.#push({
			label: `Nuage ${name}`,
			text: `Nuage de ${xs.name} (abscisses) et ${ys.name} (ordonnées)${note}`,
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
	 * Garder la dérivée d'une fonction comme objet — décision D7.
	 *
	 * ⚠️ **Par voie symbolique, jamais par le texte.** Le lot 3 gardait un
	 * résultat en relisant la sortie d'une commande ; mesuré, ça fabriquait des
	 * objets faux avec un message de succès. Ici on dérive l'ARBRE de
	 * l'expression substituée, et `toCustom` en refait une définition.
	 *
	 * Le nom porte l'apostrophe typographique (`f’`), celle que l'élève lit.
	 */
	#keepDerivative(name: string): void {
		const substituted = expressionOf(this.atelier, name);
		if (!substituted.ok) {
			this.#push({ label: `Garder ${name}’`, text: substituted.message, failed: true });
			return;
		}

		const ast = astOf(substituted.expression, this.atelier.get(name)?.provenance);
		if (ast === null) {
			this.#push({
				label: `Garder ${name}’`,
				text: `« ${substituted.expression} » ne se lit pas.`,
				failed: true
			});
			return;
		}

		let definition: string;
		try {
			definition = toCustom(differentiate(ast));
		} catch {
			// Une dérivée qui n'aboutit pas est une réponse, pas une panne : on le
			// dit en français plutôt que de laisser remonter l'exception.
			this.#push({
				label: `Garder ${name}’`,
				text: `La dérivée de « ${name} » ne se calcule pas.`,
				failed: true
			});
			return;
		}

		// ⚠️ Le nom n'est PAS `f’` : l'apostrophe n'est pas un caractère
		// d'identifiant pour le parseur, donc un objet nommé ainsi ne pourrait
		// jamais être cité dans une autre définition — `f’(x) + 1` ne le verrait
		// pas. On prend le prochain nom libre, et le message dit de quoi il
		// s'agit : l'objet reste utilisable, ce qui est le point du geste.
		const chosen = nextName('function', this.atelier.names, [name]);

		const created = this.atelier.create({ kind: 'function', name: chosen, definition }, 'text');
		this.#push({
			label: `Dérivée de ${name}`,
			text: created.ok ? `${chosen}(x) = ${definition} — la dérivée de ${name}` : created.message,
			failed: !created.ok
		});
	}

	/**
	 * Exécuter une action cliquée dans le panneau.
	 *
	 * « Image d'un nombre » a besoin d'un nombre : plutôt qu'une boîte de
	 * dialogue, on **prépare la saisie** (`f(`) et l'élève finit de taper — le
	 * geste reste dans le même champ que tout le reste.
	 */
	runFromPanel(actionId: string, name: string, graph?: GrapheurStore): PanelOutcome {
		if (actionId === 'image') {
			this.draft = `${name}(`;
			return 'needs-argument';
		}

		// ⚠️ `scatter:M` nomme sa partenaire : la racine dit QUOI faire, le suffixe
		// AVEC QUI. Sans cette lecture, les actions du catalogue seraient des
		// boutons morts — le bloquant de la revue #339.
		const [root, partner] = actionId.split(':');

		if (root === 'keep-derivative') {
			this.#keepDerivative(name);
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
		if (root === 'scatter') {
			this.#scatter(name, graph, partner);
			return 'ok';
		}
		if (root === 'fit') {
			this.#fit(name, partner);
			return 'ok';
		}

		const label = PANEL_ACTIONS[actionId];
		if (label === undefined) return 'unsupported';

		const outcome = runAction(this.session, actionId, name);
		this.#push({
			label: `${label} ${name}`,
			text: outcome.ok ? outcome.output : outcome.message,
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
