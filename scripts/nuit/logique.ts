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

export type TestStatus = 'green' | 'red' | 'skipped';

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
}

export type Args = { command: 'show' } | { command: 'run'; trial: boolean };

// ============================================================================
// Constantes
// ============================================================================

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
			into[[test.projectName, spec.file, ...path, spec.title].join(' › ')] = status;
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
	return Object.keys(tests).length > 0 ? tests : null;
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
		Object.values(data.tests).every((s) => s === 'green' || s === 'red' || s === 'skipped')
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
		isStep(value.guards, isGuards)
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
	const reds: string[] = [];
	const eve = previous.at(0);

	// Une étape en panne : une fois, tant que la veille n'était pas déjà en panne.
	for (const key of ['proofs', 'verifs', 'guards'] as const) {
		const step = current[key];
		if (!step.ok && (eve === undefined || eve[key].ok)) {
			reds.push(`${STEP_NAMES[key]} : ${step.failure}`);
		}
	}

	if (current.proofs.ok) {
		const before = lastData(previous, 'proofs');
		const { struck, pushFailure, broken } = current.proofs.data;
		if (pushFailure !== null && struck.length > 0 && (before?.pushFailure ?? null) === null) {
			reds.push(
				`lignes barrées mais pas poussées sur main (${pushFailure}) : ${struck.join(', ')}`
			);
		}
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
	const statuses = Object.values(current.verifs.data.tests);
	const count = (status: TestStatus): number => statuses.filter((s) => s === status).length;
	const lines = [
		`${title} : ${plural(count('green'), 'vert')}, ${plural(count('red'), 'rouge')}, ${plural(count('skipped'), 'sauté')}`
	];
	for (const name of redTests(current.verifs.data)) lines.push(`  rouge : ${name}`);
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
	const head =
		reds.length === 0
			? 'Aucun rouge nouveau.'
			: `Rouges nouveaux (${reds.length})\n${reds.map((r) => `  ${r}`).join('\n')}`;
	return [
		`Nuit du ${current.date} (main ${current.commit})`,
		head,
		proofsBlock(current, previous),
		verifsBlock(current),
		guardsBlock(current)
	].join('\n\n');
}

/** Les arguments de `pnpm nuit`, ou `null` : on affiche l'usage. */
export function parseArgs(args: string[]): Args | null {
	if (args.length === 0) return { command: 'show' };
	if (!args.includes('--lancer')) return null;
	if (args.some((a) => a !== '--lancer' && a !== '--essai')) return null;
	return { command: 'run', trial: args.includes('--essai') };
}
