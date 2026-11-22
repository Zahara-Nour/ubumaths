/**
 * `pnpm lien` : la logique, sans Tailscale
 * ========================================
 *
 * `scripts/lien/logique.ts` décide de tout ce qui peut se décider sans lancer
 * `tailscale` : les options, la lecture de l'état de Serve, le port HTTPS
 * libre, le lien de Supabase (partagé, jamais retiré), les liens à retirer, le
 * serveur périmé, ce qui manque pour se connecter depuis un autre appareil.
 * Les commandes elles-mêmes (`scripts/lien/index.ts`) se vérifient en vrai.
 */

import { describe, it, expect } from 'vitest';
import {
	LienError,
	SUPABASE_HTTPS_PORT,
	chantierName,
	isMainRepo,
	lastSync,
	linkUrl,
	linksToStop,
	listing,
	missingForRemoteLogin,
	parseArgs,
	parseRegistry,
	parseServeStatus,
	pickHttpsPort,
	pruneRegistry,
	relaunchCommand,
	supabasePlan,
	type Registry,
	type ServeLink
} from '../lien/logique';
import { isLocalEnv } from '../voir/logique';

const HOST = 'machine.exemple.ts.net';
const ROOT = '/code/ubumaths-wt-carnet';
const OTHER = '/code/ubumaths-wt-atelier';

function link(httpsPort: number, localPort: number, funnel = false): ServeLink {
	return { httpsPort, localPort, target: `http://localhost:${localPort}`, funnel };
}

/** État de Serve tel que le rend `tailscale serve status --json`. */
function status(entries: [number, string][], funnel: number[] = []): unknown {
	return {
		TCP: Object.fromEntries(entries.map(([port]) => [String(port), { HTTPS: true }])),
		Web: Object.fromEntries(
			entries.map(([port, proxy]) => [`${HOST}:${port}`, { Handlers: { '/': { Proxy: proxy } } }])
		),
		AllowFunnel: Object.fromEntries(funnel.map((port) => [`${HOST}:${port}`, true]))
	};
}

describe('lien — options', () => {
	it('sans option : publier', () => {
		expect(parseArgs([])).toEqual({ action: 'publier', port: null });
	});

	it('--stop, --liste, --port', () => {
		expect(parseArgs(['--stop']).action).toBe('stop');
		expect(parseArgs(['--liste']).action).toBe('liste');
		expect(parseArgs(['--port', '5177'])).toEqual({ action: 'publier', port: 5177 });
	});

	it('refuse une option inconnue, un port faux, --stop avec --liste', () => {
		expect(() => parseArgs(['--reset'])).toThrow(LienError);
		expect(() => parseArgs(['--port', 'abc'])).toThrow(LienError);
		expect(() => parseArgs(['--stop', '--liste'])).toThrow(LienError);
		expect(() => parseArgs(['/carnet'])).toThrow(LienError);
	});
});

describe('lien — dépôt principal', () => {
	it('dépôt principal : le dossier git est le dossier commun', () => {
		expect(isMainRepo('/code/ubumaths/.git', '/code/ubumaths/.git')).toBe(true);
	});

	it('worktree : son dossier git est sous le dossier commun', () => {
		expect(isMainRepo('/code/ubumaths/.git/worktrees/carnet', '/code/ubumaths/.git')).toBe(false);
	});

	it('nom du chantier = nom du worktree sans son préfixe', () => {
		expect(chantierName(ROOT)).toBe('carnet');
		expect(chantierName('/code/ubumaths')).toBe('ubumaths');
	});
});

describe('lien — état de Serve', () => {
	it('lit les liens, leur port local et « tailnet only »', () => {
		const links = parseServeStatus(
			status(
				[
					[443, 'http://localhost:5176'],
					[8443, 'http://localhost:54321'],
					[10000, 'http://127.0.0.1:5183']
				],
				[10000]
			)
		);
		expect(links).toEqual([
			{ httpsPort: 443, localPort: 5176, target: 'http://localhost:5176', funnel: false },
			{ httpsPort: 8443, localPort: 54321, target: 'http://localhost:54321', funnel: false },
			{ httpsPort: 10000, localPort: 5183, target: 'http://127.0.0.1:5183', funnel: true }
		]);
	});

	it('aucun lien : état vide ou sans forme connue', () => {
		expect(parseServeStatus({})).toEqual([]);
		expect(parseServeStatus(null)).toEqual([]);
		expect(parseServeStatus('rien')).toEqual([]);
	});

	it('une cible qui n’est pas un port local garde son lien, sans port local', () => {
		const links = parseServeStatus(status([[8450, 'http://192.168.1.20:80']]));
		expect(links).toEqual([
			{ httpsPort: 8450, localPort: null, target: 'http://192.168.1.20:80', funnel: false }
		]);
	});

	it('adresse du lien : le port 443 ne s’écrit pas', () => {
		expect(linkUrl(HOST, 443)).toBe(`https://${HOST}/`);
		expect(linkUrl(HOST, 8445)).toBe(`https://${HOST}:8445/`);
	});
});

