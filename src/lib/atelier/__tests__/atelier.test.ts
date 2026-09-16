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
	it('lit une unité déclarée et ne lui donne pas de curseur', () => {
		const r = a.create({ kind: 'value', definition: '12[km]' });
		expect(r.ok).toBe(true);
		if (!r.ok || !isValue(r.object)) return;
		expect(r.object.unit).toBe('km');
		expect(r.object.slider).toBeUndefined();
		// l'assertion qui manquait : l'unité ne doit pas partir en attente
		expect(r.object.status).toBe('ok');
		expect(r.object.missing).toBeUndefined();
	});

	it('lit une unité composée', () => {
		const r = a.create({ kind: 'value', definition: '3[m/s]' });
		expect(r.ok && isValue(r.object) && r.object.unit).toBe('m/s');
	});

	// ⚠️ L'unité se déclare, elle ne se devine pas : sans crochets, c'est un
	// produit. Lire n'importe quel suffixe comme une unité faisait de « 2pi »
	// une valeur « d'unité pi », et de « 3x » une valeur « d'unité x ».
	it('ne prend pas un suffixe quelconque pour une unité', () => {
		for (const def of ['12 km', '2pi', '3x']) {
			const b = new Atelier();
			const r = b.create({ kind: 'value', name: 'r', definition: def });
			expect(r.ok).toBe(true);
			if (!r.ok || !isValue(r.object)) return;
			expect(r.object.unit).toBeUndefined();
		}
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

// =============================================================================
// #329 — le nommage automatique ne doit pas fabriquer de circularité
// =============================================================================

describe('nommage automatique et collisions (#329)', () => {
	it('ne se nomme pas comme un objet cité par sa propre définition', () => {
		const r = a.create({ kind: 'function', definition: 'f(x)+1' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.name).toBe('g');
		// et le message dit la vérité : il manque f, rien n'est circulaire
		expect(r.object.status).toBe('pending');
		expect(r.object.missing?.map((m) => m.name)).toEqual(['f']);
	});

	it('donne le même message qu’avec un nom choisi par l’élève', () => {
		const auto = a.create({ kind: 'function', definition: 'f(x)+1' });
		const b = new Atelier();
		const explicit = b.create({ kind: 'function', name: 'g', definition: 'f(x)+1' });
		expect(auto.ok && auto.object.status).toBe(explicit.ok && explicit.object.status);
	});

	// Le geste qui a révélé le défaut : coller un énoncé entier
	it('ne crie pas à la circularité quand on colle un énoncé', () => {
		const r = a.create({
			kind: 'function',
			definition: 'Soit f la fonction définie par f(x)=x^2-3x+1'
		});
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.message?.toLowerCase() ?? '').not.toContain('circulaire');
	});

	// Ce qui ne change PAS : un élève qui se cite délibérément
	it('garde la circularité quand l’élève nomme lui-même', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'f(x)+1' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('error');
		expect(r.object.message?.toLowerCase()).toContain('circulaire');
	});
});

// =============================================================================
// §2.5 N7 — le message reste lisible quand beaucoup de noms manquent
// =============================================================================

describe('lisibilité du message d’attente (§2.5 N7)', () => {
	it('énumère tant qu’il n’y a pas plus de trois noms', () => {
		const un = a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		expect(un.ok && un.object.message).toContain('a');

		const b = new Atelier();
		const trois = b.create({ kind: 'function', name: 'f', definition: 'a*b*c*x' });
		expect(trois.ok).toBe(true);
		if (!trois.ok) return;
		expect(trois.object.missing).toHaveLength(3);
		expect(trois.object.message).toContain('a');
		expect(trois.object.message).toContain('b');
		expect(trois.object.message).toContain('c');
	});

	it('compte au lieu d’énumérer au-delà de trois noms', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*b*c*d*x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.missing).toHaveLength(4);
		expect(r.object.message).toContain('4');
		// plus d'énumération : le message ne cite aucun nom
		expect(r.object.message).not.toContain('« a »');
		expect(r.object.message).not.toContain('« d »');
	});

	it('garde le détail dans `missing`, quel que soit le message', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*b*c*d*x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		// l'interface affichera ce détail au survol
		expect(r.object.missing?.map((m) => m.name).sort()).toEqual(['a', 'b', 'c', 'd']);
	});

	it('ne dit jamais « inconnu » — le mot désigne autre chose en maths', () => {
		const r = a.create({ kind: 'function', name: 'f', definition: 'a*b*c*d*x' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.message?.toLowerCase()).not.toContain('inconnu');
	});
});

