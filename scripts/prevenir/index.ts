/**
 * `pnpm prevenir` : prévenir David qu'une session attend un geste de lui
 * =====================================================================
 *
 *   pnpm prevenir lien                    un lien est prêt à essayer
 *   pnpm prevenir question                une question attend sa réponse
 *   pnpm prevenir geste "courte phrase"   autre chose à faire par lui
 *   … --session <nom>                     nom imposé (tâche planifiée)
 *   … --essai                             montre le message, n'envoie rien
 *
 * Notification ntfy sur l'iPhone, par le canal de la surveillance du Mac mini
 * (scripts/surveillance-machine.sh), comme les demandes d'autorisation. Le
 * message ne porte que le nom de la session : ni le lien, ni la question
 * (service extérieur). Le même message n'est pas renvoyé avant 10 minutes.
 *
 * Une notification ne bloque jamais la session : canal absent ou réseau coupé
 * → une ligne, code 0. Seule une commande mal écrite sort en 1.
 * Quand s'en servir : docs/pratiques/prevenir-david.md.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
	PrevenirError,
	dejaEnvoye,
	lireEnvois,
	message,
	nomDeSession,
	noterEnvoi,
	parseArgs,
	titreDuTranscript
} from './logique';

// Constantes

const CANAL =
	process.env.PREVENIR_CANAL ?? join(homedir(), '.config/surveillance-machine/ntfy-topic');
const ETAT = process.env.PREVENIR_ETAT ?? join(homedir(), '.local/state/prevenir');
const FICHIER_ENVOIS = join(ETAT, 'envois.json');
const NTFY_SERVEUR = process.env.NTFY_SERVEUR ?? 'https://ntfy.sh';
const PROJETS_CLAUDE = join(homedir(), '.claude/projects');
const DELAI_ENVOI_MS = 10_000;

// Functions

/** Le `/rename` de la session qui lance la commande, s'il y en a un. */
function titreDeLaSession(): string | null {
	const id = process.env.CLAUDE_CODE_SESSION_ID;
	if (id === undefined || !/^[0-9a-f-]{36}$/i.test(id) || !existsSync(PROJETS_CLAUDE)) return null;
	for (const projet of readdirSync(PROJETS_CLAUDE)) {
		const transcript = join(PROJETS_CLAUDE, projet, `${id}.jsonl`);
		if (existsSync(transcript)) return titreDuTranscript(readFileSync(transcript, 'utf8'));
	}
	return null;
}

function envoisNotes(): ReturnType<typeof lireEnvois> {
	return existsSync(FICHIER_ENVOIS) ? lireEnvois(readFileSync(FICHIER_ENVOIS, 'utf8')) : {};
}

async function envoyer(canal: string, texte: string): Promise<string | null> {
	try {
		const reponse = await fetch(`${NTFY_SERVEUR}/${canal}`, {
			method: 'POST',
			// En-têtes sans accent : HTTP ne les porte pas.
			headers: { Title: 'Claude a besoin de toi', Priority: 'high', Tags: 'raising_hand' },
			body: texte,
			signal: AbortSignal.timeout(DELAI_ENVOI_MS)
		});
		return reponse.ok ? null : `réponse ${reponse.status}`;
	} catch {
		return 'réseau';
	}
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	let titre: string | null = null;
	try {
		titre = titreDeLaSession();
	} catch {
		// Transcript illisible : le nom du worktree suffit.
	}
	const session = nomDeSession({ explicite: options.session, titre, dossier: process.cwd() });
	const texte = message(options.mot, session, options.phrase);

	if (options.essai) {
		console.log(`(essai, rien d'envoyé) ${texte}`);
		return;
	}
	const envois = envoisNotes();
	const maintenant = Date.now();
	if (dejaEnvoye(envois, texte, maintenant)) {
		console.log(`⏸ déjà envoyé il y a moins de 10 minutes : ${texte}`);
		return;
	}
	const canal = existsSync(CANAL) ? readFileSync(CANAL, 'utf8').trim() : '';
	if (canal === '') {
		console.log('⚠️ notification pas partie : pas de canal ntfy (pnpm surveillance:installer).');
		return;
	}
	const echec = await envoyer(canal, texte);
	if (echec !== null) {
		console.log(`⚠️ notification pas partie (${echec}) : David n'est pas prévenu.`);
		return;
	}
	try {
		mkdirSync(ETAT, { recursive: true });
		writeFileSync(FICHIER_ENVOIS, `${JSON.stringify(noterEnvoi(envois, texte, maintenant))}\n`);
	} catch {
		// État impossible à écrire : au pire, un doublon.
	}
	console.log(`✅ envoyé : ${texte}`);
}

main().catch((erreur: unknown) => {
	if (erreur instanceof PrevenirError) {
		console.error(`⛔ ${erreur.message}`);
		process.exit(1);
	}
	// Tout le reste : ne pas bloquer la session pour une notification.
	const detail = erreur instanceof Error ? erreur.message.split('\n')[0] : String(erreur);
	console.log(`⚠️ notification pas partie (${detail}).`);
});
