/**
 * Cycle de vie d'un objet de l'atelier — comportements du §2.
 *
 * Chaque `it` porte le numéro du cas de la spécification
 * (`docs/wip/atelier-recherche-eleve-phase0.md`).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { isList, isValue } from '../types';

let a: Atelier;

beforeEach(() => {
	a = new Atelier();
});

// =============================================================================
// §2.1 Création
// =============================================================================

describe('création', () => {
	// N1
	it('crée une fonction nommée depuis sa définition', () => {
		const r = a.create({ kind: 'function', definition: 'x^2 - 3x + 1' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.name).toBe('f');
		expect(r.object.kind).toBe('function');
		expect(a.names).toEqual(['f']);
	});

	// N2 — décision D3 : toute valeur numérique libre reçoit un curseur
	it('donne un curseur [-10 ; 10] à une valeur numérique', () => {
		const r = a.create({ kind: 'value', definition: '3' });
		expect(r.ok).toBe(true);
		if (!r.ok || !isValue(r.object)) return;
		expect(r.object.slider).toEqual({ min: -10, max: 10, step: expect.any(Number) });
	});

	// D4 — une grandeur n'est pas pilotable par un curseur
	it('ne donne pas de curseur à une valeur portant une unité', () => {
		const r = a.create({ kind: 'value', definition: '12 km' });
		expect(r.ok).toBe(true);
		if (!r.ok || !isValue(r.object)) return;
		expect(r.object.unit).toBe('km');
		expect(r.object.slider).toBeUndefined();
	});

	// N3 — création depuis le bouton « + Fonction » de la vue Graphe
	it('nomme automatiquement, sans collision avec l’existant', () => {
		a.create({ kind: 'function', definition: 'x' });
		const r = a.create({ kind: 'function' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.name).toBe('g');
	});

	// L2 — définition vide : incomplet, PAS une erreur
	it('accepte une définition vide sans la traiter comme une erreur', () => {
		const r = a.create({ kind: 'function' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.definition).toBe('');
		expect(r.object.status).toBe('incomplete');
	});

	// E1
	it('refuse x comme nom, avec un message qui dit pourquoi', () => {
		const r = a.create({ kind: 'value', name: 'x', definition: '3' });
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.message.toLowerCase()).toContain('variable');
	});

	// E2 — l'objet existe et PORTE son erreur ; l'atelier reste utilisable
	it('crée quand même l’objet quand la définition est inanalysable', () => {
		const r = a.create({ kind: 'function', definition: 'x^^2' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('error');
		expect(r.object.message).toBeTruthy();
		expect(a.names).toEqual(['f']);
		// et l'atelier accepte encore un autre objet
		expect(a.create({ kind: 'value', definition: '2' }).ok).toBe(true);
	});

	// E3
	it('refuse un nom mal formé', () => {
		expect(a.create({ kind: 'value', name: '2f', definition: '1' }).ok).toBe(false);
	});

	// §4 E1 — une entrée non numérique est écartée ET signalée
	it('écarte les entrées non numériques d’une liste en les comptant', () => {
		const r = a.create({ kind: 'list', definition: '12 ; 15 ; abc ; 9' });
		expect(r.ok).toBe(true);
		if (!r.ok || !isList(r.object)) return;
		expect(r.object.values).toEqual([12, 15, 9]);
		expect(r.object.skipped).toBe(1);
	});

	// §4 E2 — la virgule reste décimale, le point-virgule sépare
	it('lit la virgule comme décimale et le point-virgule comme séparateur', () => {
		const r = a.create({ kind: 'list', definition: '3,14 ; 2,5' });
		expect(r.ok).toBe(true);
		if (!r.ok || !isList(r.object)) return;
		expect(r.object.values).toEqual([3.14, 2.5]);
	});
});

// =============================================================================
// §2.2 Nommage et collisions
// =============================================================================

describe('renommage', () => {
	// N1 — les définitions qui citent l'ancien nom suivent, et on le dit
	it('réécrit les définitions qui citaient l’ancien nom', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		const r = a.rename('f', 'h');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.updated).toEqual(['g']);
		expect(a.get('g')?.definition).toBe('h(x) + 1');
		expect(a.get('f')).toBeUndefined();
	});

	// L1 — refus, pas de fusion ni d'écrasement
	it('refuse de renommer vers un nom déjà pris, sans rien écraser', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'x^3' });

		const r = a.rename('f', 'g');
		expect(r.ok).toBe(false);
		expect(a.get('f')?.definition).toBe('x^2');
		expect(a.get('g')?.definition).toBe('x^3');
	});

	// E2 — un seul espace de noms (décision D1)
	it('refuse un nom porté par un objet d’un autre type', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' });
		a.create({ kind: 'value', name: 'a', definition: '3' });
		expect(a.rename('a', 'u').ok).toBe(false);
	});

	it('ne renomme pas un objet qui n’existe pas', () => {
		expect(a.rename('z', 'y').ok).toBe(false);
	});
});

// =============================================================================
// §2.3 Modification
// =============================================================================

describe('modification', () => {
	// N1 — recalcul en cascade
	it('recalcule ce qui dépend de l’objet modifié', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		const r = a.update('f', 'x^3');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.recomputed).toContain('g');
	});

	// L1 — l'atelier ne casse pas quand une dépendance devient fausse
	it('laisse l’atelier utilisable quand une définition devient inanalysable', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		const r = a.update('f', 'x^^2');
		expect(r.ok).toBe(true);
		expect(a.get('f')?.status).toBe('error');
		// g existe toujours et signale qu'elle dépend d'un objet illisible :
		// c'est une erreur, pas une attente — f est là, mais inexploitable.
		expect(a.get('g')).toBeDefined();
		expect(a.get('g')?.status).toBe('error');
	});

	// L2 — circularité nommée en français, aucune boucle infinie
	it('détecte une définition circulaire sans se bloquer', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) - 1' });

		const r = a.update('f', 'g(x) + 1');
		expect(r.ok).toBe(true);
		expect(a.get('f')?.status).toBe('error');
		expect(a.get('f')?.message?.toLowerCase()).toContain('circulaire');
	});

	it('détecte aussi une définition qui se cite elle-même', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x' });
		a.update('f', 'f(x) + 1');
		expect(a.get('f')?.status).toBe('error');
		expect(a.get('f')?.message?.toLowerCase()).toContain('circulaire');
	});
});

// =============================================================================
// §2.4 Suppression
// =============================================================================

describe('suppression', () => {
	// N1
	it('retire l’objet de l’atelier', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const r = a.remove('f');
		expect(r.ok).toBe(true);
		expect(a.names).toEqual([]);
	});

	// L1 — on prévient, puis on laisse faire : g passe en erreur, ne disparaît pas
	it('annonce d’avance qui dépend de l’objet', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });
		expect(a.dependents('f')).toEqual(['g']);
	});

	it('casse les dépendants sans les supprimer', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		const r = a.remove('f');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.broken).toEqual(['g']);
		expect(a.get('g')).toBeDefined();
		// D9 : f peut revenir, donc c'est une absence, pas une faute
		expect(a.get('g')?.status).toBe('pending');
		expect(a.get('g')?.missing?.map((m) => m.name)).toEqual(['f']);
	});

	// L2 — atelier vide et prêt, SANS x² ajouté d'office
	it('laisse l’atelier vide, sans y remettre une fonction par défaut', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.remove('f');
		expect(a.objects).toEqual([]);
	});

	it('libère le nom pour un nouvel objet', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.remove('f');
		const r = a.create({ kind: 'function' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.name).toBe('f');
	});
});

// =============================================================================
// §2.5 Les objets en attente (décision D9)
// =============================================================================

describe('objets en attente', () => {
	// N1 — un nom inconnu met en attente, pas en erreur
	it('met en attente quand une fonction citée n’existe pas', () => {
		const r = a.create({ kind: 'function', name: 'g', definition: 'h(x) + 1' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('pending');
		expect(r.object.missing).toEqual([{ name: 'h', as: 'function' }]);
		expect(r.object.message).toContain('h');
	});

	// N2 — l'attente se répare toute seule
	it('redevient exploitable dès que le nom manquant apparaît', () => {
		a.create({ kind: 'function', name: 'g', definition: 'h(x) + 1' });
		expect(a.get('g')?.status).toBe('pending');

		a.create({ kind: 'function', name: 'h', definition: 'x^2' });
		expect(a.get('g')?.status).toBe('ok');
		expect(a.get('g')?.missing).toBeUndefined();
	});

	// N3 — une lettre seule est une valeur, donc une offre de curseur
	it('classe une lettre seule en valeur, pour pouvoir offrir un curseur', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('pending');
		expect(r.object.missing).toEqual([{ name: 'a', as: 'value' }]);
	});

	// L'AST résout la multiplication implicite : `ax` n'est pas un nom
	it('ne prend pas `ax` pour un nom, mais lit `a` et `x`', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'ax + b' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing?.map((m) => m.name).sort()).toEqual(['a', 'b']);
	});

	// N4 — accepter l'offre
	it('crée la valeur avec son curseur et répare l’objet en attente', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });

		const r = a.createFromOffer('a');
		expect(r.ok).toBe(true);
		if (!r.ok || !isValue(r.object)) return;
		expect(r.object.slider).toEqual({ min: -10, max: 10, step: expect.any(Number) });
		expect(a.get('f')?.status).toBe('ok');
	});

	// N5 — tous les noms manquants sont nommés
	it('nomme tous les manquants, pas seulement le premier', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*x + b' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing?.map((m) => m.name).sort()).toEqual(['a', 'b']);
		expect(r.object.message).toContain('a');
		expect(r.object.message).toContain('b');
	});

	// L1 — les 45 fonctions du moteur ne sont jamais en attente
	it('ne met jamais en attente une fonction connue du moteur', () => {
		for (const def of ['sin(x)', 'ln(x) + 1', 'sqrt(x)', 'exp(x)']) {
			const r = a.create({ kind: 'function', definition: def });
			expect(r.ok).toBe(true);
			if (!r.ok) return;
			expect(r.object.status).toBe('ok');
		}
	});

	// L2 — la variable de l'objet lui-même
	it('ne met jamais en attente la variable de l’objet', () => {
		const f = a.create({ kind: 'function', name: 'f', definition: 'x^2 - 3x + 1' });
		expect(f.ok && f.object.status).toBe('ok');

		const u = a.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' });
		expect(u.ok && u.object.status).toBe('ok');
	});

	// L3 — les constantes
	it('ne met jamais en attente une constante', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'e^x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('ok');
	});

	// `\pi` est la bonne écriture d'une constante grecque en syntaxe custom —
	// et c'est ce que MathLive produit.
	it('reconnaît \\pi comme une constante', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: '2\\pi*x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('ok');
	});

	// `pi` écrit sans barre oblique est un produit `p·i`, comme `xy` est `x·y`.
	// Ce n'est pas un défaut : c'est la multiplication implicite, et l'atelier
	// le dit clairement en nommant `p`.
	it('lit `pi` sans barre oblique comme le produit p·i', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'pi' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing?.map((m) => m.name)).toEqual(['p']);
	});
	// Cohérence : l'attente se propage à ce qui dépend d'un objet en attente
	it('propage l’attente à ce qui dépend d’un objet en attente', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });
		expect(a.get('g')?.status).toBe('pending');
		expect(a.get('g')?.missing?.map((m) => m.name)).toEqual(['a']);

		a.createFromOffer('a');
		expect(a.get('g')?.status).toBe('ok');
	});

	// L4 — suivi d'une parenthèse : pas d'offre de curseur
	it('n’offre pas de curseur pour un nom suivi d’une parenthèse', () => {
		const r = a.create({ kind: 'function', name: 'g', definition: 'h(x)' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing).toEqual([{ name: 'h', as: 'function' }]);
	});

	// L5 — ignorer l'offre ne crée rien
	it('ne crée rien tant que l’offre n’est pas acceptée', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		expect(a.names).toEqual(['f']);
		expect(a.get('f')?.status).toBe('pending');
	});

	// L6 — la faute de frappe se lit comme un manque
	it('montre le nom parasite d’une faute de frappe', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'xz' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing).toEqual([{ name: 'z', as: 'value' }]);
	});

	// E1 — l'erreur prime sur l'attente
	it('reste en erreur quand la définition est illisible ET cite un inconnu', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*x ^^ 2' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('error');
	});

	// E2 — la circularité prime aussi
	it('reste en erreur quand il y a circularité ET un inconnu', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x)' });
		a.update('f', 'g(x) + b');
		expect(a.get('f')?.status).toBe('error');
		expect(a.get('f')?.message?.toLowerCase()).toContain('circulaire');
	});

	// E3 — l'offre sur un nom devenu pris
	it('refuse l’offre quand le nom vient d’être pris', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		a.create({ kind: 'sequence', name: 'a', definition: 'n' });
		expect(a.createFromOffer('a').ok).toBe(false);
	});

	// L'offre n'a de sens que pour un nom réellement attendu
	it('refuse l’offre pour un nom que personne n’attend', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		expect(a.createFromOffer('a').ok).toBe(false);
	});
});
