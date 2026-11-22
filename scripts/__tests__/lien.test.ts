/**
 * `pnpm lien` : la logique, sans Tailscale
 * ========================================
 *
 * `scripts/lien/logique.ts` décide de tout ce qui peut se décider sans lancer
 * `tailscale` : les options, la lecture de l'état de Serve, le port HTTPS
 * libre, l'ancien lien de Supabase (jamais repris ni retiré), les liens à
 * retirer, le serveur périmé, le serveur lancé à l'ancienne, l'état du relais.
 * Les commandes elles-mêmes (`scripts/lien/index.ts`) se vérifient en vrai.
 */

import { describe, it, expect } from 'vitest';
import {
	LienError,
	accountLines,
	anonKey,
	SUPABASE_HTTPS_PORT,
	chantierName,
	isMainRepo,
	lastSync,
	linkUrl,
	linksToStop,
	listing,
	launchedTheOldWay,
	parseArgs,
	parseRegistry,
	parseServeStatus,
	pickHttpsPort,
	pruneRegistry,
	relayState,
	relaunchCommand,
	servedPorts,
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

	it('aucun lien : état vide', () => {
		expect(parseServeStatus({})).toEqual([]);
		expect(parseServeStatus(null)).toEqual([]);
	});

	it('état d’une forme inconnue : erreur, jamais « aucun lien » (on publierait par-dessus)', () => {
		expect(() => parseServeStatus('rien')).toThrow(LienError);
		expect(() => parseServeStatus({ Web: { [`${HOST}:8444`]: { Handlers: null } } })).toThrow(
			LienError
		);
		expect(() => servedPorts({ Web: [] })).toThrow(LienError);
	});

	it('ports occupés : liens HTTPS, TCP bruts et chemins autres que / compris', () => {
		expect(
			servedPorts({
				TCP: { '443': { HTTPS: true }, '2222': { TCPForward: 'localhost:22' } },
				Web: { [`${HOST}:8450`]: { Handlers: { '/api': { Proxy: 'http://localhost:3000' } } } }
			})
		).toEqual([443, 2222, 8450]);
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
				chantier: 'Supabase local (ancien lien)',
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

	it('un reset ou un rebase seul compte aussi', () => {
		expect(lastSync('HEAD@{1700005000}\treset: moving to origin/main')).toBe(1700005000);
		expect(lastSync('HEAD@{1700004000}\trebase (finish): returning to refs/heads/x')).toBe(
			1700004000
		);
	});

	it('aucun pull ni merge : rien', () => {
		expect(lastSync('HEAD@{1700003000}\tcommit: feat: un commit')).toBeNull();
		expect(lastSync('')).toBeNull();
	});
});

describe('lien — serveur qui vise la prod', () => {
	const local = 'PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n';

	it('serveur ordinaire sur la base locale : accepté', () => {
		expect(isLocalEnv([local], 'node vite dev --port 5177')).toBe(true);
	});

	it('refuse une adresse distante, et l’absence de .env.local', () => {
		expect(isLocalEnv([local], 'PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co node vite')).toBe(
			false
		);
		expect(isLocalEnv([], '')).toBe(false);
	});
});

describe('lien — serveur lancé à l’ancienne', () => {
	it('adresse de Supabase du tailnet dans la commande : à relancer', () => {
		const env = `PUBLIC_SUPABASE_URL=https://${HOST}:8443 __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=${HOST} node vite dev`;
		expect(launchedTheOldWay(env, HOST)).toBe(true);
		expect(launchedTheOldWay(`PUBLIC_SUPABASE_URL="https://${HOST}:9000" node`, HOST)).toBe(true);
	});

	it('serveur ordinaire : non', () => {
		expect(launchedTheOldWay('node vite dev --port 5177 PATH=/bin', HOST)).toBe(false);
		expect(launchedTheOldWay('PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 node vite', HOST)).toBe(
			false
		);
	});

	it('adresse de la prod : non (c’est la garde « base locale » qui refuse)', () => {
		expect(launchedTheOldWay('PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co node', HOST)).toBe(
			false
		);
	});

	it('commande pour relancer le serveur : sans aucune variable', () => {
		expect(relaunchCommand(5177)).toBe('pnpm dev --port 5177 --strictPort');
	});
});

describe('lien — relais de Supabase', () => {
	it('Supabase répond à travers le serveur de dev : tout va bien', () => {
		expect(relayState(200)).toBe('ok');
		// Supabase local répond 401 sans clé : il répond
		expect(relayState(401)).toBe('ok');
	});

	it('502, ou pas de réponse : Supabase local est arrêté', () => {
		expect(relayState(502)).toBe('supabase-arrete');
		expect(relayState(null)).toBe('supabase-arrete');
	});

	it('404, redirection, refus : le serveur de dev n’a pas le relais (branche en retard)', () => {
		expect(relayState(404)).toBe('sans-relais');
		expect(relayState(303)).toBe('sans-relais');
		expect(relayState(403)).toBe('sans-relais');
	});
});

describe('lien — comptes fictifs', () => {
	const accounts = {
		prof: [{ email: 'teacher@local.test', password: 'local-teacher' }],
		eleve: [
			{ email: 'eleve01@local.test', password: 'local-eleve' },
			{ email: 'student@local.test', password: 'local-student' }
		]
	};

	it('donne le premier compte qui se connecte vraiment', () => {
		const lines = accountLines(accounts, (account) => account.email !== 'eleve01@local.test');
		expect(lines).toEqual([
			'  prof  : teacher@local.test / local-teacher',
			'  eleve : student@local.test / local-student'
		]);
	});

	it('aucun compte du rôle ne se connecte : le dit, sans en inventer', () => {
		expect(accountLines(accounts, () => false)[1]).toBe(
			'  eleve : aucun compte ne se connecte (pnpm db:neuf les crée)'
		);
	});

	it('impossible de vérifier (Supabase arrêté) : le premier compte, marqué non vérifié', () => {
		expect(accountLines(accounts, null)[1]).toBe(
			'  eleve : eleve01@local.test / local-eleve (non vérifié)'
		);
	});

	it('clé publique de Supabase local lue dans les fichiers d’environnement', () => {
		expect(anonKey(['A=1\nPUBLIC_SUPABASE_ANON_KEY="cle-fictive"\n'])).toBe('cle-fictive');
		expect(anonKey(['A=1\n'])).toBeNull();
	});
});
