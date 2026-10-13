/**
 * Fichiers des comptes supprimés : retrait du storage, et reprise hebdomadaire
 * =============================================================================
 *
 * Le SQL ne peut pas retirer un fichier du storage. La purge de conservation (C11) ne
 * fait que consigner les chemins, et la route de suppression les retire « au mieux ».
 * La tâche hebdomadaire reprend chaque suppression TERMINÉE dont `storage_removed_at`
 * est nul, retire ses fichiers, et ne date la ligne que si tout a été retiré.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeAccountFiles, sweepDeletedAccountFiles } from '../deleted-account-files';

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

// ============================================================================
// TYPES
// ============================================================================

type Result = { data: unknown; error: unknown };

interface Call {
	op: string;
	args: unknown[];
}

// ============================================================================
// VARIABLES
// ============================================================================

let calls: Call[] = [];
let pending: Result = { data: [], error: null };
let updateResult: Result = { data: [{ id: 'a1' }], error: null };
let removeResults: Record<string, Result> = {};

// ============================================================================
// HELPERS
// ============================================================================

/** Faux client service : notes chaque appel, rend les résultats configurés. */
function serviceClient() {
	return {
		from: vi.fn(() => {
			let isUpdate = false;
			const chain: Record<string, unknown> = {};
			for (const op of ['select', 'eq', 'is', 'not', 'order', 'limit']) {
				chain[op] = vi.fn((...args: unknown[]) => {
					calls.push({ op, args });
					return chain;
				});
			}
			chain.update = vi.fn((...args: unknown[]) => {
				calls.push({ op: 'update', args });
				isUpdate = true;
				return chain;
			});
			chain.then = (onFulfilled: (v: Result) => unknown) =>
				Promise.resolve(isUpdate ? updateResult : pending).then(onFulfilled);
			return chain;
		}),
		storage: {
			from: vi.fn((bucket: string) => ({
				remove: vi.fn(async (paths: string[]) => {
					calls.push({ op: 'remove', args: [bucket, paths] });
					return removeResults[bucket] ?? { data: paths, error: null };
				})
			}))
		}
	} as never;
}

function opsNamed(op: string) {
	return calls.filter((c) => c.op === op);
}

const FILES = {
	storage_paths: {
		'chat-attachments': ['c1/a.png', 'c1/b.png'],
		'message-attachments': [],
		'bug-report-screenshots': ['u/s.png']
	}
};

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	calls = [];
	pending = { data: [], error: null };
	updateResult = { data: [{ id: 'a1' }], error: null };
	removeResults = {};
});

describe('removeAccountFiles', () => {
	it('retire chaque bucket non vide par ses chemins exacts', async () => {
		const result = await removeAccountFiles(serviceClient(), FILES);

		expect(result).toEqual({ ok: true, removed: 3 });
		expect(opsNamed('remove').map((c) => c.args)).toEqual([
			['chat-attachments', ['c1/a.png', 'c1/b.png']],
			['bug-report-screenshots', ['u/s.png']]
		]);
	});

	it('un bucket en erreur rend ok: false, les autres sont quand même retirés', async () => {
		removeResults['chat-attachments'] = { data: null, error: { message: 'panne' } };

		const result = await removeAccountFiles(serviceClient(), FILES);

		expect(result).toEqual({ ok: false, removed: 1 });
		expect(opsNamed('remove')).toHaveLength(2);
	});

	it('chemins illisibles : ok: false, rien n’est retiré', async () => {
		const result = await removeAccountFiles(serviceClient(), { autre: 1 });

		expect(result).toEqual({ ok: false, removed: 0 });
		expect(opsNamed('remove')).toEqual([]);
	});

	it('aucun fichier : ok, rien à retirer', async () => {
		const result = await removeAccountFiles(serviceClient(), {
			storage_paths: { 'chat-attachments': [] }
		});

		expect(result).toEqual({ ok: true, removed: 0 });
	});
});

describe('sweepDeletedAccountFiles', () => {
	it('ne reprend que les suppressions terminées dont les fichiers ne sont pas retirés', async () => {
		await sweepDeletedAccountFiles(serviceClient());

		expect(calls).toEqual(
			expect.arrayContaining([
				{ op: 'eq', args: ['status', 'completed'] },
				{ op: 'is', args: ['storage_removed_at', null] }
			])
		);
	});

	it('date la ligne quand tous ses fichiers sont retirés', async () => {
		pending = { data: [{ id: 'a1', cleanup_result: FILES }], error: null };

		const result = await sweepDeletedAccountFiles(serviceClient());

		expect(result).toEqual({ checked: 1, cleared: 1, failed: 0, files: 3 });
		const [update] = opsNamed('update');
		expect(update.args[0]).toEqual({ storage_removed_at: expect.any(String) });
	});

	it('ne date pas la ligne si un retrait échoue : elle sera reprise la semaine suivante', async () => {
		pending = { data: [{ id: 'a1', cleanup_result: FILES }], error: null };
		removeResults['bug-report-screenshots'] = { data: null, error: { message: 'panne' } };

		const result = await sweepDeletedAccountFiles(serviceClient());

		expect(result).toMatchObject({ checked: 1, cleared: 0, failed: 1 });
		expect(opsNamed('update')).toEqual([]);
	});

	it('une date non écrite (zéro ligne rendue) compte comme un échec', async () => {
		pending = { data: [{ id: 'a1', cleanup_result: FILES }], error: null };
		updateResult = { data: [], error: null };

		const result = await sweepDeletedAccountFiles(serviceClient());

		expect(result).toMatchObject({ cleared: 0, failed: 1 });
	});

	it('lecture des suppressions en erreur : l’erreur remonte (pas de faux « rien à faire »)', async () => {
		pending = { data: null, error: { message: 'panne' } };

		await expect(sweepDeletedAccountFiles(serviceClient())).rejects.toThrow();
	});
});