// =============================================================================
// Correctifs de revue — PR #330
// =============================================================================

describe('renommage d’une suite qui se cite elle-même', () => {
	// La récurrence u_{n+1} = 2·u_n cite `u` : renommer doit réécrire AUSSI sa
	// propre définition, sinon la suite part en attente de son ancien nom.
	it('réécrit sa propre définition', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '2u + 1' });
		const r = a.rename('u', 'v');

		expect(r.ok).toBe(true);
		expect(a.get('v')?.definition).toBe('2v + 1');
		expect(a.get('v')?.status).toBe('ok');
	});

	it('ne se compte pas parmi les objets mis à jour', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '2u + 1' });
		const r = a.rename('u', 'v');
		expect(r.ok && r.updated).toEqual([]);
	});

	it('compte les autres, sans s’oublier lui-même', () => {
		a.create({ kind: 'sequence', name: 'u', definition: '2u + 1' });
		a.create({ kind: 'function', name: 'f', definition: 'u + 1' });
		const r = a.rename('u', 'v');
		expect(r.ok && r.updated).toEqual(['f']);
		expect(a.get('v')?.definition).toBe('2v + 1');
		expect(a.get('f')?.definition).toBe('v + 1');
	});
});

describe('plafonds du v1 (décision D8)', () => {
	it('refuse une liste au-delà de 200 valeurs', () => {
		const long = Array.from({ length: 201 }, (_, i) => i).join(';');
		const r = a.create({ kind: 'list', definition: long });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.object.status).toBe('error');
		expect(r.object.message).toContain('200');
	});

	it('accepte exactement 200 valeurs', () => {
		const ok = Array.from({ length: 200 }, (_, i) => i).join(';');
		const r = a.create({ kind: 'list', definition: ok });
		expect(r.ok && r.object.status).toBe('ok');
	});

	it('refuse une neuvième liste', () => {
		for (let i = 0; i < 8; i++) a.create({ kind: 'list', definition: '1;2' });
		const ninth = a.create({ kind: 'list', definition: '1;2' });
		expect(ninth.ok).toBe(false);
		if (ninth.ok) return;
		expect(ninth.message).toContain('8');
	});
});

// =============================================================================
// Dépendre d'un objet encore vide (finding 4 de la revue #330)
// =============================================================================

