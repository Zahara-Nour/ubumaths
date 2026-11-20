import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractRollback } from '../../tests/helpers/database/migration-rollback';
import type { ModeleFichier } from '../lib/lot-questions';
import {
	analyserVariations,
	examinerModele,
	genererMigration,
	nomMigration,
	type LigneProd,
	type ModeleMigre
} from '../lib/migration-contenu';

// ============================================================================
// CONSTANTES
// ============================================================================

const ID = '0000000a-0000-4000-8000-000000000000';
const V1 = { statement: 'Combien font $2+3$ ?', expectedAnswers: ['5'] };
const V2 = { statement: 'Combien font $4+3$ ?', expectedAnswers: ['7'] };
const V3 = { statement: 'Combien font $9+3$ ?', expectedAnswers: ['12'] };
const SPECS = [{ variation: 0, answer: '5', expected: true }];

// ============================================================================
// FONCTIONS
// ============================================================================

function ligne(plus: Partial<LigneProd> = {}): LigneProd {
	return {
		id: ID,
		title: 'Additions',
		level: 2,
		status: 'published',
		grades: ['2'],
		delay: 20,
		options: null,
		shared: null,
		default_display_options: null,
		exercise_instruction: null,
		description: null,
		variations: [V1, V2],
		test_specs: SPECS,
		...plus
	};
}

function fichier(plus: Record<string, unknown> = {}): ModeleFichier {
	return {
		id: ID,
		title: 'Additions',
		level: 2,
		status: 'published',
		grades: ['2'],
		delay: 20,
		variations: [V1, V2],
		testSpecs: SPECS,
		...plus
	} as unknown as ModeleFichier;
}

function migre(plus: Partial<ModeleMigre> = {}): ModeleMigre {
	return {
		id: ID,
		title: 'Additions',
		fichier: '01-additions.json',
		avant: { variations: [V1, V2], testSpecs: SPECS, description: null },
		apres: { variations: [V1, V2, V3], testSpecs: SPECS, description: null },
		changements: { ajoutees: [3], corrigees: [], specs: false, description: false },
		...plus
	};
}

function ecrire(sql: string): string {
	const chemin = join(mkdtempSync(join(tmpdir(), 'migration-contenu-')), 'm.sql');
	writeFileSync(chemin, sql);
	return chemin;
}

// ============================================================================
// SUITES
// ============================================================================

describe('analyserVariations', () => {
	it('rien ne change : aucune variation ajoutée ni corrigée', () => {
		expect(analyserVariations([V1, V2], [V1, V2])).toEqual({
			ok: true,
			ajoutees: [],
			corrigees: []
		});
	});

	it('l’ordre des clés ne compte pas (jsonb ne le garde pas)', () => {
		const v1Renverse = { expectedAnswers: ['5'], statement: V1.statement };
		expect(analyserVariations([V1], [v1Renverse])).toEqual({
			ok: true,
			ajoutees: [],
			corrigees: []
		});
	});

	it('variation ajoutée à la fin : acceptée, numérotée à partir de 1', () => {
		expect(analyserVariations([V1, V2], [V1, V2, V3])).toEqual({
			ok: true,
			ajoutees: [3],
			corrigees: []
		});
	});

	it('variation existante corrigée : acceptée, signalée', () => {
		const v2Corrigee = { ...V2, statement: 'Combien font $4 + 3$ ?' };
		expect(analyserVariations([V1, V2], [V1, v2Corrigee])).toEqual({
			ok: true,
			ajoutees: [],
			corrigees: [2]
		});
	});

	it('variation retirée : refusée', () => {
		const r = analyserVariations([V1, V2], [V1]);
		expect(r.ok).toBe(false);
		expect(!r.ok && r.erreur).toMatch(/retirée/);
	});

	it('variations échangées : refusées (déplacée)', () => {
		const r = analyserVariations([V1, V2], [V2, V1]);
		expect(r.ok).toBe(false);
		expect(!r.ok && r.erreur).toMatch(/déplacée/);
	});

	it('variation insérée au milieu : refusée (les suivantes sont déplacées)', () => {
		const r = analyserVariations([V1, V2], [V1, V3, V2]);
		expect(r.ok).toBe(false);
		expect(!r.ok && r.erreur).toMatch(/déplacée/);
	});
});

