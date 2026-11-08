/**
 * Page admin des modèles — chargement serveur
 * ===========================================
 *
 * Une seule barre de filtres (haut de page) pour les deux onglets : les
 * brouillons sont filtrés comme les publiés, et « Tout cocher (filtrés) » des
 * publiés porte sur TOUS les filtrés, pas seulement la page de 50 affichée.
 *
 * La base est simulée en mémoire ; le faux constructeur plafonne chaque requête
 * à 1000 lignes, comme PostgREST.
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+page.server';
import type { PageServerData } from '../$types';

// ============================================================================
// TYPES
// ============================================================================

type Row = Record<string, unknown>;
type LoadEvent = Parameters<typeof load>[0];
// Ce que rend VRAIMENT le load : SvelteKit l'infère via un proxy sans l'annotation
// `PageServerLoad`, dont le type de retour lâche (`Record<string, any>`) ne dit rien.
type LoadResult = PageServerData;

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_ID = '11111111-1111-4111-8111-111111111111';
const POSTGREST_MAX_ROWS = 1000;

// ============================================================================
// HELPERS
// ============================================================================

/** `groupe` : étiquette de test qui distingue les lignes entre elles (champ propre au faux) */
function row(index: number, status: string, groupe: string, overrides: Row = {}): Row {
	return {
		id: `${status}-${groupe}-${String(index).padStart(5, '0')}`,
		status,
		groupe,
		classification_node_id: null,
		level: 1,
		type: 'fill_in_blanks',
		grades: ['CE1'],
		created_at: '2026-09-28T09:14:03.52+00:00',
		updated_at: '2026-09-28T09:14:03.52+00:00',
		...overrides
	};
}

function rows(count: number, status: string, groupe: string, overrides: Row = {}): Row[] {
	return Array.from({ length: count }, (_, index) => row(index, status, groupe, overrides));
}

/** Motif ILIKE de Postgres (`%`, `_`, échappement par `\`) → expression régulière */
function likeToRegExp(pattern: string): RegExp {
	const literal = (char: string) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	let source = '';
	for (let index = 0; index < pattern.length; index++) {
		const char = pattern[index];
		if (char === '\\' && index + 1 < pattern.length) {
			index++;
			source += literal(pattern[index]);
		} else if (char === '%') source += '.*';
		else if (char === '_') source += '.';
		else source += literal(char);
	}
	return new RegExp(`^${source}$`, 'is');
}

/** Constructeur de requête minimal, à la manière de PostgREST (1000 lignes max) */
function fakeQuery(table: Row[]) {
	const filters: Array<(candidate: Row) => boolean> = [];
	let range: [number, number] = [0, POSTGREST_MAX_ROWS - 1];
	let withCount = false;

	function execute() {
		const matching = table.filter((candidate) => filters.every((keep) => keep(candidate)));
		const to = Math.min(range[1], range[0] + POSTGREST_MAX_ROWS - 1);
		return {
			data: matching.slice(range[0], to + 1).map((candidate) => ({ ...candidate })),
			error: null,
			count: withCount ? matching.length : null
		};
	}

	const builder = {
		select: (_columns: string, options?: { count?: string }) => {
			withCount = options?.count === 'exact';
			return builder;
		},
		eq: (column: string, value: unknown) => {
			filters.push((candidate) => candidate[column] === value);
			return builder;
		},
		overlaps: (column: string, values: unknown[]) => {
			filters.push((candidate) =>
				(candidate[column] as unknown[]).some((value) => values.includes(value))
			);
			return builder;
		},
		ilike: (column: string, pattern: string) => {
			filters.push((candidate) => likeToRegExp(pattern).test(String(candidate[column] ?? '')));
			return builder;
		},
		// Recherche : `title.ilike.*terme*,and(id.gte.<uuid>,id.lte.<uuid>)` (terme hexadécimal)
		// `or('type.eq.course_card,options->>courseQuestion.eq.true')` : liste de
		// `colonne.eq.valeur`, colonne jsonb lue en texte via `->>`, comme PostgREST
		or: (expression: string) => {
			const search = /^title\.ilike\.\*(.*)\*,and\(id\.gte\.([^,]+),id\.lte\.([^)]+)\)$/.exec(
				expression
			);
			if (search) {
				const [, term, low, high] = search;
				filters.push((candidate) => {
					const id = String(candidate.id);
					const title = String(candidate.title ?? '').toLowerCase();
					return title.includes(term.toLowerCase()) || (id >= low && id <= high);
				});
				return builder;
			}
			const clauses = expression.split(',').map((clause) => {
				const [path, operator, ...rest] = clause.split('.');
				if (operator !== 'eq') throw new Error(`opérateur non simulé : ${operator}`);
				return { path, value: rest.join('.') };
			});
			filters.push((candidate) =>
				clauses.some(({ path, value }) => {
					const [column, key] = path.split('->>');
					const cell = candidate[column];
					const text =
						key === undefined
							? cell
							: cell && typeof cell === 'object'
								? (cell as Row)[key]
								: undefined;
					return text !== undefined && text !== null && String(text) === value;
				})
			);
			return builder;
		},
		in: (column: string, values: unknown[]) => {
			filters.push((candidate) => values.includes(candidate[column]));
			return builder;
		},
		is: (column: string, value: null) => {
			filters.push((candidate) => (candidate[column] ?? null) === value);
			return builder;
		},
		gte: (column: string, value: number) => {
			filters.push((candidate) => (candidate[column] as number) >= value);
			return builder;
		},
		lte: (column: string, value: number) => {
			filters.push((candidate) => (candidate[column] as number) <= value);
			return builder;
		},
		order: () => builder,
		range: (from: number, to: number) => {
			range = [from, to];
			return builder;
		},
		// Voulu : un constructeur PostgREST est « thenable », c'est `await` qui l'exécute
		// oxlint-disable-next-line unicorn/no-thenable
		then: (resolveFn: (value: unknown) => unknown, rejectFn?: (reason: unknown) => unknown) =>
			Promise.resolve(execute()).then(resolveFn, rejectFn)
	};
	return builder;
}

