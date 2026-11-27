/**
 * Règles de la tâche de nuit (`pnpm nuit`), sans effet de bord
 * ============================================================
 *
 * Ce que la tâche lance et écrit : index.ts. Ici : lire le compte rendu de
 * Playwright, dire ce qui est rouge pour la PREMIÈRE fois, écrire le bilan.
 * Tests : scripts/__tests__/nuit.test.ts. Doc : docs/pratiques/tache-de-nuit.md.
 */

// ============================================================================
// Types
// ============================================================================

/** `flaky` : rouge à la suite complète, vert au second essai (charge, pas un défaut prouvé). */
export type TestStatus = 'green' | 'red' | 'flaky' | 'skipped';

/** Une panne qui peut durer : une étape qui ne tourne pas, ou le registre barré pas poussé. */
export type OutageKey = 'proofs' | 'verifs' | 'guards' | 'push';

/** Une étape a tourné (`data`) ou non (`failure` : pourquoi). */
export type Step<T> = { ok: true; data: T } | { ok: false; failure: string };

export interface BrokenProof {
	id: string;
	detail: string;
}

export interface ProofsData {
	/** Écarts barrés cette nuit (preuve verte). */
	struck: string[];
	/** Lignes barrées mais pas parties sur `main` : la cause, sinon `null`. */
	pushFailure: string | null;
	broken: BrokenProof[];
	/** Tous les écarts ouverts au début du rejeu, « à la main » compris. */
	open: string[];
}

export interface VerifsData {
	/** « navigateur › fichier › titre » → verdict. */
	tests: Record<string, TestStatus>;
	/** Le second essai des rouges n'a pas pu tourner : pourquoi. */
	replay?: string;
}

export interface Guard {
	name: string;
	ok: boolean;
	/** Dernières lignes de la garde quand elle est rouge. */
	detail: string;
}

export interface Night {
	/** Jour du lancement, AAAA-MM-JJ. */
	date: string;
	/** Commit de `main` joué (court). */
	commit: string;
	proofs: Step<ProofsData>;
	verifs: Step<VerifsData>;
	guards: Step<Guard[]>;
	/** Rouges nouveaux dont la notification n'est pas partie : repris la nuit suivante. */
	pending?: string[];
	/** Pannes notifiées cette nuit (la première fois, ou en rappel). */
	outages?: OutageKey[];
}

export interface ReplayLine {
	id: string;
	outcome: 'green' | 'red' | 'broken' | 'manual';
	detail?: string;
}

export type Args = { command: 'show' } | { command: 'run'; trial: boolean };

// ============================================================================
// Constantes
// ============================================================================

const WORST_FIRST: TestStatus[] = ['red', 'flaky', 'skipped', 'green'];
const DAY_MS = 86_400_000;
/** Une panne qui dure renotifie tous les 7 jours (David, 2026-11-25). */
const REMINDER_DAYS = 7;
/** Une nuit dure moins que cela : un verrou plus vieux est celui d'une nuit morte. */
const LOCK_MAX_MS = 8 * 3_600_000;
const OUTAGE_KEYS: OutageKey[] = ['proofs', 'verifs', 'guards', 'push'];
const TEST_STATUSES: TestStatus[] = ['green', 'red', 'flaky', 'skipped'];
/** Préfixe d'un fichier de test qui ne se charge pas (rouge sans test à rejouer). */
export const LOAD_ERROR = 'erreur de chargement ›';

const STEP_NAMES = {
	proofs: 'preuves des écarts pas jouées',
	verifs: 'vérifications à l’écran pas jouées',
	guards: 'gardes de doc pas jouées'
} as const;

type StepKey = keyof typeof STEP_NAMES;

// ============================================================================
// Fonctions : lecture
// ============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function playwrightStatus(status: unknown): TestStatus | null {
	if (status === 'expected') return 'green';
	if (status === 'skipped') return 'skipped';
	// `flaky` : rouge puis vert au rejeu. La suite ne rejoue rien ; s'il arrive, c'est un rouge.
	if (status === 'unexpected' || status === 'flaky') return 'red';
	return null;
}

