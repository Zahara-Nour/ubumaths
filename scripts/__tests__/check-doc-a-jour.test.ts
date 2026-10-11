/**
 * La garde « code modifié ⇒ doc modifiée »
 * ========================================
 *
 * Chaque doc de docs/systeme/ (et certaines de docs/pratiques/) déclare dans son
 * en-tête le code qu'elle décrit (`couvre:`). La garde exige :
 * - qu'une PR qui modifie un fichier couvert modifie aussi la doc qui le couvre,
 *   sauf exemption explicite `Doc-inchangée: <raison>` dans un commit ;
 * - que chaque fichier de code soit couvert par une doc, exclu, ou listé comme
 *   trou (zone sans doc, connue).
 *
 * Ce qui est gardé ici : la lecture de l'en-tête, le calcul des docs à mettre à
 * jour, l'exemption, la couverture. Aucun test ne lit docs/ : tout est en chaînes.
 */

import { describe, it, expect } from 'vitest';
import {
	parseCouvre,
	parseIndexe,
	docsToUpdate,
	hasDocExemption,
	uncoveredFiles,
	type DocCoverage,
	type CoverageConfig
} from '../check-doc-a-jour';

const CONFIG: CoverageConfig = {
	scope: ['src/lib/**', 'src/routes/**', 'supabase/migrations/**'],
	excluded: ['**/__tests__/**', '**/*.test.*', 'src/lib/types/database.ts', '**/*.md'],
	trous: [{ glob: 'src/lib/legacy/**', note: 'doc à écrire' }]
};

const DOCS: DocCoverage[] = [
	{
		doc: 'docs/systeme/atelier.md',
		couvre: ['src/lib/atelier/**', 'src/routes/(public)/atelier/**']
	},
	{ doc: 'docs/systeme/base-de-donnees.md', couvre: ['supabase/migrations/**'] },
	{
		doc: 'docs/systeme/grapheur.md',
		couvre: ['src/lib/grapheur/**', 'src/lib/atelier/graph-*.ts']
	},
	{
		doc: 'docs/systeme/serveur.md',
		couvre: ['src/lib/server/middleware/**'],
		indexe: ['src/lib/server/*.ts']
	}
];

describe('parseCouvre — l’en-tête d’une doc', () => {
	it('lit une liste YAML', () => {
		const md =
			'---\ntitle: x\ncouvre:\n  - src/lib/atelier/**\n  - "src/routes/(public)/atelier/**"\n---\n# Atelier';
		expect(parseCouvre(md)).toEqual(['src/lib/atelier/**', 'src/routes/(public)/atelier/**']);
	});

	it('lit une liste en ligne', () => {
		expect(parseCouvre('---\ncouvre: [src/lib/a/**, src/lib/b.ts]\n---\n')).toEqual([
			'src/lib/a/**',
			'src/lib/b.ts'
		]);
	});

	it('rend une liste vide sans en-tête ou sans clé', () => {
		expect(parseCouvre('# Doc sans en-tête')).toEqual([]);
		expect(parseCouvre('---\ntitle: x\n---\n')).toEqual([]);
	});
});

describe('parseIndexe — le code qu’une doc recense sans le décrire', () => {
	it('lit la clé indexe à côté de couvre', () => {
		const md =
			'---\ncouvre:\n  - src/lib/server/middleware/**\nindexe:\n  - src/lib/server/*.ts\n---\n';
		expect(parseCouvre(md)).toEqual(['src/lib/server/middleware/**']);
		expect(parseIndexe(md)).toEqual(['src/lib/server/*.ts']);
	});
});

describe('docsToUpdate — les docs qu’une PR doit modifier', () => {
	it('exige la doc qui couvre un fichier modifié', () => {
		expect(docsToUpdate(['src/lib/atelier/calcul.ts'], DOCS, CONFIG)).toEqual([
			{ doc: 'docs/systeme/atelier.md', files: ['src/lib/atelier/calcul.ts'] }
		]);
	});

	it('n’exige rien si la doc est modifiée dans la même PR', () => {
		expect(
			docsToUpdate(['src/lib/atelier/calcul.ts', 'docs/systeme/atelier.md'], DOCS, CONFIG)
		).toEqual([]);
	});

	it('exige chaque doc quand un fichier est couvert par deux', () => {
		const missing = docsToUpdate(['src/lib/atelier/graph-sync.ts'], DOCS, CONFIG).map((m) => m.doc);
		expect(missing).toEqual(['docs/systeme/atelier.md', 'docs/systeme/grapheur.md']);
	});

	it('ignore les tests, les fichiers générés et le hors périmètre', () => {
		expect(
			docsToUpdate(
				[
					'src/lib/atelier/__tests__/calcul.test.ts',
					'src/lib/atelier/x.test.ts',
					'src/lib/types/database.ts',
					'package.json',
					'docs/pratiques/git-workflow.md'
				],
				DOCS,
				CONFIG
			)
		).toEqual([]);
	});

	it('n’exige pas une doc qui ne fait qu’indexer le fichier', () => {
		expect(docsToUpdate(['src/lib/server/chapters.ts'], DOCS, CONFIG)).toEqual([]);
		expect(
			docsToUpdate(['src/lib/server/middleware/auth.ts'], DOCS, CONFIG).map((m) => m.doc)
		).toEqual(['docs/systeme/serveur.md']);
	});

	it('couvre une migration par la doc de la base', () => {
		expect(
			docsToUpdate(['supabase/migrations/20261010_x.sql'], DOCS, CONFIG).map((m) => m.doc)
		).toEqual(['docs/systeme/base-de-donnees.md']);
	});
});

describe('hasDocExemption — l’échappatoire explicite', () => {
	it('reconnaît la ligne Doc-inchangée avec une raison', () => {
		expect(hasDocExemption(['refactor(x): renomme\n\nDoc-inchangée: renommage interne'])).toBe(
			true
		);
	});

	it('refuse une exemption sans raison', () => {
		expect(hasDocExemption(['fix: x\n\nDoc-inchangée:'])).toBe(false);
		expect(hasDocExemption(['fix: x\n\nDoc-inchangée:   '])).toBe(false);
	});

	it('ne la confond pas avec une mention dans le texte', () => {
		expect(hasDocExemption(['docs: explique la règle Doc-inchangée: dans CLAUDE.md'])).toBe(false);
	});
});

describe('uncoveredFiles — chaque fichier de code a sa doc', () => {
	it('signale un fichier du périmètre couvert par aucune doc', () => {
		expect(uncoveredFiles(['src/lib/neuf/a.ts', 'src/lib/atelier/b.ts'], DOCS, CONFIG)).toEqual([
			'src/lib/neuf/a.ts'
		]);
	});

	it('compte un fichier indexé comme couvert', () => {
		expect(uncoveredFiles(['src/lib/server/chapters.ts'], DOCS, CONFIG)).toEqual([]);
	});

	it('ne signale ni les exclus, ni les trous connus, ni le hors périmètre', () => {
		expect(
			uncoveredFiles(
				[
					'src/lib/legacy/x.ts',
					'src/lib/neuf/__tests__/a.test.ts',
					'src/lib/neuf/README.md',
					'scripts/x.ts'
				],
				DOCS,
				CONFIG
			)
		).toEqual([]);
	});
});