describe('lien — port HTTPS libre', () => {
	it('le premier port à partir de 8444 qui ne sert à rien', () => {
		expect(pickHttpsPort([443, 8443, 10000], [])).toBe(8444);
		expect(pickHttpsPort([443, 8443, 8444, 8445], [])).toBe(8446);
	});

	it('saute un port où un programme du Mac écoute déjà', () => {
		expect(pickHttpsPort([8444], [8445, 8446])).toBe(8447);
	});

	it('ne prend jamais le port réservé à Supabase', () => {
		expect(pickHttpsPort([], [])).not.toBe(SUPABASE_HTTPS_PORT);
	});
});

describe('lien — Supabase local', () => {
	it('déjà publié : on garde son lien, où qu’il soit', () => {
		expect(supabasePlan([link(443, 5176), link(8443, 54321)])).toEqual({
			publish: false,
			httpsPort: 8443
		});
		expect(supabasePlan([link(9000, 54321)])).toEqual({ publish: false, httpsPort: 9000 });
	});

	it('pas encore publié : à publier sur 8443', () => {
		expect(supabasePlan([link(443, 5176)])).toEqual({ publish: true, httpsPort: 8443 });
	});

	it('8443 pris par autre chose : erreur, on ne le reprend pas', () => {
		expect(() => supabasePlan([link(8443, 5176)])).toThrow(LienError);
	});
});

describe('lien — registre des liens', () => {
	const registry: Registry = {
		'8444': { root: ROOT, localPort: 5177, date: '2026-01-02T10:00:00.000Z' },
		'8445': { root: OTHER, localPort: 5180, date: '2026-01-02T11:00:00.000Z' }
	};

	it('fichier absent, illisible ou d’une autre forme : registre vide', () => {
		expect(parseRegistry(null)).toEqual({});
		expect(parseRegistry('{pas du json')).toEqual({});
		expect(parseRegistry('{"8444": {"root": 3}}')).toEqual({});
		expect(parseRegistry(JSON.stringify(registry))).toEqual(registry);
	});

	it('oublie un lien qui n’existe plus, ou qui mène maintenant ailleurs', () => {
		expect(pruneRegistry(registry, [link(8444, 5177)])).toEqual({ '8444': registry['8444'] });
		expect(pruneRegistry(registry, [link(8444, 5199), link(8445, 5180)])).toEqual({
			'8445': registry['8445']
		});
	});

	it('--liste : chaque lien avec son chantier, registre d’abord, serveur vivant sinon', () => {
		const rows = listing(
			[link(443, 5176), link(8443, 54321), link(8444, 5177), link(8446, 5190)],
			registry,
			[
				{ port: 5176, cwd: OTHER },
				{ port: 5177, cwd: ROOT }
			],
			HOST
		);
		expect(rows).toEqual([
			{ url: `https://${HOST}/`, target: 'http://localhost:5176', chantier: 'atelier', up: true },
			{
				url: `https://${HOST}:8443/`,
				target: 'http://localhost:54321',
				chantier: 'Supabase local (partagé)',
				up: true
			},
			{
				url: `https://${HOST}:8444/`,
				target: 'http://localhost:5177',
				chantier: 'carnet',
				up: true
			},
			{ url: `https://${HOST}:8446/`, target: 'http://localhost:5190', chantier: '?', up: false }
		]);
	});

	it('--liste : un lien du registre dont le serveur est arrêté garde son chantier', () => {
		const rows = listing([link(8444, 5177)], registry, [], HOST);
		expect(rows[0]).toMatchObject({ chantier: 'carnet', up: false });
	});
});

