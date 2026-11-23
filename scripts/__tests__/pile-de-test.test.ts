/**
 * Règles de la pile Supabase de test (scripts/pile-de-test/regles.ts).
 */
import { describe, expect, it } from 'vitest';
import {
	adresseDeTestPourLeCodeServeur,
	configDeTest,
	deciderPreparation,
	empreinte,
	environnementDeTest,
	estUnModuleDEnvironnementGenere,
	forcerLAdressePublique,
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
	it('dirige les aides de test vers la pile de test', () => {
		const env = environnementDeTest();
		expect(env.SUPABASE_TEST_URL).toBe(`http://127.0.0.1:${PORT_API}`);
		expect(env.SUPABASE_DB_PORT).toBe(String(PORT_DB));
		expect(env.SUPABASE_DB_HOST).toBe('127.0.0.1');
	});

	it('ne pose pas PUBLIC_SUPABASE_URL : SvelteKit l’écrirait sur disque, sous le serveur de dev', () => {
		expect(Object.keys(environnementDeTest())).not.toContain('PUBLIC_SUPABASE_URL');
	});
});

describe('adresseDeTestPourLeCodeServeur', () => {
	it('donne au code serveur l’adresse que les tests utilisent', () => {
		expect(adresseDeTestPourLeCodeServeur({ SUPABASE_TEST_URL: 'http://127.0.0.1:55321' })).toEqual(
			{ PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321', SUPABASE_URL: 'http://127.0.0.1:55321' }
		);
	});

	it('hors lanceur : rien', () => {
		expect(adresseDeTestPourLeCodeServeur({})).toEqual({});
	});
});

describe('forcerLAdressePublique', () => {
	const URL_TEST = 'http://127.0.0.1:55321';

	it('remplace l’export statique', () => {
		const code =
			'export const PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";\nexport const PUBLIC_SUPABASE_ANON_KEY = "cle";';
		const sortie = forcerLAdressePublique(code, URL_TEST);
		expect(sortie).toContain(`export const PUBLIC_SUPABASE_URL = "${URL_TEST}";`);
		expect(sortie).toContain('PUBLIC_SUPABASE_ANON_KEY = "cle"');
	});

	it('remplace l’affectation et l’objet du module dynamique', () => {
		const code =
			'explicit_public_env.PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";\nset_env({PUBLIC_SUPABASE_URL:"http://127.0.0.1:54321",AUTRE:"x"});';
		const sortie = forcerLAdressePublique(code, URL_TEST);
		expect(sortie).not.toContain('54321');
		expect(sortie.match(/55321/g)).toHaveLength(2);
		expect(sortie).toContain('AUTRE:"x"');
	});

	it('laisse un module sans cette variable tel quel', () => {
		const code = 'export const AUTRE = "http://127.0.0.1:54321";';
		expect(forcerLAdressePublique(code, URL_TEST)).toBe(code);
	});
});

describe('estUnModuleDEnvironnementGenere', () => {
	it('reconnaît les modules générés, pas le reste', () => {
		expect(
			estUnModuleDEnvironnementGenere('/x/.svelte-kit/generated/dev/env/public/server.js')
		).toBe(true);
		expect(estUnModuleDEnvironnementGenere('/x/.svelte-kit/generated/dev/env/config.js')).toBe(
			true
		);
		expect(estUnModuleDEnvironnementGenere('/x/src/env.ts')).toBe(false);
		expect(estUnModuleDEnvironnementGenere('/x/src/lib/generated/dev/env.ts')).toBe(false);
	});
});
