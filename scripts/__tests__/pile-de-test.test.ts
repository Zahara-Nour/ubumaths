/**
 * Règles de la pile Supabase de test (scripts/pile-de-test/regles.ts).
 */
import { describe, expect, it } from 'vitest';
import {
	configDeTest,
	deciderPreparation,
	empreinte,
	environnementDeTest,
	PORT_API,
	PORT_DB,
	PROJET
} from '../pile-de-test/regles';

const CONFIG = `project_id = "ubumaths"

[api]
port = 54321

[db]
port = 54322
shadow_port = 54320
major_version = 17

[studio]
port = 54323
# smtp_port = 54325

[edge_runtime]
inspector_port = 8083
`;

function fichier(version: string, sql = `-- ${version}`) {
	return { version, fichier: `${version}_x.sql`, empreinte: empreinte(sql) };
}

function enBase(...versions: string[]) {
	return new Map(versions.map((v) => [v, empreinte(`-- ${v}`)]));
}

describe('configDeTest', () => {
	it('change le nom du projet et décale tous les ports de la pile', () => {
		const sortie = configDeTest(CONFIG);
		expect(sortie).toContain(`project_id = "${PROJET}"`);
		expect(sortie).toContain(`port = ${PORT_API}`);
		expect(sortie).toContain(`port = ${PORT_DB}`);
		expect(sortie).toContain('shadow_port = 55320');
		expect(sortie).toContain('port = 55323');
		expect(sortie).not.toMatch(/^[^#\n]*5432\d/m);
	});

	it('ne touche ni aux autres réglages ni aux ports hors de la pile', () => {
		const sortie = configDeTest(CONFIG);
		expect(sortie).toContain('major_version = 17');
		expect(sortie).toContain('inspector_port = 8083');
	});

	it('refuse une configuration sans nom de projet', () => {
		expect(() => configDeTest('[api]\nport = 54321\n')).toThrow(/project_id/);
	});

	it('refuse une configuration dont un port de la pile resterait celui du dev', () => {
		// Un port écrit autrement (guillemets) échapperait au décalage : deux piles sur un port.
		expect(() => configDeTest('project_id = "ubumaths"\n[api]\nport = "54321"\n')).toThrow(/54321/);
	});
});

describe('deciderPreparation', () => {
	const decor = 'd1';

	it('pile à jour : rien à faire', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000'), fichier('20260102000000')],
			appliquees: ['20260101000000', '20260102000000'],
			empreintes: enBase('20260101000000', '20260102000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('rien');
	});

	it('migrations de la branche en attente : les appliquer', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000'), fichier('20260102000000')],
			appliquees: ['20260101000000'],
			empreintes: enBase('20260101000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('appliquer');
	});

	it("migration d'une autre branche dans la pile : reconstruire, en la nommant", () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000')],
			appliquees: ['20260101000000', '20260105000000'],
			empreintes: enBase('20260101000000', '20260105000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('reconstruire');
		expect(d.raison).toContain('20260105000000');
	});

	it('migration modifiée depuis son passage : reconstruire, en la nommant', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000', 'alter table a add column b int;')],
			appliquees: ['20260101000000'],
			empreintes: enBase('20260101000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('reconstruire');
		expect(d.raison).toContain('20260101000000_x.sql');
	});

	it('migration passée sans empreinte connue : reconstruire', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000'), fichier('20260102000000')],
			appliquees: ['20260101000000', '20260102000000'],
			empreintes: enBase('20260101000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('reconstruire');
	});

	it('pile sans aucune empreinte (pas construite par cette commande) : reconstruire', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000')],
			appliquees: ['20260101000000'],
			empreintes: null,
			decor,
			decorEnBase: null
		});
		expect(d.action).toBe('reconstruire');
	});

	it('seed, configuration ou version de la CLI changés : reconstruire', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000')],
			appliquees: ['20260101000000'],
			empreintes: enBase('20260101000000'),
			decor: 'd2',
			decorEnBase: decor
		});
		expect(d.action).toBe('reconstruire');
	});

	it('reconstruire passe avant appliquer', () => {
		const d = deciderPreparation({
			fichiers: [fichier('20260101000000'), fichier('20260109000000')],
			appliquees: ['20260101000000', '20260105000000'],
			empreintes: enBase('20260101000000', '20260105000000'),
			decor,
			decorEnBase: decor
		});
		expect(d.action).toBe('reconstruire');
	});
});

describe('environnementDeTest', () => {
	it('dirige les tests, et le code serveur qu’ils importent, vers la pile de test', () => {
		const env = environnementDeTest();
		expect(env.SUPABASE_TEST_URL).toBe(`http://127.0.0.1:${PORT_API}`);
		expect(env.PUBLIC_SUPABASE_URL).toBe(env.SUPABASE_TEST_URL);
		expect(env.SUPABASE_URL).toBe(env.SUPABASE_TEST_URL);
		expect(env.SUPABASE_DB_PORT).toBe(String(PORT_DB));
		expect(env.SUPABASE_DB_HOST).toBe('127.0.0.1');
	});
});