/** Lit une suite du compte rendu ; `false` dès qu'une forme est inattendue. */
function readSuite(suite: unknown, path: string[], into: Record<string, TestStatus>): boolean {
	if (!isRecord(suite)) return false;
	const specs = suite.specs ?? [];
	const suites = suite.suites ?? [];
	if (!Array.isArray(specs) || !Array.isArray(suites)) return false;

	for (const spec of specs) {
		if (!isRecord(spec) || typeof spec.title !== 'string' || typeof spec.file !== 'string') {
			return false;
		}
		if (!Array.isArray(spec.tests)) return false;
		for (const test of spec.tests) {
			if (!isRecord(test) || typeof test.projectName !== 'string') return false;
			const status = playwrightStatus(test.status);
			if (status === null) return false;
			const key = [test.projectName, spec.file, ...path, spec.title].join(' › ');
			// Deux tests de même nom : le pire verdict, un vert n'efface jamais un rouge.
			const known = into[key];
			if (known === undefined || WORST_FIRST.indexOf(status) < WORST_FIRST.indexOf(known)) {
				into[key] = status;
			}
		}
	}
	for (const child of suites) {
		if (!isRecord(child) || typeof child.title !== 'string') return false;
		if (!readSuite(child, [...path, child.title], into)) return false;
	}
	return true;
}

/**
 * Les verdicts du compte rendu JSON de Playwright, un par test et par navigateur.
 * `null` : compte rendu illisible, ou aucun test joué (une suite vide ne prouve rien).
 */
export function playwrightTests(report: unknown): Record<string, TestStatus> | null {
	if (!isRecord(report) || !Array.isArray(report.suites)) return null;
	const tests: Record<string, TestStatus> = {};
	// Le titre d'une suite de premier niveau est son fichier : il n'entre pas dans le chemin.
	for (const suite of report.suites) {
		if (!readSuite(suite, [], tests)) return null;
	}
	if (Object.keys(tests).length === 0) return null;
	// Un fichier qui ne se charge pas n'a aucune suite : sans cette ligne, il serait un silence.
	const errors = Array.isArray(report.errors) ? report.errors : [];
	for (const error of errors) {
		const message = isRecord(error) && typeof error.message === 'string' ? error.message : '';
		const first = message.split('\n')[0].trim().slice(0, 160) || 'sans message';
		tests[`${LOAD_ERROR} ${first}`] = 'red';
	}
	return tests;
}

/** Le bilan de `pnpm ecarts rejouer --json` ; `null` si un verdict est inconnu (jamais un vert par défaut). */
export function readReplay(value: unknown): ReplayLine[] | null {
	if (!Array.isArray(value)) return null;
	const lines: ReplayLine[] = [];
	for (const line of value) {
		if (!isRecord(line) || typeof line.id !== 'string' || typeof line.outcome !== 'string') {
			return null;
		}
		const outcome = line.outcome;
		if (outcome !== 'green' && outcome !== 'red' && outcome !== 'broken' && outcome !== 'manual') {
			return null;
		}
		lines.push({
			id: line.id,
			outcome,
			...(typeof line.detail === 'string' ? { detail: line.detail } : {})
		});
	}
	return lines;
}

function isStep(value: unknown, isData: (data: unknown) => boolean): boolean {
	if (!isRecord(value)) return false;
	if (value.ok === false) return typeof value.failure === 'string';
	return value.ok === true && isData(value.data);
}

function isProofsData(data: unknown): boolean {
	return (
		isRecord(data) &&
		isStringArray(data.struck) &&
		isStringArray(data.open) &&
		(data.pushFailure === null || typeof data.pushFailure === 'string') &&
		Array.isArray(data.broken) &&
		data.broken.every(
			(b) => isRecord(b) && typeof b.id === 'string' && typeof b.detail === 'string'
		)
	);
}

function isVerifsData(data: unknown): boolean {
	return (
		isRecord(data) &&
		isRecord(data.tests) &&
		Object.values(data.tests).every((s) => TEST_STATUSES.includes(s as TestStatus)) &&
		(data.replay === undefined || typeof data.replay === 'string')
	);
}

function isGuards(data: unknown): boolean {
	return (
		Array.isArray(data) &&
		data.every(
			(g) =>
				isRecord(g) &&
				typeof g.name === 'string' &&
				typeof g.ok === 'boolean' &&
				typeof g.detail === 'string'
		)
	);
}

