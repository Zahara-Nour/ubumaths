/**
 * `pnpm voir` : la logique, sans navigateur
 * =========================================
 *
 * `scripts/voir/logique.ts` décide de tout ce qui peut se décider sans ouvrir
 * de page : les options, l'adresse (jamais un autre site que le serveur local),
 * le port du serveur de CE worktree, le refus de `--compte` hors base locale,
 * la hauteur de l'image. Le pilotage du navigateur (`scripts/voir/index.ts`)
 * se vérifie en lançant la commande.
 */

import { describe, it, expect } from 'vitest';
import {
	ACCOUNTS,
	MAX_HEIGHT,
	SLICE_HEIGHT,
	VoirError,
	captureHeight,
	captureName,
	isLocalEnv,
	isLoginRedirect,
	isSameServer,
	parseArgs,
	pickPort,
	resolveTarget,
	slices
} from '../voir/logique';

describe('voir — options', () => {
	it('par défaut : téléphone, moteur de Safari, sans compte', () => {
		expect(parseArgs(['/demo/atelier'])).toEqual({
			target: '/demo/atelier',
			desktop: false,
			small: false,
			chromium: false,
			account: null,
			port: null
		});
	});

	it('lit --ordi, --chrome, --compte et --port, dans n’importe quel ordre', () => {
		expect(
			parseArgs(['--ordi', '--compte', 'prof', '/carnet', '--chrome', '--port', '5178'])
		).toEqual({
			target: '/carnet',
			desktop: true,
			small: false,
			chromium: true,
			account: 'prof',
			port: 5178
		});
	});

	it('lit --petit (iPhone SE, 375 px) ; refuse --petit avec --ordi', () => {
		expect(parseArgs(['/carnet', '--petit'])).toMatchObject({ desktop: false, small: true });
		expect(() => parseArgs(['/carnet', '--petit', '--ordi'])).toThrow(/--petit ou --ordi/);
	});

	it('refuse l’absence de page, deux pages, une option ou un compte inconnus', () => {
		expect(() => parseArgs([])).toThrow(VoirError);
		expect(() => parseArgs(['/a', '/b'])).toThrow(VoirError);
		expect(() => parseArgs(['/a', '--tablette'])).toThrow(/--tablette/);
		expect(() => parseArgs(['/a', '--compte', 'parent'])).toThrow(/prof, eleve ou admin/);
		expect(() => parseArgs(['/a', '--compte'])).toThrow(VoirError);
		expect(() => parseArgs(['/a', '--port', 'abc'])).toThrow(VoirError);
	});

	it('les trois comptes sont des comptes fictifs de la base locale', () => {
		for (const account of Object.values(ACCOUNTS).flat()) {
			expect(account.email).toMatch(/@local\.test$/);
		}
	});
});

describe('voir — adresse', () => {
	it('un chemin devient une adresse du serveur local', () => {
		expect(resolveTarget('/demo/atelier?x=1#bas', 5176)).toBe(
			'http://localhost:5176/demo/atelier?x=1#bas'
		);
	});

	it('une adresse complète du serveur local est ramenée à son port', () => {
		expect(resolveTarget('http://localhost:5176/carnet', 5176)).toBe(
			'http://localhost:5176/carnet'
		);
		expect(resolveTarget('http://127.0.0.1:5176/carnet', 5176)).toBe(
			'http://localhost:5176/carnet'
		);
	});

	it('refuse un autre site, un autre port, et les adresses déguisées', () => {
		expect(() => resolveTarget('https://chiph.re/carnet', 5176)).toThrow(/autre site/);
		expect(() => resolveTarget('http://localhost:5173/carnet', 5176)).toThrow(/autre site/);
		expect(() => resolveTarget('//chiph.re/carnet', 5176)).toThrow(/autre site/);
		expect(() => resolveTarget('/\\chiph.re', 5176)).toThrow(/autre site/);
		expect(() => resolveTarget('carnet', 5176)).toThrow(VoirError);
		expect(() => resolveTarget('javascript:alert(1)', 5176)).toThrow(VoirError);
	});
});

describe('voir — port du serveur du worktree', () => {
	const servers = [
		{ port: 5176, cwd: '/depot/ubumaths-wt-a' },
		{ port: 5178, cwd: '/depot/ubumaths-wt-b' }
	];

	it('prend le serveur lancé depuis ce worktree, pas celui du voisin', () => {
		expect(pickPort(servers, '/depot/ubumaths-wt-b', null)).toBe(5178);
	});

	it('aucun serveur pour ce worktree : le dit, donne la commande, ne lance rien', () => {
		expect(() => pickPort(servers, '/depot/ubumaths-wt-c', null)).toThrow(/pnpm dev --port/);
		// Un dossier dont le nom commence pareil n'est pas ce worktree
		expect(() => pickPort(servers, '/depot/ubumaths-wt', null)).toThrow(VoirError);
	});

	it('--port : accepté seulement si ce port est bien servi depuis ce worktree', () => {
		expect(pickPort(servers, '/depot/ubumaths-wt-a', 5176)).toBe(5176);
		expect(() => pickPort(servers, '/depot/ubumaths-wt-a', 5178)).toThrow(/ubumaths-wt-b/);
		expect(() => pickPort(servers, '/depot/ubumaths-wt-a', 5199)).toThrow(VoirError);
	});

	it('deux serveurs dans le même worktree : demande --port', () => {
		const two = [...servers, { port: 5179, cwd: '/depot/ubumaths-wt-a' }];
		expect(() => pickPort(two, '/depot/ubumaths-wt-a', null)).toThrow(/--port/);
		expect(pickPort(two, '/depot/ubumaths-wt-a', 5179)).toBe(5179);
	});
});

