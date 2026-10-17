/**
 * La garde « code modifié ⇒ doc modifiée »
 * ========================================
 *
 * Chaque doc de docs/systeme/ (et certaines de docs/pratiques/) déclare dans son
 * en-tête le code qu'elle décrit (`couvre:`). La garde exige :
 * - qu'une PR qui modifie un fichier couvert modifie aussi la doc qui le couvre,
 *   sauf exemption explicite `Doc-inchangée: <raison>` dans un commit ;
 * - que chaque fichier de code soit couvert par une doc, exclu, ou listé comme
 *   trou (zone sans doc, connue) ;
 * - « doc d'abord » : qu'une PR qui touche un trou écrive la doc de la zone, sauf
 *   report explicite `Doc-reportée: <raison>` (zone trop grosse, David tranche) ;
 * - qu'un trou dont la zone a sa doc sorte de la liste.
 *
 * Ce qui est gardé ici : la lecture de l'en-tête, le calcul des docs à mettre à
 * jour, l'exemption, la couverture. Aucun test ne lit docs/ : tout est en chaînes.
 */

import { describe, it, expect } from 'vitest';
import {
	parseCouvre,
	readDoc,
	docsToUpdate,
	hasDocExemption,
	hasDocDeferral,
	holesTouched,
	staleHoles,
	uncoveredFiles,
	type DocCoverage,
	type CoverageConfig
} from '../check-doc-a-jour';
import { COVERAGE_CONFIG } from '../doc-a-jour.config';

const CONFIG: CoverageConfig = {
	scope: ['src/lib/**', 'src/routes/**', 'supabase/migrations/**'],
	excluded: ['**/__tests__/**', '**/*.test.*', 'src/lib/types/database.ts', '**/*.md'],
	trous: [{ glob: 'src/lib/legacy/**', note: 'doc à écrire' }]
};

// Un index : serveur.md décrit le middleware et cite tout src/lib/server/ dans une
// table. Jusqu'au 2026-10-12, la clé `indexe:` comptait pour la couverture : le glob
// avalait en silence chaque module neuf, que « doc d'abord » ne voyait jamais.
const SERVEUR_MD =
	'---\ncouvre:\n  - src/lib/server/middleware/**\nindexe:\n  - src/lib/server/*.ts\n---\n';

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
	readDoc('docs/systeme/serveur.md', SERVEUR_MD)
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