describe('lien — --stop', () => {
	const registry: Registry = {
		'8444': { root: ROOT, localPort: 5177, date: '2026-01-02T10:00:00.000Z' },
		'8445': { root: OTHER, localPort: 5180, date: '2026-01-02T11:00:00.000Z' }
	};
	const links = [link(443, 5176), link(8443, 54321), link(8444, 5177), link(8445, 5180)];

	it('retire le lien de ce worktree seulement, serveur arrêté compris', () => {
		expect(linksToStop(links, registry, [], ROOT)).toEqual([8444]);
	});

	it('retire aussi un lien hors registre qui mène au serveur de ce worktree', () => {
		expect(linksToStop(links, {}, [{ port: 5176, cwd: ROOT }], ROOT)).toEqual([443]);
	});

	it('ne retire jamais le lien de Supabase, même lancé depuis ce worktree', () => {
		const withSupabase: Registry = {
			'8443': { root: ROOT, localPort: 54321, date: '2026-01-02T10:00:00.000Z' }
		};
		expect(linksToStop(links, withSupabase, [{ port: 54321, cwd: ROOT }], ROOT)).toEqual([]);
	});

	it('laisse le lien du registre dont le port sert maintenant un autre worktree', () => {
		expect(linksToStop(links, registry, [{ port: 5177, cwd: OTHER }], ROOT)).toEqual([]);
	});

	it('rien à retirer : liste vide', () => {
		expect(linksToStop([link(8443, 54321)], {}, [], ROOT)).toEqual([]);
	});
});

describe('lien — serveur périmé', () => {
	const reflog = [
		'HEAD@{1700003000}\tcommit: feat: un commit',
		'HEAD@{1700002000}\tpull --rebase (finish): returning to refs/heads/feat/x',
		'HEAD@{1700001000}\tmerge origin/main: Merge made by the ort strategy.',
		'HEAD@{1700000000}\tcheckout: moving from main to feat/x'
	].join('\n');

	it('date du dernier pull, merge ou rebase, en secondes', () => {
		expect(lastSync(reflog)).toBe(1700002000);
	});

	it('aucun pull ni merge : rien', () => {
		expect(lastSync('HEAD@{1700003000}\tcommit: feat: un commit')).toBeNull();
		expect(lastSync('')).toBeNull();
	});
});

describe('lien — serveur qui vise la prod', () => {
	const tailnet = `https://${HOST}:8443`;
	const local = 'PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n';

	it('accepte la base locale jointe par le tailnet', () => {
		const env = `PUBLIC_SUPABASE_URL=${tailnet} __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${HOST} node vite`;
		expect(isLocalEnv([local], env, [tailnet])).toBe(true);
	});

	it('refuse toujours une adresse distante, et l’absence de .env.local', () => {
		const env = 'PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co node vite';
		expect(isLocalEnv([local], env, [tailnet])).toBe(false);
		expect(isLocalEnv([], '', [tailnet])).toBe(false);
	});

	it('sans adresse autorisée en plus, le tailnet reste refusé (garde de pnpm voir)', () => {
		expect(isLocalEnv([local], `PUBLIC_SUPABASE_URL=${tailnet} node vite`)).toBe(false);
	});
});

describe('lien — connexion depuis un autre appareil', () => {
	const supabase = `https://${HOST}:8443`;

	it('serveur lancé comme il faut : rien ne manque', () => {
		const env = `PUBLIC_SUPABASE_URL=${supabase} __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${HOST} node vite dev --port 5177`;
		expect(missingForRemoteLogin(env, HOST, supabase)).toEqual([]);
	});

	it('serveur ordinaire : il manque l’adresse de Supabase et le nom autorisé', () => {
		expect(missingForRemoteLogin('node vite dev --port 5177', HOST, supabase)).toEqual([
			'hote',
			'supabase'
		]);
	});

	it('adresse de Supabase d’un autre port : elle manque', () => {
		const env = `PUBLIC_SUPABASE_URL=https://${HOST}:9000 __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${HOST} node`;
		expect(missingForRemoteLogin(env, HOST, supabase)).toEqual(['supabase']);
	});

	it('commande pour relancer le serveur', () => {
		expect(relaunchCommand(HOST, supabase, 5177)).toBe(
			`PUBLIC_SUPABASE_URL=${supabase} __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${HOST} pnpm dev --port 5177 --strictPort`
		);
	});
});
