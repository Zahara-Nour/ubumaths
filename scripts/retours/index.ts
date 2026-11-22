/**
 * `pnpm retours` : lire les retours envoyés par le bouton « signaler »
 * ===================================================================
 *
 * Sans argument : le dernier retour de CE worktree (`.captures/retours/`).
 * `pnpm retours 2` : l'avant-dernier ; `pnpm retours --liste` : les dix derniers.
 * Doc : docs/pratiques/signaler-depuis-la-page.md.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
	FEEDBACK_DIR,
	feedbackSchema,
	formatFeedback,
	latestFeedbackFiles,
	printable,
	type StoredFeedback
} from './logique.ts';

const USAGE = 'Usage : pnpm retours [<n>] [--liste]';
const LIST_LENGTH = 10;

function read(dir: string, file: string): StoredFeedback | null {
	try {
		const { receivedAt, ...payload } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
		const parsed = feedbackSchema.safeParse(payload);
		if (!parsed.success || typeof receivedAt !== 'string') return null;
		return { ...parsed.data, receivedAt };
	} catch {
		return null;
	}
}

function main(): number {
	const args = process.argv.slice(2);
	const dir = resolve(process.cwd(), FEEDBACK_DIR);
	const files = latestFeedbackFiles(dir);

	if (files.length === 0) {
		console.log(`Aucun retour dans ${FEEDBACK_DIR} (le bouton « signaler » écrit ici).`);
		return 0;
	}

	if (args.includes('--liste')) {
		files.slice(0, LIST_LENGTH).forEach((file, index) => {
			const feedback = read(dir, file);
			const summary = feedback
				? `${new URL(feedback.url).pathname} — ${feedback.note.trim().split('\n')[0]?.slice(0, 80) || '(sans note)'} — ${feedback.errors.length} erreur(s)`
				: '(fichier illisible)';
			console.log(`${index + 1}. ${file.slice(0, 19)} ${printable(summary)}`);
		});
		if (files.length > LIST_LENGTH) console.log(`… et ${files.length - LIST_LENGTH} plus anciens`);
		return 0;
	}

	const rank = args.length === 0 ? 1 : Number(args[0]);
	if (!Number.isInteger(rank) || rank < 1 || args.length > 1) {
		console.error(USAGE);
		return 1;
	}
	const file = files[rank - 1];
	if (!file) {
		console.error(`Il n'y a que ${files.length} retour(s).`);
		return 1;
	}
	const feedback = read(dir, file);
	if (!feedback) {
		console.error(`Retour illisible : ${join(FEEDBACK_DIR, file)}`);
		return 1;
	}
	console.log(formatFeedback(feedback, join(FEEDBACK_DIR, file)));
	return 0;
}

process.exit(main());
