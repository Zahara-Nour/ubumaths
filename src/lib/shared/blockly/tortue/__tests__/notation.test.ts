import { describe, expect, it } from 'vitest';

import { executerTortue } from '../interpreteur';
import { etatVersTexte, LONGUEUR_MAX_PROGRAMME, texteVersEtat } from '../notation';
import { MAX_ANSWER_LENGTH } from '$lib/questions/submission';

// =============================================================================
// Aides
// =============================================================================

function nombre(valeur: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeur } } };
}

function bloc(type: string, reste: Record<string, unknown> = {}) {
	return { type, id: Math.random().toString(36).slice(2), ...reste };
}

/** Enchaîne des blocs par `next`. */
function pile(...blocs: Record<string, unknown>[]): Record<string, unknown> {
	for (let i = blocs.length - 2; i >= 0; i--) blocs[i].next = { block: blocs[i + 1] };
	return blocs[0];
}

function espace(...piles: Record<string, unknown>[]) {
	return { blocks: { languageVersion: 0, blocks: piles } };
}

/** Tracé du texte, rejoué par l'interpréteur. */
function trace(texte: string) {
	const lu = texteVersEtat(texte);
	if (!lu.ok) throw new Error(lu.message);
	return executerTortue(lu.etat);
}

const CARRE = pile(
	bloc('controls_repeat', {
		fields: { TIMES: 4 },
		inputs: {
			DO: {
				block: pile(
					bloc('tortue_avancer', { inputs: { VALEUR: nombre(3) } }),
					bloc('tortue_droite', { inputs: { ANGLE: nombre(90) } })
				)
			}
		}
	})
);

// =============================================================================
// Des blocs vers le texte
// =============================================================================

describe('etatVersTexte', () => {
	it('carré : une répétition et son contenu', () => {
		expect(etatVersTexte(espace({ ...CARRE, x: 10, y: 10 }))).toEqual({
			ok: true,
			texte: 'répéter 4 [ avancer 3 ; tourner à droite 90 ]'
		});
	});

	it('toutes les instructions, nombres décimaux écrits avec une virgule', () => {
		const etat = espace(
			pile(
				bloc('tortue_reculer', { inputs: { VALEUR: nombre(2.5) } }),
				bloc('tortue_gauche', { inputs: { ANGLE: nombre(45) } }),
				bloc('tortue_lever_stylo'),
				bloc('tortue_avancer', { inputs: { VALEUR: nombre(-1) } }),
				bloc('tortue_baisser_stylo')
			)
		);
		expect(etatVersTexte(etat)).toEqual({
			ok: true,
			texte: 'reculer 2,5 ; tourner à gauche 45 ; lever le stylo ; avancer -1 ; baisser le stylo'
		});
	});

	it('entrée vide : 0, comme l’interpréteur', () => {
		expect(etatVersTexte(espace(pile(bloc('tortue_avancer'))))).toEqual({
			ok: true,
			texte: 'avancer 0'
		});
	});

	it('plusieurs piles : de haut en bas, comme l’exécution', () => {
		const basse = {
			...pile(bloc('tortue_avancer', { inputs: { VALEUR: nombre(2) } })),
			x: 0,
			y: 200
		};
		const haute = {
			...pile(bloc('tortue_gauche', { inputs: { ANGLE: nombre(90) } })),
			x: 0,
			y: 10
		};
		expect(etatVersTexte(espace(basse, haute))).toEqual({
			ok: true,
			texte: 'tourner à gauche 90 ; avancer 2'
		});
	});

	it('bloc désactivé et nombre posé seul : ignorés, comme à l’exécution', () => {
		const etat = espace(
			pile(
				bloc('tortue_avancer', { inputs: { VALEUR: nombre(1) }, enabled: false }),
				bloc('tortue_avancer', { inputs: { VALEUR: nombre(2) } })
			),
			{ ...bloc('math_number', { fields: { NUM: 7 } }), y: 500 }
		);
		expect(etatVersTexte(etat)).toEqual({ ok: true, texte: 'avancer 2' });
	});

	it('« répéter » à entrée valeur : son nombre', () => {
		const etat = espace(pile(bloc('controls_repeat_ext', { inputs: { TIMES: nombre(3) } })));
		expect(etatVersTexte(etat)).toEqual({ ok: true, texte: 'répéter 3 [ ]' });
	});

	it('espace vide : texte vide', () => {
		expect(etatVersTexte(espace())).toEqual({ ok: true, texte: '' });
		expect(etatVersTexte({})).toEqual({ ok: true, texte: '' });
	});

	it('bloc inconnu ou état mal formé : refusé', () => {
		expect(etatVersTexte(espace(pile(bloc('text_print'))))).toMatchObject({ ok: false });
		expect(etatVersTexte('n’importe quoi')).toMatchObject({ ok: false });
	});

	it('même tracé que les blocs', () => {
		const etat = espace(CARRE);
		const texte = etatVersTexte(etat);
		if (!texte.ok) throw new Error('illisible');
		expect(trace(texte.texte).segments).toEqual(executerTortue(etat).segments);
	});
});

