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
import { describeList, fitAffine } from './stats';
import { syncPlots } from './plot-sync';
import { isList, type ListObject } from './types';
import { nextName } from './names';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';

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
	/** Présent seulement pour une saisie : c'est ce que « Garder » consomme. */
	readonly result?: CalcResult;
}

/** Ce qu'une action venue du panneau a donné. */
export type PanelOutcome = 'ok' | 'needs-argument' | 'unsupported';

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
		const stats = list === null ? null : describeList(list.values);

		if (stats === null) {
			this.#push({
				label: `Statistiques ${name}`,
				text: `« ${name} » n'a pas encore de valeurs.`,
				failed: true
			});
			return;
		}

		// ⚠️ Écrites ici, en français et accentuées : `.stats` rend « Moyenne
		// (mean) » et « Mediane », et l'étendue lui manque.
		this.#push({
			label: `Statistiques ${name}`,
			text: [
				`Effectif : ${stats.count}`,
				`Moyenne : ${fr(stats.mean)}`,
				`Médiane : ${fr(stats.median)}`,
				`Minimum : ${fr(stats.min)}`,
				`Maximum : ${fr(stats.max)}`,
				`Étendue : ${fr(stats.range)}`,
				`Écart-type : ${fr(stats.deviation)}`,
				`Variance : ${fr(stats.variance)}`
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

		if (root === 'stats') {
			this.#describe(name);
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