describe('readDoc — seul couvre compte', () => {
	it('ne retient d’un en-tête que le code décrit, pas un index', () => {
		expect(readDoc('docs/systeme/serveur.md', SERVEUR_MD)).toEqual({
			doc: 'docs/systeme/serveur.md',
			couvre: ['src/lib/server/middleware/**']
		});
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

	it('signale un fichier qu’une doc ne fait que citer dans un index', () => {
		expect(uncoveredFiles(['src/lib/server/chapters.ts'], DOCS, CONFIG)).toEqual([
			'src/lib/server/chapters.ts'
		]);
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

// Trous de fixture : une zone sans doc (legacy), un fichier que serveur.md cite
// sans le décrire (indexer n'est pas décrire), une zone de deux globs sous la même
// note, et une zone que atelier.md décrit déjà (trou périmé).
const HOLES_CONFIG: CoverageConfig = {
	...CONFIG,
	trous: [
		{ glob: 'src/lib/legacy/**', note: 'ancien code' },
		{ glob: 'src/lib/server/chapters.ts', note: 'cours' },
		{ glob: 'src/routes/(protected)/cours/**', note: 'cours' },
		{ glob: 'src/lib/atelier/vieux/**', note: 'atelier ancien' }
	]
};

describe('holesTouched — doc d’abord : les zones sans doc qu’une PR touche', () => {
	it('signale une zone sans doc touchée, fichiers groupés par zone', () => {
		expect(
			holesTouched(
				['src/lib/legacy/a.ts', 'src/lib/legacy/b.ts', 'src/lib/atelier/c.ts'],
				DOCS,
				HOLES_CONFIG
			)
		).toEqual([{ note: 'ancien code', files: ['src/lib/legacy/a.ts', 'src/lib/legacy/b.ts'] }]);
	});

	it('réunit les globs d’une même zone', () => {
		expect(
			holesTouched(
				['src/lib/server/chapters.ts', 'src/routes/(protected)/cours/+page.svelte'],
				DOCS,
				HOLES_CONFIG
			)
		).toEqual([
			{
				note: 'cours',
				files: ['src/lib/server/chapters.ts', 'src/routes/(protected)/cours/+page.svelte']
			}
		]);
	});

	it('compte un fichier seulement indexé comme sans doc', () => {
		expect(holesTouched(['src/lib/server/chapters.ts'], DOCS, HOLES_CONFIG)).toEqual([
			{ note: 'cours', files: ['src/lib/server/chapters.ts'] }
		]);
	});

	it('ignore un fichier qu’une doc décrit déjà, même listé en trou', () => {
		expect(holesTouched(['src/lib/atelier/vieux/x.ts'], DOCS, HOLES_CONFIG)).toEqual([]);
	});

	it('ignore les tests et le hors périmètre', () => {
		// Un trou qui déborde du périmètre : seul le contrôle de `scope` écarte scripts/
		const config = {
			...HOLES_CONFIG,
			trous: [...HOLES_CONFIG.trous, { glob: '**/legacy*', note: 'x' }]
		};
		expect(
			holesTouched(['src/lib/legacy/__tests__/a.test.ts', 'scripts/legacy.ts'], DOCS, config)
		).toEqual([]);
	});
});

describe('hasDocDeferral — le report décidé par David', () => {
	it('reconnaît la ligne Doc-reportée avec une raison', () => {
		expect(
			hasDocDeferral(['fix(x): y\n\nDoc-reportée: zone cours trop grosse, accord de David'])
		).toBe(true);
	});

	it('refuse un report sans raison', () => {
		expect(hasDocDeferral(['fix: x\n\nDoc-reportée:'])).toBe(false);
	});

	it('ne prend pas une exemption Doc-inchangée pour un report', () => {
		expect(hasDocDeferral(['fix: x\n\nDoc-inchangée: renommage interne'])).toBe(false);
	});
});

describe('staleHoles — un trou dont la zone a sa doc sort de la liste', () => {
	const FILES = [
		'src/lib/legacy/a.ts',
		'src/lib/server/chapters.ts',
		'src/routes/(protected)/cours/+page.svelte',
		'src/lib/atelier/vieux/x.ts'
	];

	it('signale un trou qu’une doc décrit entièrement', () => {
		expect(staleHoles(FILES, DOCS, HOLES_CONFIG)).toEqual([
			{ glob: 'src/lib/atelier/vieux/**', note: 'atelier ancien' }
		]);
	});

	it('signale un trou qui ne désigne plus aucun fichier gardé', () => {
		const files = FILES.filter((f) => !f.startsWith('src/lib/legacy/')).concat(
			'src/lib/legacy/__tests__/a.test.ts'
		);
		expect(staleHoles(files, DOCS, HOLES_CONFIG).map((t) => t.glob)).toEqual([
			'src/lib/legacy/**',
			'src/lib/atelier/vieux/**'
		]);
	});

	it('garde un trou dont un fichier n’est qu’indexé', () => {
		expect(staleHoles(FILES, DOCS, HOLES_CONFIG).map((t) => t.glob)).not.toContain(
			'src/lib/server/chapters.ts'
		);
	});
});

describe('COVERAGE_CONFIG — chaque trou nomme sa zone', () => {
	it('porte une note, affichée quand une PR touche la zone', () => {
		const sansNote = COVERAGE_CONFIG.trous.filter((t) => !t.note?.trim()).map((t) => t.glob);
		expect(sansNote).toEqual([]);
	});

	it('range un fichier dans la zone précise quand un glob large la contient', () => {
		// Le premier trou qui correspond gagne : trier `trous` rangerait ces fichiers
		// sous la zone large. Config fictive : les zones réelles qui s'emboîtaient ont
		// reçu leur doc (2026-10-13). Aucune doc ici (aucun test ne lit docs/).
		const config: CoverageConfig = {
			...COVERAGE_CONFIG,
			trous: [
				{ glob: 'src/routes/api/{student,students}/*/warnings/**', note: 'précise' },
				{ glob: 'src/routes/api/students/**', note: 'large' }
			]
		};
		const noteOf = (file: string) => holesTouched([file], [], config)[0]?.note;
		expect(noteOf('src/routes/api/students/s1/warnings/+server.ts')).toBe('précise');
		expect(noteOf('src/routes/api/students/s1/+server.ts')).toBe('large');
	});
});

describe('COVERAGE_CONFIG — les fichiers d’environnement sont gardés', () => {
	// La carte de l'environnement de dev couvre la CI, les hooks, Vercel et les
	// scripts d'outillage : leur modification doit la réclamer. Doc fictive qui
	// couvre tout le périmètre (`**` ignorerait les dossiers en point, .github…) :
	// seul le périmètre décide ici. Aucun test ne lit docs/.
	const ENV_DOC: DocCoverage = { doc: 'docs/pratiques/env.md', couvre: COVERAGE_CONFIG.scope };
	const guarded = (files: string[]) =>
		docsToUpdate(files, [ENV_DOC], COVERAGE_CONFIG).flatMap((m) => m.files);

	it('réclame la doc pour la CI, les hooks, Vercel et les scripts d’outillage', () => {
		const env = [
			'.github/workflows/quality.yml',
			'.github/dependabot.yml',
			'.husky/pre-push',
			'vercel.json',
			'svelte.config.js',
			'.claude/settings.json',
			'.claude/hooks/garde-commandes.py',
			'scripts/deploy-prod.sh',
			'scripts/check-incremental.sh'
		];
		expect(guarded(env)).toEqual(env);
	});

	it('laisse hors garde les dépendances, les fichiers internes de husky et les autres scripts', () => {
		expect(
			guarded(['package.json', 'pnpm-lock.yaml', '.husky/_/pre-push', 'scripts/create-teacher.ts'])
		).toEqual([]);
	});
});