/** Une nuit relue du disque : un fichier abîmé ne sert pas de veille. */
export function isNight(value: unknown): value is Night {
	return (
		isRecord(value) &&
		typeof value.date === 'string' &&
		typeof value.commit === 'string' &&
		isStep(value.proofs, isProofsData) &&
		isStep(value.verifs, isVerifsData) &&
		isStep(value.guards, isGuards) &&
		(value.pending === undefined || isStringArray(value.pending)) &&
		(value.outages === undefined ||
			(isStringArray(value.outages) &&
				value.outages.every((k) => OUTAGE_KEYS.includes(k as OutageKey))))
	);
}

// ============================================================================
// Fonctions : rouges nouveaux
// ============================================================================

/** La dernière nuit où l'étape a tourné : la veille en panne ne fait rien oublier. */
function lastData<K extends StepKey>(
	previous: Night[],
	key: K
): Extract<Night[K], { ok: true }>['data'] | null {
	for (const night of previous) {
		const step: Step<unknown> = night[key];
		if (step.ok) return step.data as Extract<Night[K], { ok: true }>['data'];
	}
	return null;
}

function redTests(data: VerifsData | null): string[] {
	if (data === null) return [];
	return Object.entries(data.tests)
		.filter(([, status]) => status === 'red')
		.map(([name]) => name);
}

/**
 * Ce qui est rouge cette nuit et ne l'était pas : seul motif d'une notification.
 * `previous` : les nuits passées, la plus récente d'abord.
 */
export function newReds(previous: Night[], current: Night): string[] {
	const reds = outageNotices(previous, current).map((notice) => notice.line);

	if (current.proofs.ok) {
		const before = lastData(previous, 'proofs');
		const { broken } = current.proofs.data;
		const known = new Set((before?.broken ?? []).map((b) => b.id));
		for (const proof of broken) {
			if (!known.has(proof.id)) reds.push(`preuve cassée : ${proof.id} (${proof.detail})`);
		}
	}

	if (current.verifs.ok) {
		const known = new Set(redTests(lastData(previous, 'verifs')));
		for (const name of redTests(current.verifs.data)) {
			if (!known.has(name)) reds.push(`test rouge : ${name}`);
		}
	}

	if (current.guards.ok) {
		const before = lastData(previous, 'guards') ?? [];
		const known = new Set(before.filter((g) => !g.ok).map((g) => g.name));
		for (const guard of current.guards.data) {
			if (!guard.ok && !known.has(guard.name)) reds.push(`garde de doc rouge : ${guard.name}`);
		}
	}

	return reds;
}

/**
 * La panne d'une nuit : vrai, faux, ou `null` quand la nuit ne permet pas de le
 * savoir (registre : preuves pas jouées, ou rien à pousser). Une nuit `null` ne
 * coupe pas une panne qui dure, elle est sautée.
 */
function outageIn(night: Night, key: OutageKey): boolean | null {
	if (key !== 'push') return !night[key].ok;
	if (!night.proofs.ok || night.proofs.data.struck.length === 0) return null;
	return night.proofs.data.pushFailure !== null;
}

function outageLine(current: Night, key: OutageKey): string {
	if (key === 'push' && current.proofs.ok) {
		const { pushFailure, struck } = current.proofs.data;
		return `lignes barrées mais pas poussées sur main (${pushFailure}) : ${struck.join(', ')}`;
	}
	const step = current[key as StepKey];
	return `${STEP_NAMES[key as StepKey]} : ${step.ok ? '' : step.failure}`;
}

function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/**
 * Les pannes à notifier cette nuit : une panne neuve, ou une panne qui dure
 * depuis 7 jours au moins sans avoir été notifiée. Le début d'une panne compte
 * comme notifié (nuits écrites avant `outages`, notification pas partie : celle-ci
 * est reprise par `pending`).
 */
function outageNotices(previous: Night[], current: Night): Array<{ key: OutageKey; line: string }> {
	const notices: Array<{ key: OutageKey; line: string }> = [];
	for (const key of OUTAGE_KEYS) {
		if (outageIn(current, key) !== true) continue;
		let start: string | null = null;
		let lastNotified: string | null = null;
		for (const night of previous) {
			const down = outageIn(night, key);
			if (down === null) continue;
			if (!down) break;
			start = night.date;
			if (lastNotified === null && night.outages?.includes(key)) lastNotified = night.date;
		}
		const line = outageLine(current, key);
		if (start === null) {
			notices.push({ key, line });
		} else if (daysBetween(lastNotified ?? start, current.date) >= REMINDER_DAYS) {
			notices.push({ key, line: `rappel (panne depuis le ${start}) : ${line}` });
		}
	}
	return notices;
}