const B_CALC = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const B_GEO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const N_FRAC = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const N_DEC = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const S_ADD = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';

const NODES: Row[] = [
	{ id: B_CALC, kind: 'branch', name: 'Calcul', parent_id: null, position: 0 },
	{ id: B_GEO, kind: 'branch', name: 'Géométrie', parent_id: null, position: 1 },
	{ id: N_FRAC, kind: 'notion', name: 'Fractions', parent_id: B_CALC, position: 0 },
	{ id: N_DEC, kind: 'notion', name: 'Décimaux', parent_id: B_CALC, position: 1 },
	{ id: S_ADD, kind: 'subnotion', name: 'Additionner', parent_id: N_FRAC, position: 0 }
];

async function loadPage(table: Row[], query = ''): Promise<LoadResult> {
	const event = {
		url: new URL(`http://localhost/dashboard/admin/questions${query}`),
		locals: {
			user: { id: USER_ID },
			profile: { role: 'admin' },
			supabase: {
				from: (name: string) => fakeQuery(name === 'classification_nodes' ? NODES : table)
			}
		}
	} as unknown as LoadEvent;
	return (await load(event)) as LoadResult;
}

// ============================================================================
// TESTS
// ============================================================================

describe('page admin des modèles — filtres communs aux deux onglets', () => {
	it('filtre les brouillons par notion (sous-notions comprises), comme les publiés', async () => {
		const table = [
			...rows(2, 'draft', 'Entiers', { classification_node_id: N_FRAC }),
			...rows(1, 'draft', 'Entiers', { classification_node_id: S_ADD }),
			...rows(4, 'draft', 'Fractions', { classification_node_id: N_DEC })
		];

		const result = await loadPage(table, `?branche=${B_CALC}&notion=${N_FRAC}`);

		expect(result.drafts).toHaveLength(3);
	});

	it('filtre par branche seule : toutes ses notions, pas une autre branche', async () => {
		const table = [
			...rows(2, 'draft', 'a', { classification_node_id: N_FRAC }),
			...rows(3, 'draft', 'b', { classification_node_id: N_DEC }),
			...rows(5, 'draft', 'c', { classification_node_id: B_GEO })
		];

		const result = await loadPage(table, `?branche=${B_CALC}`);

		expect(result.drafts).toHaveLength(5);
	});

	it('« Non rangés » : seulement les modèles sans nœud', async () => {
		const table = [
			...rows(2, 'draft', 'a', { classification_node_id: N_FRAC }),
			...rows(3, 'draft', 'b'),
			...rows(4, 'published', 'c')
		];

		const result = await loadPage(table, '?nonRanges=1');

		expect(result.drafts).toHaveLength(3);
		expect(result.publishedIds).toHaveLength(4);
		expect(result.filters.nonRanges).toBe(true);
	});

	it('ignore les anciens paramètres theme / domain / subdomain', async () => {
		const table = [...rows(3, 'draft', 'Entiers'), ...rows(4, 'draft', 'Fractions')];

		const result = await loadPage(table, '?theme=Entiers&domain=Additionner&subdomain=x');

		expect(result.drafts).toHaveLength(7);
	});

	it('un identifiant de branche mal formé est ignoré, pas une erreur', async () => {
		const table = rows(3, 'draft', 'Entiers');

		const result = await loadPage(table, '?branche=pas-un-uuid');

		expect(result.drafts).toHaveLength(3);
	});

	it('rend les nœuds de l’arbre pour les filtres et les chemins', async () => {
		const result = await loadPage(rows(1, 'draft', 'Entiers'));

		expect(result.nodes.map((node) => node.id)).toContain(S_ADD);
	});

	it('filtre les brouillons par niveau scolaire (chevauchement)', async () => {
		const table = [
			...rows(2, 'draft', 'Entiers', { grades: ['CP', 'CE1'] }),
			...rows(5, 'draft', 'Décimaux', { grades: ['6e'] })
		];

		const result = await loadPage(table, '?grades=CE1,CM2');

		expect(result.drafts).toHaveLength(2);
	});

	it('sans filtre, rend tous les brouillons', async () => {
		const table = [...rows(3, 'draft', 'Entiers'), ...rows(4, 'draft', 'Fractions')];

		const result = await loadPage(table);

		expect(result.drafts).toHaveLength(7);
	});

	it('rend les identifiants de TOUS les publiés filtrés, au-delà de la page de 50', async () => {
		const table = [
			...rows(228, 'published', 'Entiers', { classification_node_id: N_FRAC }),
			...rows(10, 'published', 'Fractions')
		];

		const result = await loadPage(table, `?notion=${N_FRAC}`);

		expect(result.templates).toHaveLength(50);
		expect(result.total).toBe(228);
		expect(result.publishedIds).toHaveLength(228);
		expect(new Set(result.publishedIds).size).toBe(228);
	});

	it('pagine les identifiants au-delà du plafond de 1000 lignes de PostgREST', async () => {
		const table = rows(2300, 'published', 'Entiers');

		const result = await loadPage(table);

		expect(result.publishedIds).toHaveLength(2300);
		expect(new Set(result.publishedIds).size).toBe(2300);
	});

	it("n'inclut aucun brouillon dans les identifiants publiés", async () => {
		const table = [...rows(5, 'published', 'Entiers'), ...rows(7, 'draft', 'Entiers')];

		const result = await loadPage(table);

		expect(result.publishedIds).toHaveLength(5);
		expect(result.drafts).toHaveLength(7);
	});
});

