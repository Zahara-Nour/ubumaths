/**
 * Garde « données sensibles » : aucun secret ni adresse réelle dans un commit
 * ===========================================================================
 *
 * Chiphre traite des données d'élèves mineurs, et le dépôt est publié sur GitHub.
 * La garde lit les lignes AJOUTÉES (jamais l'existant) et bloque :
 *
 * - les **secrets** aux formats connus : clés Brevo (API et SMTP), Stripe live,
 *   Groq, Hugging Face, GitHub, AWS, clés privées, et les JWT d'un vrai projet
 *   Supabase (ceux qui portent un `ref`) — les clés de démo de Supabase local
 *   (`iss: supabase-demo`), publiques, passent ; tout autre JWT est signalé ;
 * - les **adresses courriel** hors des domaines fictifs de `ALLOWED_DOMAINS` ;
 *   sur `chiph.re`, seules les adresses de service ; sur le domaine fictif des
 *   comptes d'enfants (`eleves.chiph.re`), seuls les prénoms de `FICTIONAL_NAMES`
 *   — un vrai identifiant d'enfant ressemble trait pour trait à un faux.
 *
 * - les **noms interdits** (la plateforme dont on reprend des idées) : lignes ajoutées ET
 *   chemins de fichiers, sans exception possible ; racines lues hors du dépôt
 *   (`scripts/noms-interdits.cjs`), introuvables → la garde échoue.
 *
 * Elle ne voit pas un prénom ou un nom écrit en clair : la règle de CLAUDE.md
 * (données fictives seulement) reste la vraie protection.
 *
 * Exception assumée, sur la ligne même : `garde-donnees:ok (raison)`.
 * Le signalement ne recopie rien de la ligne (logs de CI publics) : fichier et
 * numéro de ligne seulement. Limite : en CI, seul le diff final de la PR est lu
 * (un secret ajouté puis retiré dans la PR n'y est plus) ; le pre-commit, lui,
 * voit chaque commit.
 *
 * Usage : pnpm garde:donnees --staged          (pre-commit)
 *         pnpm garde:donnees --depuis origin/main   (CI, sur une PR)
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

export interface AddedLine {
	file: string;
	lineNo: number;
	text: string;
}

export interface Hit {
	file: string;
	lineNo: number;
	kind: 'secret' | 'adresse' | 'nom';
	label: string;
}

const MARKER = 'garde-donnees:ok';

const require = createRequire(import.meta.url);
const { chargerRacines, trouverNomInterdit } = require('./noms-interdits.cjs') as {
	chargerRacines: (options?: { env?: Record<string, string | undefined> }) => string[];
	trouverNomInterdit: (texte: string, racines: string[]) => number;
};

const EXCLUDED_FILES = [/^pnpm-lock\.yaml$/, /^static\//, /\.min\.js$/, /^CHANGELOG\.md$/];

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
	{ label: 'clé API Brevo', re: /xkeysib-[A-Za-z0-9]{20,}/ },
	{ label: 'clé SMTP Brevo', re: /xsmtpsib-[A-Za-z0-9]{20,}/ },
	{ label: 'clé Stripe live', re: /\b[sr]k_live_[A-Za-z0-9]{10,}/ },
	{ label: 'secret de webhook Stripe', re: /\bwhsec_[A-Za-z0-9]{20,}/ },
	{ label: 'clé Groq', re: /\bgsk_[A-Za-z0-9]{20,}/ },
	{ label: 'jeton Hugging Face', re: /\bhf_[A-Za-z0-9]{30,}/ },
	{ label: 'jeton GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
	{ label: 'clé AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
	{ label: 'clé secrète Supabase', re: /\bsb_secret_[A-Za-z0-9_-]{10,}/ },
	{ label: 'clé privée', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ }
];

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

/** Domaines fictifs (et sous-domaines de ces TLD réservés). */
const ALLOWED_DOMAINS = [
	/\.(test|example|invalid|localhost|local)$/,
	/^(example|exemple)\.(com|org|net|fr|test)$/,
	/^(test|school|email)\.com$/,
	/^(ecole|college|eleve)\.fr$/
];