describe('dépendre d’un objet incomplet', () => {
	// Le geste : « + Fonction » crée `f` vide (§2.1 N3), puis l'élève écrit `g`.
	// Sans cette règle, `g` s'affichait « ok » alors que rien ne se trace.
	it('met en attente le dépendant d’un objet encore vide', () => {
		a.create({ kind: 'function', name: 'f' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		expect(a.get('f')?.status).toBe('incomplete');
		expect(a.get('g')?.status).toBe('pending');
		expect(a.get('g')?.missing?.map((m) => m.name)).toEqual(['f']);
	});

	it('libère le dépendant dès que l’objet est rempli', () => {
		a.create({ kind: 'function', name: 'f' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });

		a.update('f', 'x^2');
		expect(a.get('g')?.status).toBe('ok');
	});

	// L'objet vide lui-même n'est pas « en attente » : il ne manque de rien,
	// il est juste vide. C'est l'état normal pendant qu'on cherche (§2.1 L2).
	it('laisse l’objet vide en « incomplete », pas en attente', () => {
		a.create({ kind: 'function', name: 'f' });
		expect(a.get('f')?.status).toBe('incomplete');
		expect(a.get('f')?.missing).toBeUndefined();
	});

	it('propage le long d’une chaîne', () => {
		a.create({ kind: 'function', name: 'f' });
		a.create({ kind: 'function', name: 'g', definition: 'f(x) + 1' });
		a.create({ kind: 'function', name: 'h', definition: 'g(x) * 2' });

		expect(a.get('h')?.status).toBe('pending');
		expect(a.get('h')?.missing?.map((m) => m.name)).toEqual(['f']);
	});
});

// =============================================================================
// Sérialisation de l'atelier (§5)
// =============================================================================

describe('sérialisation', () => {
	// ⚠️ Le piège `structuredClone` / proxy `$state` ne se reproduit PAS en node :
	// il est vérifié dans un vrai navigateur par `serialize.svelte.test.ts`.

	it('n’emporte que ce qu’il faut pour reconstruire', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		const snapshot = a.serialize();
		expect(snapshot.objects).toEqual([{ name: 'f', kind: 'function', definition: 'x^2' }]);
		// le statut se recalcule, il ne se range pas
		expect(JSON.stringify(snapshot)).not.toContain('status');
	});

	it('se relit à l’identique', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		a.create({ kind: 'value', name: 'a', definition: '3' });
		const snapshot = a.serialize();

		const restored = new Atelier();
		restored.restore(snapshot);

		expect(restored.names).toEqual(['f', 'a']);
		expect(restored.get('f')?.status).toBe('ok');
	});

	it('recalcule les états au lieu de les croire', () => {
		// Un état rangé quand `a` existait, relu sans `a` : l'atelier doit voir
		// l'attente tout seul, sans qu'on la lui ait rangée.
		const restored = new Atelier();
		restored.restore({
			version: 1,
			objects: [{ name: 'f', kind: 'function', definition: 'a*x' }]
		});

		expect(restored.get('f')?.status).toBe('pending');
		expect(restored.get('f')?.missing?.map((m) => m.name)).toEqual(['a']);
	});

	// ⚠️ Ce test disait « ignore … sans tout perdre » et gravait une perte
	// silencieuse dans le marbre : deux objets disparaissaient sans un mot. Sans
	// compte, l'atelier est la seule mémoire de l'élève — ce qu'on ne peut pas
	// restaurer doit au moins être DIT.
	it('rend compte de ce qu’il n’a pas pu restaurer', () => {
		const restored = new Atelier();
		const report = restored.restore({
			version: 1,
			objects: [
				{ name: 'f', kind: 'function', definition: 'x^2' },
				{ name: '2f', kind: 'function', definition: 'x' },
				{ name: 'g', kind: 'function', definition: 'x^3' }
			]
		});

		expect(restored.names).toEqual(['f', 'g']);
		expect(report.skipped).toHaveLength(1);
		expect(report.skipped[0].name).toBe('2f');
		expect(report.skipped[0].reason).toBeTruthy();
	});

	it('ne perd pas un doublon en silence', () => {
		const restored = new Atelier();
		const report = restored.restore({
			version: 1,
			objects: [
				{ name: 'f', kind: 'function', definition: 'x^2' },
				{ name: 'f', kind: 'function', definition: 'x^3' }
			]
		});

		expect(report.skipped.map((s) => s.name)).toEqual(['f']);
	});

	it('ne signale rien quand tout est restauré', () => {
		const restored = new Atelier();
		const report = restored.restore({
			version: 1,
			objects: [{ name: 'f', kind: 'function', definition: 'x^2' }]
		});

		expect(report.restored).toBe(1);
		expect(report.skipped).toEqual([]);
	});
});

// =============================================================================
// Tracer — l'état d'affichage d'un objet (lot « vue Graphe »)
// =============================================================================

describe('objets tracés', () => {
	it('n’est tracé par défaut', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		expect(a.get('f')?.plotted).toBeFalsy();
	});

	it('se trace et se retire', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });

		a.setPlotted('f', true);
		expect(a.get('f')?.plotted).toBe(true);

		a.setPlotted('f', false);
		expect(a.get('f')?.plotted).toBe(false);
	});

	it('compte comme une modification, donc s’enregistre', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const before = a.revision;

		a.setPlotted('f', true);
		expect(a.revision).toBeGreaterThan(before);
	});

	// L'élève doit retrouver ses courbes au rechargement
	it('survit à un aller-retour par la sérialisation', () => {
		a.create({ kind: 'function', name: 'f', definition: 'x^2' });
		a.create({ kind: 'function', name: 'g', definition: 'x^3' });
		a.setPlotted('f', true);

		const restored = new Atelier();
		restored.restore(a.serialize());

		expect(restored.get('f')?.plotted).toBe(true);
		expect(restored.get('g')?.plotted).toBeFalsy();
	});

	it('ignore un objet qui n’existe pas', () => {
		expect(() => a.setPlotted('inconnu', true)).not.toThrow();
	});

	// On ne trace que ce qui peut l'être — mais on ne l'empêche pas : c'est la
	// vue qui décide quoi afficher, le modèle ne juge pas.
	it('accepte de marquer un objet en attente', () => {
		a.create({ kind: 'function', name: 'f', definition: 'a*x' });
		a.setPlotted('f', true);
		expect(a.get('f')?.plotted).toBe(true);
	});
});