/** Les pannes notifiées cette nuit, à garder dans son bilan (`outages`). */
export function notifiedOutages(previous: Night[], current: Night): OutageKey[] {
	return outageNotices(previous, current).map((notice) => notice.key);
}

/**
 * Le second essai des rouges : un rouge vert au second essai devient instable.
 * Absent du second essai (il ne s'est pas chargé) : rouge, jamais un vert par défaut.
 */
export function mergeReplay(
	first: Record<string, TestStatus>,
	replay: Record<string, TestStatus>
): Record<string, TestStatus> {
	const merged: Record<string, TestStatus> = { ...first };
	for (const [name, status] of Object.entries(first)) {
		if (status === 'red' && replay[name] === 'green') merged[name] = 'flaky';
	}
	return merged;
}

/** La phrase de la notification : un nombre, rien du contenu (ntfy est un service extérieur). */
export function notificationPhrase(reds: string[]): string {
	const n = reds.length;
	return `bilan de la nuit à lire (${n} ${n > 1 ? 'rouges nouveaux' : 'rouge nouveau'})`;
}

/**
 * `pnpm prevenir` sort en 0 même sans réseau : seule sa ligne « envoyé » fait foi.
 * (« déjà envoyé » : même message il y a moins de 10 minutes, David est prévenu.)
 */
export function deliveredNotice(status: number | null, lastLine: string): boolean {
	return status === 0 && /^(✅ envoyé|⏸ déjà envoyé)/.test(lastLine);
}

/** Les écarts que `pnpm ecarts rejouer --barrer` dit avoir barrés (sa sortie fait foi), ou `null`. */
export function struckIds(output: string): string[] | null {
	const struck = /^Barré dans le registre : (.+?)\. À commiter/m.exec(output);
	return struck === null ? null : struck[1].split(', ');
}

/** Un verrou dont le processus a disparu, ou plus vieux qu'une nuit, est périmé. */
export function lockIsStale(lock: { alive: boolean; ageMs: number }): boolean {
	return !lock.alive || lock.ageMs >= LOCK_MAX_MS;
}

/** Ce dont David doit être prévenu : les rouges nouveaux, et ceux de la veille restés sans notification. */
export function redsToNotify(previous: Night[], current: Night): string[] {
	const unsent = previous.at(0)?.pending ?? [];
	return [...new Set([...unsent, ...newReds(previous, current)])];
}

/** Nuits manquées entre le dernier bilan et aujourd'hui (0 : celui de ce matin ou d'hier). */
export function staleDays(lastDate: string, today: string): number {
	const days = Math.round((Date.parse(today) - Date.parse(lastDate)) / DAY_MS);
	return Number.isFinite(days) ? Math.max(0, days - 1) : 0;
}

/** Les écarts entrés au registre depuis la dernière nuit où les preuves ont tourné. */
export function newGaps(previous: Night[], current: Night): string[] {
	const before = lastData(previous, 'proofs');
	if (before === null || !current.proofs.ok) return [];
	// Un écart barré la veille n'est plus dans `open` : il ne peut pas revenir comme « nouveau ».
	const known = new Set([...before.open, ...before.struck]);
	return current.proofs.data.open.filter((id) => !known.has(id));
}

// ============================================================================
// Fonctions : bilan
// ============================================================================

function plural(count: number, word: string): string {
	return `${count} ${word}${count > 1 ? 's' : ''}`;
}

function indent(text: string, prefix: string): string {
	return text
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n');
}