// Q110 b / Q115 : filtre « Questions de cours » = marqueur `options.courseQuestion`
// OU carte de cours (une carte de cours est toujours une question de cours).
describe('page admin des modèles — filtre « Questions de cours »', () => {
	function catalogue(): Row[] {
		return [
			...rows(3, 'draft', 'Entiers'),
			...rows(2, 'draft', 'Polynômes', { options: { courseQuestion: true } }),
			...rows(1, 'draft', 'Fonctions', {
				type: 'course_card',
				options: { courseCard: true }
			}),
			...rows(4, 'published', 'Entiers', { options: { courseQuestion: false } }),
			...rows(5, 'published', 'Polynômes', { options: { courseQuestion: true } })
		];
	}

	it('sans le filtre : tous les modèles (inchangé)', async () => {
		const result = await loadPage(catalogue());

		expect(result.drafts).toHaveLength(6);
		expect(result.publishedIds).toHaveLength(9);
		expect(result.filters.courseQuestion).toBe(false);
	});

	it('avec le filtre : questions de cours et cartes de cours, dans les deux onglets', async () => {
		const result = await loadPage(catalogue(), '?courseQuestion=1');

		expect(result.drafts.map((draft) => draft.groupe).sort()).toEqual([
			'Fonctions',
			'Polynômes',
			'Polynômes'
		]);
		expect(result.templates).toHaveLength(5);
		expect(result.publishedIds).toHaveLength(5);
		expect(result.total).toBe(5);
		expect(result.filters.courseQuestion).toBe(true);
	});

	it('se combine avec les autres filtres', async () => {
		const result = await loadPage(catalogue(), '?courseQuestion=1&nonRanges=1');

		expect(result.drafts).toHaveLength(3);
		expect(result.publishedIds).toHaveLength(5);
	});

	it('valeur inattendue du paramètre → filtre inactif', async () => {
		const result = await loadPage(catalogue(), '?courseQuestion=peut-etre');

		expect(result.drafts).toHaveLength(6);
		expect(result.filters.courseQuestion).toBe(false);
	});
});