// =============================================================================
// Du texte vers les blocs
// =============================================================================

describe('texteVersEtat', () => {
	it('carré : 4 côtés de 3', () => {
		const resultat = trace('répéter 4 [ avancer 3 ; tourner à droite 90 ]');
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toHaveLength(4);
	});

	it('aller-retour : le texte relu redonne le même texte', () => {
		const texte =
			'avancer 2,5 ; répéter 3 [ tourner à gauche 120 ; répéter 2 [ avancer 1 ] ] ; lever le stylo ; reculer 1 ; baisser le stylo';
		const lu = texteVersEtat(texte);
		if (!lu.ok) throw new Error(lu.message);
		expect(etatVersTexte(lu.etat)).toEqual({ ok: true, texte });
	});

	it('écriture souple : accents, majuscules, espaces, retours à la ligne, point décimal', () => {
		const souple = 'Repeter 4 [\n  avancer 3.5\n  tourner a droite 90\n]';
		expect(trace(souple).segments).toEqual(
			trace('répéter 4 [ avancer 3,5 ; tourner à droite 90 ]').segments
		);
	});

	it('point-virgule final ou doublé : sans effet', () => {
		expect(trace('avancer 1 ;; avancer 1 ;').segments).toHaveLength(2);
	});

	it('texte vide : programme vide, rien de tracé', () => {
		const resultat = trace('   ');
		expect(resultat.ok).toBe(true);
		expect(resultat.segments).toEqual([]);
	});

	it('instruction inconnue : message qui la cite', () => {
		const lu = texteVersEtat('avancer 3 ; sauter 2');
		expect(lu.ok).toBe(false);
		if (!lu.ok) expect(lu.message).toContain('sauter 2');
	});

	it('nombre absent ou illisible : refusé', () => {
		expect(texteVersEtat('avancer')).toMatchObject({ ok: false });
		expect(texteVersEtat('avancer trois')).toMatchObject({ ok: false });
		expect(texteVersEtat('tourner à droite 9O')).toMatchObject({ ok: false });
	});

	it('répéter : nombre entier positif ou nul, crochets fermés', () => {
		expect(texteVersEtat('répéter 2,5 [ avancer 1 ]')).toMatchObject({ ok: false });
		expect(texteVersEtat('répéter -1 [ avancer 1 ]')).toMatchObject({ ok: false });
		expect(texteVersEtat('répéter 4 [ avancer 1')).toMatchObject({ ok: false });
		expect(texteVersEtat('avancer 1 ]')).toMatchObject({ ok: false });
		expect(texteVersEtat('répéter 4 avancer 1')).toMatchObject({ ok: false });
	});

	it('retour à la ligne précédé d’une espace, ou `\\r\\n` : séparateur', () => {
		const attendu = trace('avancer 3 ; tourner à droite 90 ; avancer 2');
		for (const texte of [
			'avancer 3 \ntourner à droite 90\n avancer 2',
			'avancer 3\r\ntourner à droite 90\r\navancer 2',
			'avancer 3\rtourner à droite 90 \r\n avancer 2'
		]) {
			expect(trace(texte).segments).toEqual(attendu.segments);
		}
	});

	it('longueur d’une réponse tronquée par l’envoi : refusée ; un caractère de moins : lue', () => {
		const juste = 'avancer 1' + ' '.repeat(LONGUEUR_MAX_PROGRAMME - 'avancer 1'.length);
		expect(juste).toHaveLength(MAX_ANSWER_LENGTH - 1);
		expect(texteVersEtat(juste)).toMatchObject({ ok: true });
		expect(texteVersEtat(juste + ' ')).toMatchObject({
			ok: false,
			message: 'Programme trop long.'
		});
	});

	it('imbrication trop profonde ou texte trop long : refusé sans planter', () => {
		const profond = 'répéter 1 [ '.repeat(200) + 'avancer 1' + ' ]'.repeat(200);
		expect(texteVersEtat(profond)).toMatchObject({ ok: false });
		expect(texteVersEtat('avancer 1 ; '.repeat(LONGUEUR_MAX_PROGRAMME))).toMatchObject({
			ok: false
		});
	});
});