function proofsBlock(current: Night, previous: Night[]): string {
	if (!current.proofs.ok) return `Écarts : ${STEP_NAMES.proofs} : ${current.proofs.failure}`;
	const { struck, pushFailure, broken, open } = current.proofs.data;
	const lines = [`Écarts : ${plural(open.length - struck.length, 'ouvert')}`];
	if (struck.length > 0) {
		const pushed = pushFailure === null ? '' : ` — ⚠️ pas poussés sur main : ${pushFailure}`;
		lines.push(`  clos cette nuit (${struck.length}) : ${struck.join(', ')}${pushed}`);
	}
	if (broken.length > 0) {
		const list = broken.map((b) => `${b.id} (${b.detail})`).join(' · ');
		lines.push(`  preuves cassées (${broken.length}) : ${list}`);
	}
	const gaps = newGaps(previous, current);
	if (gaps.length > 0) {
		lines.push(`  entrés au registre depuis la veille (${gaps.length}) : ${gaps.join(', ')}`);
	}
	return lines.join('\n');
}

function verifsBlock(current: Night): string {
	const title = 'Vérifications à l’écran';
	if (!current.verifs.ok) return `${title} : ${STEP_NAMES.verifs} : ${current.verifs.failure}`;
	const { tests, replay } = current.verifs.data;
	const statuses = Object.values(tests);
	const count = (status: TestStatus): number => statuses.filter((s) => s === status).length;
	const flaky = count('flaky') > 0 ? `, ${plural(count('flaky'), 'instable')}` : '';
	const lines = [
		`${title} : ${plural(count('green'), 'vert')}, ${plural(count('red'), 'rouge')}${flaky}, ${plural(count('skipped'), 'sauté')}`
	];
	if (replay !== undefined) lines.push(`  ⚠️ second essai pas joué : ${replay}`);
	for (const name of redTests(current.verifs.data)) lines.push(`  rouge : ${name}`);
	for (const [name, status] of Object.entries(tests)) {
		if (status === 'flaky') lines.push(`  instable (vert au second essai) : ${name}`);
	}
	return lines.join('\n');
}

function guardsBlock(current: Night): string {
	if (!current.guards.ok) return `Gardes de doc : ${STEP_NAMES.guards} : ${current.guards.failure}`;
	const red = current.guards.data.filter((g) => !g.ok);
	if (red.length === 0) return `Gardes de doc : ${plural(current.guards.data.length, 'verte')}`;
	const lines = [`Gardes de doc : ${plural(red.length, 'rouge')}`];
	for (const guard of red) {
		lines.push(`  ${guard.name}`);
		if (guard.detail !== '') lines.push(indent(guard.detail, '      '));
	}
	return lines.join('\n');
}

/** Le bilan d'une nuit, tel que `pnpm nuit` l'affiche. `previous` : la plus récente d'abord. */
export function formatSummary(current: Night, previous: Night[]): string {
	const reds = newReds(previous, current);
	const list =
		reds.length === 0
			? 'Aucun rouge nouveau.'
			: `Rouges nouveaux (${reds.length})\n${reds.map((r) => `  ${r}`).join('\n')}`;
	const head =
		previous.length === 0 ? `Première nuit : tout rouge compte comme nouveau.\n${list}` : list;
	return [
		`Nuit du ${current.date} (main ${current.commit})`,
		head,
		proofsBlock(current, previous),
		verifsBlock(current),
		guardsBlock(current)
	].join('\n\n');
}

/**
 * Un processus et tous ses descendants, d'après `ps -axo pid=,ppid=`. pnpm met
 * chaque script dans son propre groupe : arrêter un groupe ne suffit pas, il
 * faut suivre la parenté.
 */
export function processTree(psOutput: string, root: number): number[] {
	const children = new Map<number, number[]>();
	for (const line of psOutput.split('\n')) {
		const [pid, parent] = line.trim().split(/\s+/).map(Number);
		if (!Number.isInteger(pid) || !Number.isInteger(parent)) continue;
		children.set(parent, [...(children.get(parent) ?? []), pid]);
	}
	const tree = [root];
	for (let i = 0; i < tree.length; i++) {
		for (const child of children.get(tree[i]) ?? []) {
			if (!tree.includes(child)) tree.push(child);
		}
	}
	return tree;
}

/** Les arguments de `pnpm nuit`, ou `null` : on affiche l'usage. */
export function parseArgs(args: string[]): Args | null {
	if (args.length === 0) return { command: 'show' };
	if (!args.includes('--lancer')) return null;
	if (args.some((a) => a !== '--lancer' && a !== '--essai')) return null;
	return { command: 'run', trial: args.includes('--essai') };
}