/** Adresses de service de Chiphre. */
const CHIPHRE_SERVICE = /^(contact|noreply|no-reply|support|admin|dpo|rgpd)$/;

/** Prénoms fictifs admis pour un compte d'enfant (`<prénom><chiffres>@eleves.chiph.re`). */
const FICTIONAL_NAMES = ['camille', 'eleve', 'enfant', 'test', 'demo', 'alice', 'bob'];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.([A-Za-z]{2,}))\b/g;

const FILE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'webp',
	'svg',
	'gif',
	'avif',
	'js',
	'ts',
	'css'
]);

function isAllowedEmail(local: string, domain: string): boolean {
	const d = domain.toLowerCase();
	const l = local.toLowerCase();
	if (d === 'eleves.chiph.re') {
		// Format exact `<prénom fictif><chiffres>` : `alicemartin12` ou `camille.dupont` ne passent pas.
		return l === '%' || FICTIONAL_NAMES.some((name) => new RegExp(`^${name}\\d*$`).test(l));
	}
	// Domaine actuel et ancien domaine (ubumaths) : adresses de service seulement.
	if (d === 'chiph.re' || /^ubumaths\.(fr|com)$/.test(d)) return CHIPHRE_SERVICE.test(l);
	// Adresses techniques de GitHub (dépôt distant, auteurs masqués).
	if (d === 'github.com') return l === 'git';
	if (d === 'users.noreply.github.com') return true;
	return ALLOWED_DOMAINS.some((re) => re.test(d));
}

function isRealSupabaseJwt(payloadB64: string): boolean {
	try {
		const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
			iss?: unknown;
			ref?: unknown;
		};
		return typeof payload.ref === 'string' || payload.iss !== 'supabase-demo';
	} catch {
		return false;
	}
}

/** `nomsInterdits` : racines normalisées (`chargerRacines`) ; vides = pas de contrôle de nom. */
export function findSensitive(lines: AddedLine[], nomsInterdits: string[] = []): Hit[] {
	const hits: Hit[] = [];
	const fichiersVus = new Set<string>();
	for (const { file, lineNo, text } of lines) {
		// Noms interdits : aucun fichier exclu, aucune exception sur la ligne ; le chemin compte aussi.
		if (nomsInterdits.length > 0) {
			if (!fichiersVus.has(file)) {
				fichiersVus.add(file);
				const n = trouverNomInterdit(file, nomsInterdits);
				if (n > 0)
					hits.push({ file, lineNo: 0, kind: 'nom', label: `nom interdit n° ${n} (chemin)` });
			}
			const n = trouverNomInterdit(text, nomsInterdits);
			if (n > 0) hits.push({ file, lineNo, kind: 'nom', label: `nom interdit n° ${n}` });
		}
		if (EXCLUDED_FILES.some((re) => re.test(file))) continue;
		if (text.includes(MARKER)) continue;
		// Rien de la ligne n'est recopié : les logs de CI d'un dépôt public sont lisibles par tous.
		const push = (kind: Hit['kind'], label: string) => hits.push({ file, lineNo, kind, label });

		for (const { label, re } of SECRET_PATTERNS) {
			const m = text.match(re);
			if (m) push('secret', label);
		}
		for (const m of text.matchAll(JWT_RE)) {
			if (isRealSupabaseJwt(m[1])) push('secret', 'jeton JWT');
		}
		for (const m of text.matchAll(EMAIL_RE)) {
			const [full, domain, tld] = m;
			if (FILE_EXTENSIONS.has(tld.toLowerCase())) continue;
			const local = full.slice(0, full.indexOf('@'));
			if (!isAllowedEmail(local, domain)) push('adresse', 'adresse courriel réelle');
		}
	}
	return hits;
}

/**
 * Lignes ajoutées d'un diff unifié (`git diff -U0`, préfixes `a/`/`b/` imposés par
 * `GIT_DIFF_ARGS`). Un `+++` n'est un en-tête qu'entre `diff --git` et le premier
 * `@@` du fichier : ailleurs, c'est une ligne ajoutée qui commence par `++`.
 */