describe('examinerModele', () => {
	it('brouillon : ignoré (create-questions --mettre-a-jour s’en charge)', () => {
		expect(examinerModele('01.json', fichier(), ligne({ status: 'draft' })).sorte).toBe('ignore');
	});

	it('publié identique au fichier : inchangé', () => {
		expect(examinerModele('01.json', fichier(), ligne()).sorte).toBe('inchange');
	});

	it('publié, variation ajoutée : migré, avant = la prod, après = le fichier', () => {
		const e = examinerModele('01.json', fichier({ variations: [V1, V2, V3] }), ligne());
		expect(e.sorte).toBe('migre');
		if (e.sorte !== 'migre') return;
		expect(e.modele.avant).toEqual({ variations: [V1, V2], testSpecs: SPECS, description: null });
		expect(e.modele.apres).toEqual({
			variations: [V1, V2, V3],
			testSpecs: SPECS,
			description: null
		});
		expect(e.modele.changements).toEqual({
			ajoutees: [3],
			corrigees: [],
			specs: false,
			description: false
		});
	});

	it('specs et description changées : migré, signalé', () => {
		const specs = [...SPECS, { variation: 1, answer: '7', expected: true }];
		const e = examinerModele(
			'01.json',
			fichier({ testSpecs: specs, description: 'Somme' }),
			ligne()
		);
		expect(e.sorte === 'migre' && e.modele.changements).toEqual({
			ajoutees: [],
			corrigees: [],
			specs: true,
			description: true
		});
	});

	it('description absente du fichier et nulle en prod : rien ne change', () => {
		expect(examinerModele('01.json', fichier(), ligne({ description: null })).sorte).toBe(
			'inchange'
		);
	});

	it('variation retirée : refusé', () => {
		const e = examinerModele('01.json', fichier({ variations: [V1] }), ligne());
		expect(e.sorte === 'refuse' && e.erreur).toMatch(/01\.json.*retirée/);
	});

	it('champ que la migration ne touche pas (niveaux) différent : refusé avec la différence', () => {
		const e = examinerModele('01.json', fichier({ grades: ['2', '1spe'] }), ligne());
		expect(e.sorte === 'refuse' && e.erreur).toMatch(/grades/);
	});

	it('statut ni brouillon ni publié : refusé', () => {
		const e = examinerModele('01.json', fichier(), ligne({ status: 'archived' }));
		expect(e.sorte).toBe('refuse');
	});
});

describe('genererMigration', () => {
	const ENTETE = {
		lot: '2de-nombres',
		source: 'scripts/questions/2de-nombres',
		date: '2026-11-20'
	};

	it('en-tête : chaque modèle, ses variations ajoutées et corrigées, l’accès', () => {
		const sql = genererMigration(ENTETE, [
			migre(),
			migre({
				id: '0000000b-0000-4000-8000-000000000000',
				title: 'Soustractions',
				changements: { ajoutees: [], corrigees: [1, 2], specs: true, description: false }
			})
		]);
		expect(sql).toContain('0000000a « Additions »');
		expect(sql).toMatch(/variation\(s\) ajoutée\(s\) : 3/);
		expect(sql).toMatch(/⚠️ variation\(s\) corrigée\(s\) : 1, 2/);
		expect(sql).toMatch(/specs modifiées/);
		expect(sql).toMatch(/personne ne gagne ni ne perd d'accès/);
		expect(sql).toContain('scripts/questions/migration-contenu.ts');
	});

	it('un seul bloc do : tout ou rien', () => {
		const sql = genererMigration(ENTETE, [
			migre(),
			migre({ id: '0000000b-0000-4000-8000-000000000000' })
		]);
		const corps = sql.split('\n').filter((l) => !l.startsWith('--'));
		expect(corps.filter((l) => l.startsWith('do $'))).toHaveLength(1);
	});

	it('ne touche ni titre, ni statut, ni niveaux, ni nœud', () => {
		const sql = genererMigration(ENTETE, [migre()]);
		expect(sql).not.toMatch(/set[^;]*\b(title|status|grades|classification_node_id)\s*=/);
	});

	it('le rollback s’extrait, sans contrôle de transaction, et rend le contenu d’avant', () => {
		const chemin = ecrire(genererMigration(ENTETE, [migre()]));
		const retour = extractRollback(chemin);
		expect(retour).toContain('do $');
		expect(retour).toContain(JSON.stringify(V3.statement).slice(1, -1));
	});

	it('balises de dollar absentes du contenu', () => {
		const piege = { statement: 'les prix $q$ et $contenu$ et $retour$', expectedAnswers: ['1'] };
		const sql = genererMigration(ENTETE, [
			migre({ apres: { variations: [V1, V2, piege], testSpecs: SPECS, description: null } })
		]);
		const blocs = [...sql.matchAll(/^(?:-- )?do \$(contenu|retour)(\d*)\$$/gm)];
		expect(blocs.map((m) => m[1])).toEqual(['retour', 'contenu']);
		const s = blocs[0][2];
		expect(s).not.toBe('');
		expect(sql).toContain(`$q${s}$[`);
		for (const b of [`$q${s}$`, `$contenu${s}$`, `$retour${s}$`]) {
			expect(JSON.stringify(piege)).not.toContain(b);
		}
	});

	it('description multiligne : encodée sur une seule ligne (rollback commenté ligne à ligne)', () => {
		const sql = genererMigration(ENTETE, [
			migre({
				apres: { variations: [V1, V2, V3], testSpecs: SPECS, description: 'ligne 1\nligne 2' },
				changements: { ajoutees: [3], corrigees: [], specs: false, description: true }
			})
		]);
		expect(sql).not.toContain('ligne 1\nligne 2');
		expect(sql).toContain('ligne 1\\nligne 2');
	});

	it('aucun modèle : refuse d’écrire une migration vide', () => {
		expect(() => genererMigration(ENTETE, [])).toThrow(/aucun modèle/);
	});
});

describe('nomMigration', () => {
	it('horodatage + lot, tirets changés en soulignés', () => {
		expect(nomMigration('20261120120000', 'scripts/questions/2de-nombres/')).toBe(
			'20261120120000_questions_2de_nombres_contenu'
		);
	});
});
