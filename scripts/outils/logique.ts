/**
 * `pnpm outils` : ce qui se décide sans git ni tmux
 * =================================================
 *
 * Lecture du tableau des lots (`docs/wip/outils-lots.md`), choix des lots à
 * prendre, écriture de la réservation, commandes de lancement. Les effets
 * (git, worktree, tmux) sont dans `index.ts`. Tests :
 * `scripts/__tests__/outils.test.ts`.
 */

// Types

export type Etat = 'libre' | 'en-cours' | 'fait';

export interface Lot {
	nom: string;
	outils: string;
	module: string;
	prisPar: string;
	notes: string;
	etat: Etat;
	mathast: boolean;
	/** « Notes » commence par « attend » : le lot attend quelque chose */
	attend: boolean;
	/** Index de la ligne dans le fichier */
	ligne: number;
}

export type Commande =
	| { action: 'liste' }
	| { action: 'reserver'; lot: string; essai: boolean }
	| { action: 'lancer'; lots: string[]; essai: boolean };

export interface Choix {
	pris: Lot[];
	/** Lots nommés ou passés, avec la raison */
	refus: { nom: string; raison: string }[];
}

export class OutilsError extends Error {}

// Constantes

export const MAX_EN_COURS = 5;
export const PREFIXE_SUJET = 'outil-';
const NOM_DE_LOT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const USAGE = [
	'Usage :',
	'  pnpm outils                         état des lots (docs/wip/outils-lots.md)',
	'  pnpm outils lancer [<lot>…] [--essai]',
	'      réserve les lots nommés, ou les premiers lots libres jusqu’à',
	`      ${MAX_EN_COURS} en cours, puis ouvre une session par lot (worktree, tmux, Remote Control)`,
	'  pnpm outils reserver <lot> [--essai]   réserve un seul lot, sans rien lancer'
].join('\n');

// Functions

function cellules(ligne: string): string[] | null {
	const t = ligne.trim();
	if (!t.startsWith('|') || !t.endsWith('|')) return null;
	return t
		.slice(1, -1)
		.split('|')
		.map((c) => c.trim());
}

const PRIS_PAR = /^outil-[a-z0-9-]+ \(\d{4}-\d{2}-\d{2}\)$/;

function etatDe(nom: string, prisPar: string): Etat {
	if (prisPar === '') return 'libre';
	if (/^fait\b/i.test(prisPar)) return 'fait';
	if (PRIS_PAR.test(prisPar)) return 'en-cours';
	throw new OutilsError(
		`Lot ${nom} : « Pris par » illisible (${prisPar}) ; attendu vide, « outil-<lot> (AAAA-MM-JJ) » ou « fait (#PR, date) ».`
	);
}

