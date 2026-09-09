/**
 * Extraction des références d'un contenu de séance
 * ================================================
 *
 * Ces références commandent la couverture du programme : ce que le prof cite
 * dans sa séance devient ce que la séance a travaillé. Une extraction trop
 * large compterait des points non travaillés, une trop étroite en oublierait —
 * et dans les deux cas le suivi mentirait en silence.
 *
 * Le test le plus important est le dernier : il vérifie que l'extracteur et le
 * parser d'affichage acceptent EXACTEMENT les mêmes types. S'ils divergeaient,
 * une référence s'afficherait comme un lien sans compter dans la couverture.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import { extractResourceReferences, referenceIdsOfKind, referencesToLabels } from '../references';
import { RESOURCE_KINDS } from '../kinds';

const EX = '11111111-1111-4111-8111-111111111111';
const WE = '22222222-2222-4222-8222-222222222222';

describe('extractResourceReferences', () => {
	it('extrait une référence isolée', () => {
		const refs = extractResourceReferences(`Voir [[exercise:${EX}|Fractions n°12]]`);

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({ kind: 'exercise', id: EX, label: 'Fractions n°12', selection: null });
	});

	it('extrait depuis PLUSIEURS contenus — énoncé et devoirs', () => {
		const refs = extractResourceReferences(
			`En classe : [[exercise:${EX}|Exo A]]`,
			`Pour jeudi : [[worksheet_exercise:${WE}|Exercice 3 — Dérivées]]`
		);

		expect(refs.map((r) => r.kind).sort()).toEqual(['exercise', 'worksheet_exercise']);
	});

	it('dédoublonne : citer deux fois ne travaille pas deux fois', () => {
		const refs = extractResourceReferences(
			`[[exercise:${EX}|Exo A]] et encore [[exercise:${EX}|Exo A]]`,
			`Et dans les devoirs : [[exercise:${EX}|Exo A]]`
		);

		expect(refs).toHaveLength(1);
	});

	it('ignore un type inconnu plutôt que de le compter', () => {
		expect(extractResourceReferences(`[[licorne:${EX}|Rien]]`)).toEqual([]);
	});

	it('ignore un uuid mal formé', () => {
		expect(extractResourceReferences('[[exercise:pas-un-uuid|Rien]]')).toEqual([]);
	});

	it('tolère les contenus vides ou absents', () => {
		expect(extractResourceReferences(null, undefined, '')).toEqual([]);
	});

	it('filtre par type pour une requête `in(...)`', () => {
		const refs = extractResourceReferences(`[[exercise:${EX}|A]] [[worksheet_exercise:${WE}|B]]`);

		expect(referenceIdsOfKind(refs, 'exercise')).toEqual([EX]);
		expect(referenceIdsOfKind(refs, 'worksheet_exercise')).toEqual([WE]);
		expect(referenceIdsOfKind(refs, 'chapter')).toEqual([]);
	});
});

describe("l'extracteur et le parser acceptent les mêmes types", () => {
	// Deux grammaires écrites séparément finissent par diverger. Si le parser
	// affiche un lien que l'extracteur ignore, la couverture manque un point sans
	// que rien ne le signale.
	it.each([...RESOURCE_KINDS])('%s : affiché ET extrait', (kind) => {
		const markdown = `[[${kind}:${EX}|Une ressource]]`;

		const [block] = parseMarkdown(markdown).children;
		expect(block.type).toBe('paragraph');
		if (block.type !== 'paragraph') return;
		expect(block.children[0].type).toBe('internal-link');

		expect(extractResourceReferences(markdown)).toHaveLength(1);
	});
});

// ============================================================================
// SÉLECTION D'EXERCICES DANS UNE RÉFÉRENCE DE FICHE
// ============================================================================

describe('sélection `#3,5-7`', () => {
	const FICHE = '8443f4b7-1d0b-4035-9852-6ac06b63e89f';

	it('extrait la sélection, sans son `#`', () => {
		const [reference] = extractResourceReferences(
			`<p>[[worksheet:${FICHE}#3,5-7|Produit scalaire]]</p>`
		);

		expect(reference.kind).toBe('worksheet');
		expect(reference.id).toBe(FICHE);
		expect(reference.selection).toBe('3,5-7');
	});

	it('une fiche citée entière n’a AUCUNE sélection', () => {
		// Distinction porteuse de sens : sans sélection, aucun point de programme.
		const [reference] = extractResourceReferences(`<p>[[worksheet:${FICHE}|Produit scalaire]]</p>`);

		expect(reference.selection).toBeNull();
	});

	it('deux sélections différentes de la MÊME fiche comptent pour deux', () => {
		// Le dédoublonnage porte sur la clé complète : citer les exercices 3 puis 7
		// désigne bien deux choses, et les deux doivent nourrir la couverture.
		const references = extractResourceReferences(
			`<p>[[worksheet:${FICHE}#3|A]] et [[worksheet:${FICHE}#7|B]]</p>`
		);

		expect(references).toHaveLength(2);
		expect(references.map((r) => r.selection)).toEqual(['3', '7']);
	});

	it('la même sélection citée deux fois ne compte qu’une', () => {
		const references = extractResourceReferences(
			`<p>[[worksheet:${FICHE}#3|A]] puis [[worksheet:${FICHE}#3|encore]]</p>`
		);

		expect(references).toHaveLength(1);
	});

	it('une sélection ne casse pas la reconnaissance de la référence', () => {
		// Avant cette grammaire, un `#` après l'uuid rompait le motif : la
		// référence n'était plus reconnue DU TOUT, ni pour l'affichage ni pour la
		// couverture, et s'affichait en texte brut.
		const references = extractResourceReferences(
			`<p>[[worksheet:${FICHE}#3,5-7|Produit scalaire]]</p>`
		);

		expect(references).toHaveLength(1);
	});
});

describe('referencesToLabels', () => {
	const FICHE = '8443f4b7-1d0b-4035-9852-6ac06b63e89f';

	// Cette fonction alimente TROIS aperçus tronqués — la grille de la semaine,
	// les cartes de séance, et le cahier de texte de l'élève. Elle lit les groupes
	// de `REFERENCE_REGEX` par position : ajouter un groupe à la grammaire sans
	// décaler ici faisait recevoir `undefined` au libellé, donc lever, donc rendre
	// la page blanche. Ces tests existent pour que ça ne repasse plus.

	it('remplace une référence SANS sélection par son libellé', () => {
		expect(referencesToLabels(`Faire [[exercise:${EX}|Fractions n°12]] pour jeudi`)).toBe(
			'Faire Fractions n°12 pour jeudi'
		);
	});

	it('remplace une référence AVEC sélection par son libellé', () => {
		// Le libellé écrit par le sélecteur nomme déjà les exercices
		// (« Produit scalaire — ex. 3 et 5 à 7 ») : rien à rajouter ici.
		expect(
			referencesToLabels(`Faire [[worksheet:${FICHE}#3,5-7|Produit scalaire — ex. 3 et 5 à 7]]`)
		).toBe('Faire Produit scalaire — ex. 3 et 5 à 7');
	});

	it('laisse intact ce qui ressemble à une référence sans en être une', () => {
		const texte = `Voir [[inconnu:${EX}|Quelque chose]]`;
		expect(referencesToLabels(texte)).toBe(texte);
	});

	it('rend une chaîne vide pour un contenu absent', () => {
		expect(referencesToLabels(null)).toBe('');
		expect(referencesToLabels(undefined)).toBe('');
	});
});