describe('page admin des modèles — recherche par titre ou début d’identifiant', () => {
	function catalogue(): Row[] {
		return [
			row(0, 'published', 'A', {
				id: '7f82d15a-0000-4000-8000-000000000001',
				title: 'Lire un tableau de variations'
			}),
			row(1, 'published', 'B', {
				id: '7f83aaaa-0000-4000-8000-000000000002',
				title: 'Dériver un polynôme'
			}),
			row(2, 'draft', 'C', {
				id: '12345678-0000-4000-8000-000000000003',
				title: 'Variations d’une fonction affine'
			}),
			row(3, 'published', 'D', {
				id: 'abcdef01-0000-4000-8000-000000000004',
				title: 'Taux de 100 % et 50_50'
			})
		];
	}

	it('sans recherche : tout', async () => {
		const result = await loadPage(catalogue());

		expect(result.publishedIds).toHaveLength(3);
		expect(result.drafts).toHaveLength(1);
	});

	it('par un mot du titre, sans la casse, dans les deux onglets', async () => {
		const result = await loadPage(catalogue(), '?search=VARIATIONS');

		expect(result.publishedIds).toEqual(['7f82d15a-0000-4000-8000-000000000001']);
		expect(result.drafts.map((draft) => draft.groupe)).toEqual(['C']);
		expect(result.total).toBe(1);
		expect(result.filters.search).toBe('VARIATIONS');
	});

	it('par le début de l’identifiant (8 caractères, comme dans la liste)', async () => {
		const result = await loadPage(catalogue(), '?search=7f82d15a');

		expect(result.publishedIds).toEqual(['7f82d15a-0000-4000-8000-000000000001']);
		expect(result.drafts).toHaveLength(0);
	});

	it('par un début d’identifiant de 4 caractères au moins, sans la casse', async () => {
		expect((await loadPage(catalogue(), '?search=7F82')).publishedIds).toEqual([
			'7f82d15a-0000-4000-8000-000000000001'
		]);
		expect((await loadPage(catalogue(), '?search=7f83')).publishedIds).toEqual([
			'7f83aaaa-0000-4000-8000-000000000002'
		]);
		// Moins de 4 caractères : pas une recherche d’identifiant, seulement le titre
		expect((await loadPage(catalogue(), '?search=7f8')).publishedIds).toHaveLength(0);
	});

	it('par un identifiant complet, tirets compris', async () => {
		const result = await loadPage(catalogue(), '?search=12345678-0000-4000-8000-000000000003');

		expect(result.drafts.map((draft) => draft.groupe)).toEqual(['C']);
	});

	it('les caractères % et _ du terme sont cherchés tels quels', async () => {
		expect((await loadPage(catalogue(), '?search=100%20%25')).publishedIds).toHaveLength(1);
		expect((await loadPage(catalogue(), '?search=%25')).publishedIds).toHaveLength(1);
		expect((await loadPage(catalogue(), '?search=50_50')).publishedIds).toHaveLength(1);
		expect((await loadPage(catalogue(), '?search=50_5_')).publishedIds).toHaveLength(0);
	});

	it('se combine avec les autres filtres', async () => {
		const result = await loadPage(catalogue(), '?search=variations&grades=1_SPE');

		expect(result.publishedIds).toHaveLength(0);
		expect(result.drafts).toHaveLength(0);
	});

	it('espaces autour ignorés ; terme vide = pas de recherche', async () => {
		expect((await loadPage(catalogue(), '?search=%20%20polyn%C3%B4me%20')).publishedIds).toEqual([
			'7f83aaaa-0000-4000-8000-000000000002'
		]);
		expect((await loadPage(catalogue(), '?search=%20%20')).publishedIds).toHaveLength(3);
	});

	it('terme trop long → 400', async () => {
		await expect(loadPage(catalogue(), `?search=${'a'.repeat(101)}`)).rejects.toMatchObject({
			status: 400
		});
	});
});