/** Les lignes du tableau dont la première cellule est un nom de lot entre accents graves. */
export function lireLots(texte: string): Lot[] {
	const lots: Lot[] = [];
	texte.split('\n').forEach((ligne, i) => {
		const c = cellules(ligne);
		if (c === null) return;
		const nom = /^`([^`]+)`$/.exec(c[0])?.[1];
		if (nom === undefined || !NOM_DE_LOT.test(nom)) return;
		if (c.length !== 5) {
			throw new OutilsError(
				`Lot ${nom} : ${c.length} cellules au lieu de 5 (un « | » dans une cellule ?).`
			);
		}
		const [, outils, module, prisPar, notes] = c;
		lots.push({
			nom,
			outils,
			module,
			prisPar,
			notes,
			etat: etatDe(nom, prisPar),
			mathast: /mathast/i.test(module),
			attend: /^attend\b/i.test(notes),
			ligne: i
		});
	});
	if (lots.length === 0) throw new OutilsError('Aucun lot lu dans le tableau des lots.');
	return lots;
}

export function parseArgs(args: string[]): Commande {
	const essai = args.includes('--essai');
	const reste = args.filter((a) => a !== '--essai');
	const inconnue = reste.find((a) => a.startsWith('-'));
	if (inconnue !== undefined) throw new OutilsError(`Option inconnue : ${inconnue}\n${USAGE}`);
	const [mot, ...noms] = reste;
	for (const nom of noms) {
		if (!NOM_DE_LOT.test(nom)) throw new OutilsError(`Nom de lot invalide : ${nom}`);
	}
	if (mot === undefined) {
		if (essai) throw new OutilsError(`--essai va avec lancer ou reserver.\n${USAGE}`);
		return { action: 'liste' };
	}
	if (mot === 'lancer') {
		if (new Set(noms).size !== noms.length) throw new OutilsError('Un lot nommé deux fois.');
		return { action: 'lancer', lots: noms, essai };
	}
	if (mot === 'reserver') {
		if (noms.length !== 1) throw new OutilsError(`reserver prend un seul lot.\n${USAGE}`);
		return { action: 'reserver', lot: noms[0], essai };
	}
	throw new OutilsError(`Mot inconnu : ${mot}\n${USAGE}`);
}

/**
 * Lots nommés : pris s'ils sont libres et que les règles le permettent, sinon
 * refusés avec la raison (jamais remplacés par un autre). Aucun nom : les
 * premiers lots libres dans l'ordre du fichier, jusqu'à MAX_EN_COURS en cours.
 */
export function choisir(lots: Lot[], noms: string[]): Choix {
	const pris: Lot[] = [];
	const refus: Choix['refus'] = [];
	const enCours = lots.filter((l) => l.etat === 'en-cours');
	let places = MAX_EN_COURS - enCours.length;
	let mathastOccupe = enCours.some((l) => l.mathast);

	const raisonDeRefus = (lot: Lot): string | null => {
		if (lot.etat === 'en-cours') return `déjà pris (${lot.prisPar})`;
		if (lot.etat === 'fait') return `déjà fait (${lot.prisPar})`;
		if (lot.attend) return `attend : ${lot.notes}`;
		if (lot.mathast && mathastOccupe) return 'un autre lot mathAST est en cours';
		if (places <= 0) return `${MAX_EN_COURS} lots en cours au plus`;
		return null;
	};
	const prendre = (lot: Lot) => {
		pris.push(lot);
		places -= 1;
		if (lot.mathast) mathastOccupe = true;
	};

	if (noms.length > 0) {
		for (const nom of noms) {
			const lot = lots.find((l) => l.nom === nom);
			if (lot === undefined) {
				refus.push({ nom, raison: 'lot inconnu' });
				continue;
			}
			const raison = raisonDeRefus(lot);
			if (raison === null) prendre(lot);
			else refus.push({ nom, raison });
		}
		return { pris, refus };
	}
	for (const lot of lots) {
		if (places <= 0) break;
		if (lot.etat !== 'libre') continue;
		const raison = raisonDeRefus(lot);
		if (raison === null) prendre(lot);
		else refus.push({ nom: lot.nom, raison });
	}
	return { pris, refus };
}

export function sujet(lot: string): string {
	return `${PREFIXE_SUJET}${lot}`;
}

/** Le fichier avec « Pris par » rempli pour ces lots, et la ligne `status:` à jour. */
export function reserver(texte: string, lots: Lot[], date: string): string {
	const lignes = texte.split('\n');
	for (const lot of lots) {
		const c = cellules(lignes[lot.ligne]);
		if (c === null) throw new OutilsError(`Ligne du lot ${lot.nom} illisible.`);
		c[3] = `${sujet(lot.nom)} (${date})`;
		lignes[lot.ligne] = `| ${c.join(' | ')} |`;
	}
	const apres = lignes.join('\n');
	const enCours = lireLots(apres)
		.filter((l) => l.etat === 'en-cours')
		.map((l) => l.nom);
	const etat = enCours.length === 0 ? 'aucun en cours' : `en cours : ${enCours.join(', ')}`;
	return apres.replace(/^(status: [^;\n]*;).*$/m, `$1 ${etat}`);
}

export function messageDeCommit(lots: Lot[]): string {
	const noms = lots.map((l) => l.nom).join(', ');
	return `docs(wip): outils-lots, ${lots.length > 1 ? 'lots' : 'lot'} ${noms} pris`;
}

/** Guillemets simples pour zsh, sans rien laisser interpréter. */
function citer(texte: string): string {
	return `'${texte.replaceAll("'", `'\\''`)}'`;
}

/**
 * La commande de la fenêtre tmux : installer les dépendances dans le worktree,
 * puis Claude depuis le dépôt principal (comme les autres sessions : même
 * mémoire), avec Remote Control, nommé comme le chantier, sur `/prendre-outil`.
 */
export function commandeDeSession(lot: string, principal: string, worktree: string): string {
	const nom = sujet(lot);
	const claude = [
		'claude',
		citer(`/prendre-outil ${lot}`),
		'-n',
		citer(nom),
		'--remote-control',
		citer(nom)
	].join(' ');
	// Un échec avant Claude laisse la fenêtre ouverte sur un shell, l'erreur visible.
	const etapes = [
		`cd ${citer(worktree)}`,
		'pnpm install --prefer-offline',
		`cd ${citer(principal)}`,
		`exec ${claude}`
	].join(' && ');
	return `${etapes}; echo ${citer(`⛔ lancement de ${nom} raté`)}; exec zsh -l`;
}
