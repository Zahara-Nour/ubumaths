/**
 * `pnpm prevenir` : une notification quand une session attend un geste de David
 * ============================================================================
 *
 * Gardé ici :
 * - trois mots seulement (`lien`, `question`, `geste`) ; tout autre mot est
 *   refusé avec la liste ;
 * - le message porte le nom de la session et rien d'autre : ni le lien, ni le
 *   texte de la question (le canal passe par un service extérieur) ;
 * - la phrase de `geste` est courte et ne porte ni chemin ni adresse ;
 * - le même message de la même session n'est pas renvoyé avant 10 minutes ;
 * - canal absent ou réseau coupé : une ligne, code de sortie 0 (la session
 *   n'est jamais bloquée par une notification) ;
 * - `--essai` montre le message sans l'envoyer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
	DELAI_DOUBLON_MS,
	PrevenirError,
	dejaEnvoye,
	lireEnvois,
	message,
	nomDeSession,
	noterEnvoi,
	parseArgs,
	titreDuTranscript
} from '../prevenir/logique';

const TSX = resolve(__dirname, '../../node_modules/.bin/tsx');
const INDEX = resolve(__dirname, '../prevenir/index.ts');

describe('parseArgs', () => {
	it('accepte lien et question, sans phrase', () => {
		expect(parseArgs(['lien'])).toEqual({
			mot: 'lien',
			phrase: null,
			session: null,
			essai: false
		});
		expect(parseArgs(['question', '--essai']).essai).toBe(true);
	});

	it('accepte geste avec une courte phrase', () => {
		expect(parseArgs(['geste', 'page à cocher prête']).phrase).toBe('page à cocher prête');
	});

	it('lit --session', () => {
		expect(parseArgs(['question', '--session', 'tache-de-nuit']).session).toBe('tache-de-nuit');
	});

	it('--session ne prend pas une option pour un nom', () => {
		expect(() => parseArgs(['lien', '--session', '--essai'])).toThrow(/--session/);
		expect(() => parseArgs(['lien', '--session', '--session', 'x'])).toThrow(/--session/);
		expect(() => parseArgs(['lien', '--session'])).toThrow(/--session/);
	});

	it.each(['a/b', 'exemple.test', 'ubumaths', 'Ubumaths', 'x'.repeat(61), 'a@b'])(
		'refuse --session %s',
		(nom) => {
			expect(() => parseArgs(['lien', '--session', nom])).toThrow(PrevenirError);
		}
	);

	it('refuse un mot inconnu en donnant la liste', () => {
		expect(() => parseArgs(['bravo'])).toThrow(PrevenirError);
		expect(() => parseArgs(['bravo'])).toThrow(/lien.*question.*geste/);
		expect(() => parseArgs([])).toThrow(/lien.*question.*geste/);
	});

	it('refuse une phrase pour lien et question (rien de la question ne part)', () => {
		expect(() => parseArgs(['question', 'quelle couleur ?'])).toThrow(PrevenirError);
		expect(() => parseArgs(['lien', 'voici'])).toThrow(PrevenirError);
	});

	it('exige une phrase pour geste', () => {
		expect(() => parseArgs(['geste'])).toThrow(/phrase/);
		expect(() => parseArgs(['geste', '   '])).toThrow(/phrase/);
	});

	it.each([
		'ouvre https://exemple.test/page',
		'lis docs/wip/journal',
		'fichier journal.md prêt',
		'écris à quelqu.un@exemple.test',
		'va sur machine.exemple.test',
		'C:\\dossier',
		'va sur 100.64.1.2 port 5176',
		'ouvre localhost',
		'ouvre la machine:5176'
	])('refuse un chemin ou une adresse dans la phrase : %s', (phrase) => {
		expect(() => parseArgs(['geste', phrase])).toThrow(/chemin|adresse/);
	});

	it('refuse une phrase de plus de 80 caractères', () => {
		expect(() => parseArgs(['geste', 'a'.repeat(81)])).toThrow(/80/);
		expect(parseArgs(['geste', 'a'.repeat(80)]).phrase).toHaveLength(80);
	});

	it('refuse une phrase sur plusieurs lignes', () => {
		expect(() => parseArgs(['geste', 'un\ndeux'])).toThrow(PrevenirError);
	});

	it('refuse une option inconnue', () => {
		expect(() => parseArgs(['lien', '--fort'])).toThrow(PrevenirError);
	});
});

describe('message', () => {
	it('dit ce qui attend, avec le nom de la session', () => {
		expect(message('lien', 'verifs-auto', null)).toBe(
			'Session « verifs-auto » : un lien est prêt à essayer.'
		);
		expect(message('question', 'verifs-auto', null)).toBe(
			'Session « verifs-auto » : une question attend ta réponse.'
		);
		expect(message('geste', 'verifs-auto', 'page à cocher prête')).toBe(
			'Session « verifs-auto » : page à cocher prête.'
		);
	});

	it('ne double pas la ponctuation finale de la phrase', () => {
		expect(message('geste', 's', 'commande à lancer.')).toBe('Session « s » : commande à lancer.');
		expect(message('geste', 's', 'tu relis ?')).toBe('Session « s » : tu relis ?');
		expect(message('geste', 's', 'à lancer !')).toBe('Session « s » : à lancer !');
	});
});

describe('nomDeSession', () => {
	it('prend --session d’abord, puis le /rename, puis le worktree', () => {
		const dossier = '/x/ubumaths-wt-prevenir';
		expect(nomDeSession({ explicite: 'nuit', titre: 'verifs-auto', dossier })).toBe('nuit');
		expect(nomDeSession({ explicite: null, titre: 'verifs-auto', dossier })).toBe('verifs-auto');
		expect(nomDeSession({ explicite: null, titre: null, dossier })).toBe('prevenir');
	});

	it('ne donne jamais le nom du dépôt principal ni celui d’un autre dossier', () => {
		const sans = (dossier: string, titre: string | null = null) =>
			nomDeSession({ explicite: null, titre, dossier });
		expect(sans('/x/ubumaths')).toBe('sans nom');
		expect(sans('/Users/quelquun')).toBe('sans nom');
		expect(sans('/x/autre-projet')).toBe('sans nom');
		expect(sans('/x/ubumaths-wt-')).toBe('sans nom');
		expect(sans('/x/ubumaths', 'ubumaths')).toBe('sans nom');
	});

	it.each(['feat/prevenir', 'exemple.test', 'x'.repeat(61), 'ubumaths', 'a@b', '  '])(
		'un /rename refusé (%s) ne bloque rien : le worktree le remplace',
		(titre) => {
			expect(nomDeSession({ explicite: null, titre, dossier: '/x/ubumaths-wt-prevenir' })).toBe(
				'prevenir'
			);
		}
	);
});

describe('titreDuTranscript', () => {
	it('rend le dernier /rename', () => {
		const lignes = [
			'{"type":"custom-title","customTitle":"ancien"}',
			'{"type":"user"}',
			'{"type":"custom-title","customTitle":"verifs-auto"}'
		].join('\n');
		expect(titreDuTranscript(lignes)).toBe('verifs-auto');
	});

	it('rend null sans /rename', () => {
		expect(titreDuTranscript('{"type":"user"}')).toBeNull();
	});
});

describe('doublons', () => {
	const t0 = 1_800_000_000_000;

	it('le même message de la même session attend 10 minutes', () => {
		const envois = noterEnvoi({}, 'm', t0);
		expect(dejaEnvoye(envois, 'm', t0 + DELAI_DOUBLON_MS - 1)).toBe(true);
		expect(dejaEnvoye(envois, 'm', t0 + DELAI_DOUBLON_MS)).toBe(false);
		expect(dejaEnvoye(envois, 'autre', t0 + 1)).toBe(false);
	});

	it('oublie les envois passés', () => {
		const envois = noterEnvoi({ vieux: t0 - DELAI_DOUBLON_MS - 1 }, 'm', t0);
		expect(Object.keys(envois)).toEqual(['m']);
	});

	it('un fichier d’état abîmé vaut « rien d’envoyé »', () => {
		expect(lireEnvois('pas du json')).toEqual({});
		expect(lireEnvois('{"m":"hier"}')).toEqual({});
		expect(lireEnvois('{"m":12}')).toEqual({ m: 12 });
	});
});

describe('la commande', () => {
	let racine: string;
	let serveur: Server;
	let recus: { chemin: string; corps: string; titre: string | undefined }[];
	let statut: number;

	function lancer(args: string[], extra: Record<string, string> = {}) {
		const adresse = serveur.address();
		const port = adresse !== null && typeof adresse === 'object' ? adresse.port : 0;
		const env: NodeJS.ProcessEnv = {
			...process.env,
			HOME: racine,
			NTFY_SERVEUR: `http://127.0.0.1:${port}`,
			PREVENIR_CANAL: join(racine, 'canal'),
			PREVENIR_ETAT: join(racine, 'etat')
		};
		// La session qui lance les tests a peut-être un /rename : il ne compte pas ici.
		delete env.CLAUDE_CODE_SESSION_ID;
		Object.assign(env, extra);
		// Asynchrone : le faux serveur ntfy vit dans ce processus.
		return new Promise<{ status: number | null; sortie: string }>((fini) => {
			const enfant = spawn(TSX, [INDEX, ...args], { cwd: racine, env });
			let sortie = '';
			enfant.stdout.on('data', (d) => (sortie += String(d)));
			enfant.stderr.on('data', (d) => (sortie += String(d)));
			enfant.on('close', (status) => fini({ status, sortie }));
		});
	}

	beforeEach(async () => {
		racine = join(realpathSync(mkdtempSync(join(tmpdir(), 'prevenir-'))), 'ubumaths-wt-essai');
		mkdirSync(racine);
		writeFileSync(join(racine, 'canal'), 'canal-fictif\n');
		recus = [];
		statut = 200;
		serveur = createServer((req, res) => {
			let corps = '';
			req.on('data', (d) => (corps += String(d)));
			req.on('end', () => {
				const titre = req.headers.title;
				recus.push({
					chemin: req.url ?? '',
					corps,
					titre: typeof titre === 'string' ? titre : undefined
				});
				res.statusCode = statut;
				res.end('{}');
			});
		});
		await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret));
	});

	afterEach(async () => {
		await new Promise((ferme) => serveur.close(ferme));
		rmSync(resolve(racine, '..'), { recursive: true, force: true });
	});

	it('envoie le message au canal, avec le nom du worktree', async () => {
		const r = await lancer(['lien']);
		expect(r.status, r.sortie).toBe(0);
		expect(recus).toEqual([
			{
				chemin: '/canal-fictif',
				corps: 'Session « essai » : un lien est prêt à essayer.',
				titre: 'Claude a besoin de toi'
			}
		]);
		expect(r.sortie).toContain('Session « essai » : un lien est prêt à essayer.');
	});

	it('prend le /rename de la session quand elle en a un', async () => {
		const id = '00000000-0000-4000-8000-000000000000';
		const projets = join(racine, '.claude/projects/un-projet');
		mkdirSync(projets, { recursive: true });
		writeFileSync(
			join(projets, `${id}.jsonl`),
			'{"type":"custom-title","customTitle":"verifs-auto"}\n'
		);
		const r = await lancer(['question'], { CLAUDE_CODE_SESSION_ID: id });
		expect(r.status, r.sortie).toBe(0);
		expect(recus.map((m) => m.corps)).toEqual([
			'Session « verifs-auto » : une question attend ta réponse.'
		]);
	});

	it('un /rename qui porte un chemin ne bloque pas : nom du worktree', async () => {
		const id = '00000000-0000-4000-8000-000000000001';
		const projets = join(racine, '.claude/projects/un-projet');
		mkdirSync(projets, { recursive: true });
		writeFileSync(join(projets, `${id}.jsonl`), '{"customTitle":"feat/prevenir"}\n');
		const r = await lancer(['question'], { CLAUDE_CODE_SESSION_ID: id });
		expect(r.status, r.sortie).toBe(0);
		expect(recus.map((m) => m.corps)).toEqual([
			'Session « essai » : une question attend ta réponse.'
		]);
	});

	it('--session suivi d’une option : refus, rien d’envoyé', async () => {
		const r = await lancer(['lien', '--session', '--essai']);
		expect(r.status).toBe(1);
		expect(recus).toHaveLength(0);
	});

	it('état illisible : la notification part quand même', async () => {
		mkdirSync(join(racine, 'etat/envois.json'), { recursive: true });
		const r = await lancer(['lien']);
		expect(r.status, r.sortie).toBe(0);
		expect(recus).toHaveLength(1);
	});

	it('n’envoie pas deux fois le même message en moins de 10 minutes', async () => {
		const premier = await lancer(['question']);
		expect(premier.status, premier.sortie).toBe(0);
		expect(recus).toHaveLength(1);
		const r = await lancer(['question']);
		expect(r.status).toBe(0);
		expect(r.sortie).toMatch(/déjà envoyé/);
		expect(recus).toHaveLength(1);
		await lancer(['lien']);
		expect(recus).toHaveLength(2);
	});

	it('--essai montre le message et n’envoie rien', async () => {
		const r = await lancer(['geste', 'page à cocher prête', '--essai']);
		expect(r.status).toBe(0);
		expect(r.sortie).toContain('Session « essai » : page à cocher prête.');
		expect(recus).toHaveLength(0);
		// Rien de noté : le vrai envoi d'après n'est pas pris pour un doublon.
		await lancer(['geste', 'page à cocher prête']);
		expect(recus).toHaveLength(1);
	});

	it('canal absent : une ligne, sans bloquer', async () => {
		const r = await lancer(['lien'], { PREVENIR_CANAL: join(racine, 'absent') });
		expect(r.status).toBe(0);
		expect(r.sortie).toMatch(/⚠️.*canal/);
		expect(r.sortie.trim().split('\n')).toHaveLength(1);
		expect(recus).toHaveLength(0);
	});

	it('envoi refusé : une ligne, sans bloquer, et rien de noté', async () => {
		statut = 500;
		const r = await lancer(['lien']);
		expect(r.status).toBe(0);
		expect(r.sortie).toMatch(/⚠️.*500/);
		statut = 200;
		await lancer(['lien']);
		expect(recus).toHaveLength(2);
	});

	it('réseau coupé : une ligne, sans bloquer', async () => {
		const r = await lancer(['lien'], { NTFY_SERVEUR: 'http://127.0.0.1:1' });
		expect(r.status).toBe(0);
		expect(r.sortie).toMatch(/⚠️.*pas partie/);
	});

	it('mot inconnu : refus, code 1, rien d’envoyé', async () => {
		const r = await lancer(['bravo']);
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/lien.*question.*geste/);
		expect(recus).toHaveLength(0);
	});
});
