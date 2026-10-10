/**
 * Le hook qui refuse les commandes interdites par CLAUDE.md
 * =========================================================
 *
 * `.claude/hooks/garde-commandes.py` tourne avant chaque commande Bash de
 * Claude Code. Il transforme les interdits de CLAUDE.md en garde-fous : un
 * refus (sortie 2, explication sur stderr, renvoyée au modèle) ou une demande
 * de confirmation à David (`permissionDecision: ask`), qu'aucune règle
 * n'utilise aujourd'hui.
 *
 * Gardé ici : chaque interdit est refusé, sa variante légitime passe, et une
 * commande ordinaire passe sans bruit.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const HOOK = resolve(__dirname, '../../.claude/hooks/garde-commandes.py');

function hook(command: string, cwd = '/Users/david/Coding/js/ubumaths') {
	const r = spawnSync('python3', [HOOK], {
		input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
		encoding: 'utf8'
	});
	return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const refuse = (command: string, motif: RegExp, cwd?: string) => {
	const r = hook(command, cwd);
	expect(r.status, `${command}\n${r.stderr}`).toBe(2);
	expect(r.stderr).toMatch(motif);
};

const passe = (command: string, cwd?: string) => {
	const r = hook(command, cwd);
	expect(r.status, `${command}\n${r.stderr}`).toBe(0);
	expect(r.stdout).toBe('');
};

describe('garde-commandes — refusé, avec la raison', () => {
	it('typecheck qui meurt sur le tas V8', () => {
		refuse('pnpm check:fast', /check:incremental/);
		refuse('cd src && npx tsc --noEmit', /check:incremental/);
		refuse('npx svelte-check --tsconfig ./tsconfig.check.json', /--incremental/);
	});

	it('pnpm dev sans port fixe, sur le port de David, ou avec un « -- » qui perd le port', () => {
		refuse('pnpm dev', /--port 5175 --strictPort/);
		refuse('pnpm dev -- --port 5175 --strictPort', /« -- »/);
		refuse('pnpm dev --port 5173 --strictPort', /5173/);
		refuse('pnpm dev --port 5175', /--strictPort/);
	});

	it('kill:servers depuis un worktree', () => {
		refuse('pnpm kill:servers', /worktree/, '/Users/david/Coding/js/ubumaths-wt-logo');
	});

	it('la CLI supabase lancée directement', () => {
		refuse('supabase db push', /pnpm exec supabase/);
		refuse('npx supabase status', /pnpm exec supabase/);
	});

	it('push sans les hooks, release seule, git -C vide', () => {
		refuse('git push --no-verify origin main', /--no-verify/);
		refuse('pnpm release', /deploy:prod/);
		refuse('git -C "" status', /dossier courant/);
		refuse("git -C '' checkout x", /dossier courant/);
	});
});

describe('garde-commandes — la mise en prod passe (décision de David, 2026-10-10)', () => {
	it('pnpm deploy:prod et son essai passent sans demande', () => {
		passe('pnpm deploy:prod');
		passe('pnpm deploy:prod --essai');
	});
});

describe('garde-commandes — le reste passe sans bruit', () => {
	it('les variantes légitimes', () => {
		passe('pnpm check:incremental');
		passe('FORCE=1 pnpm check:incremental');
		passe('pnpm dev --port 5175 --strictPort');
		passe('pnpm dev --port 5177 --strictPort');
		passe('pnpm kill:servers');
		passe('pnpm exec supabase migration list');
		passe('pnpm db:migrate');
		passe('git push origin main');
		passe('git -C /tmp/x status');
		passe('pnpm release --dry-run'); // essai à blanc : aucune version créée
	});

	it('une commande ordinaire, et un mot interdit dans un message de commit', () => {
		passe('ls -la && git status');
		passe('git commit -m "retirer check:fast et pnpm release du package.json"');
	});

	it('une entrée illisible ne bloque pas', () => {
		const r = spawnSync('python3', [HOOK], { input: 'pas du json', encoding: 'utf8' });
		expect(r.status).toBe(0);
	});
});