describe('voir — --compte seulement sur la base locale', () => {
	const LOCAL = 'PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n';
	const REMOTE = 'PUBLIC_SUPABASE_URL=https://exemple.supabase.co\n';

	it('base locale : oui', () => {
		expect(isLocalEnv([`A=1\n${LOCAL}SUPABASE_URL=http://127.0.0.1:54321\n`])).toBe(true);
		expect(isLocalEnv(['PUBLIC_SUPABASE_URL="http://localhost:54321"'])).toBe(true);
		expect(isLocalEnv([LOCAL], 'node vite dev HOME=/x PATH=/bin')).toBe(true);
	});

	it('pas de .env.local, variable absente, ou base distante : non', () => {
		expect(isLocalEnv([])).toBe(false);
		expect(isLocalEnv(['A=1\n'])).toBe(false);
		expect(isLocalEnv([REMOTE])).toBe(false);
		expect(isLocalEnv(['PUBLIC_SUPABASE_URL=pas une adresse'])).toBe(false);
		// Une adresse distante qui contient « localhost » n'est pas locale
		expect(isLocalEnv(['PUBLIC_SUPABASE_URL=https://localhost.exemple.co'])).toBe(false);
	});

	it('une seule adresse distante suffit à refuser, où qu’elle soit', () => {
		// Deuxième ligne du même fichier : c'est la dernière que retient Vite
		expect(isLocalEnv([LOCAL + REMOTE])).toBe(false);
		expect(isLocalEnv([REMOTE + LOCAL])).toBe(false);
		// Fichier qui passe devant .env.local
		expect(isLocalEnv([LOCAL, REMOTE])).toBe(false);
		// La variable du serveur (sans PUBLIC_) distante
		expect(isLocalEnv([`${LOCAL}SUPABASE_URL=https://exemple.supabase.co\n`])).toBe(false);
		expect(isLocalEnv([`${LOCAL}export ${REMOTE}`])).toBe(false);
		// Variable posée au lancement du serveur
		expect(
			isLocalEnv([LOCAL], 'node vite dev PUBLIC_SUPABASE_URL=https://exemple.supabase.co PATH=/bin')
		).toBe(false);
	});

	it('SUPABASE_URL locale seule ne suffit pas : sans PUBLIC_, le navigateur viserait .env', () => {
		expect(isLocalEnv(['SUPABASE_URL=http://127.0.0.1:54321\n'])).toBe(false);
	});
});

describe('voir — la page ne quitte pas le serveur local', () => {
	it('même origine : oui ; autre site, autre port, adresse illisible : non', () => {
		const origin = 'http://localhost:5176';
		expect(isSameServer('http://localhost:5176/carnet?x=1', origin)).toBe(true);
		expect(isSameServer('https://chiph.re/', origin)).toBe(false);
		expect(isSameServer('http://localhost:5173/', origin)).toBe(false);
		expect(isSameServer('pas une adresse', origin)).toBe(false);
	});
});

describe('voir — image et compte rendu', () => {
	it('page courte : image entière ; page très longue : coupée, et signalée', () => {
		expect(captureHeight(1200)).toEqual({ height: 1200, cut: false });
		expect(captureHeight(MAX_HEIGHT)).toEqual({ height: MAX_HEIGHT, cut: false });
		expect(captureHeight(MAX_HEIGHT + 1)).toEqual({ height: MAX_HEIGHT, cut: true });
	});

	it('image haute : découpée en tranches lisibles, sans trou ni recouvrement', () => {
		expect(slices(SLICE_HEIGHT)).toEqual([]);
		expect(slices(SLICE_HEIGHT * 2 + 10)).toEqual([
			{ y: 0, height: SLICE_HEIGHT },
			{ y: SLICE_HEIGHT, height: SLICE_HEIGHT },
			{ y: SLICE_HEIGHT * 2, height: 10 }
		]);
	});

	it('redirection vers la connexion : vue seulement si on ne la demandait pas', () => {
		expect(
			isLoginRedirect('http://localhost:5176/carnet', 'http://localhost:5176/auth/login')
		).toBe(true);
		expect(
			isLoginRedirect('http://localhost:5176/auth/login', 'http://localhost:5176/auth/login')
		).toBe(false);
		expect(isLoginRedirect('http://localhost:5176/carnet', 'http://localhost:5176/carnet')).toBe(
			false
		);
	});

	it('nom de fichier : date, page, format, moteur, compte', () => {
		const date = new Date(2026, 10, 22, 14, 5, 9);
		expect(
			captureName(date, '/demo/atelier?x=1', {
				desktop: false,
				small: false,
				chromium: false,
				account: null
			})
		).toBe('20261122-140509-demo-atelier-iphone-safari');
		expect(
			captureName(date, '/', { desktop: true, small: false, chromium: true, account: 'prof' })
		).toBe('20261122-140509-accueil-ordi-chrome-prof');
		expect(
			captureName(date, '/carnet', { desktop: false, small: true, chromium: false, account: null })
		).toBe('20261122-140509-carnet-iphone-se-safari');
	});
});