export function parseAddedLines(diff: string): AddedLine[] {
	const out: AddedLine[] = [];
	let file: string | null = null;
	let inHeader = false;
	let lineNo = 0;
	for (const raw of diff.split('\n')) {
		if (raw.startsWith('diff --git ')) {
			inHeader = true;
			file = null;
			continue;
		}
		if (inHeader) {
			if (raw.startsWith('+++ ')) file = raw.startsWith('+++ b/') ? raw.slice(6) : null;
			const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
			if (hunk) {
				inHeader = false;
				lineNo = Number(hunk[1]);
			}
			continue;
		}
		const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
		if (hunk) {
			lineNo = Number(hunk[1]);
			continue;
		}
		if (file && raw.startsWith('+')) {
			out.push({ file, lineNo, text: raw.slice(1) });
			lineNo += 1;
		}
	}
	return out;
}

/**
 * Sortie de diff stable quelle que soit la config git locale : chemins accentués
 * non cités (`core.quotepath`), préfixes `a/`/`b/` imposés (`diff.mnemonicPrefix`,
 * `diff.noprefix`), ni diff externe ni textconv.
 */
const GIT_DIFF_ARGS = [
	'-c',
	'core.quotepath=false',
	'diff',
	'-U0',
	'--no-color',
	'--no-ext-diff',
	'--no-textconv',
	'--src-prefix=a/',
	'--dst-prefix=b/',
	'--diff-filter=ACMR'
];

function main(argv: string[]): number {
	const sinceIdx = argv.indexOf('--depuis');
	let args: string[];
	if (argv.includes('--staged')) {
		args = [...GIT_DIFF_ARGS, '--cached'];
	} else if (sinceIdx !== -1 && argv[sinceIdx + 1]) {
		args = [...GIT_DIFF_ARGS, `${argv[sinceIdx + 1]}...HEAD`];
	} else {
		console.error('Usage : garde-donnees-sensibles --staged | --depuis <ref>');
		return 2;
	}
	let nomsInterdits: string[];
	try {
		nomsInterdits = chargerRacines();
	} catch (erreur) {
		// Dependabot n'a pas accès aux secrets du dépôt : seul cas où l'on s'en passe (CI).
		if (process.env.NOMS_INTERDITS_FACULTATIF === '1') {
			nomsInterdits = [];
		} else {
			console.error(`❌ Garde : ${(erreur as Error).message}`);
			console.error('   Voir docs/pratiques/git-workflow.md (noms interdits).');
			return 2;
		}
	}
	const diff = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
	const hits = findSensitive(parseAddedLines(diff), nomsInterdits);
	// Fichiers renommés ou copiés sans ligne ajoutée : leur chemin compte aussi.
	const chemins = execFileSync('git', [...args, '--name-only'], { encoding: 'utf8' })
		.split('\n')
		.filter(Boolean);
	for (const file of chemins) {
		if (hits.some((h) => h.file === file && h.lineNo === 0)) continue;
		const n = trouverNomInterdit(file, nomsInterdits);
		if (nomsInterdits.length > 0 && n > 0) {
			hits.push({ file, lineNo: 0, kind: 'nom', label: `nom interdit n° ${n} (chemin)` });
		}
	}
	if (hits.length === 0) {
		console.log('🔍 Données sensibles : rien dans les lignes ajoutées.');
		return 0;
	}
	console.error(`❌ Données sensibles : ${hits.length} ligne(s) ajoutée(s) à revoir.`);
	for (const h of hits) {
		console.error(`   ${h.file}:${h.lineNo}  ${h.label}`);
	}
	if (hits.some((h) => h.kind === 'nom')) {
		console.error(
			'\n   Nom interdit : le retirer (« l’autre plateforme »), aucune exception possible.'
		);
	}
	console.error(
		'\n   Remplacer par une donnée fictive (example.com, local.test, prénom fictif),' +
			'\n   ou, si c’est voulu, ajouter `garde-donnees:ok (raison)` sur la ligne.' +
			'\n   Un secret déjà commité doit être RÉVOQUÉ chez son fournisseur, pas seulement retiré.'
	);
	return 1;
}

if (process.argv[1]?.endsWith('garde-donnees-sensibles.ts')) {
	process.exit(main(process.argv.slice(2)));
}
