/**
 * Combat de la recrue — la page (La Descente de la Vistule, étape 3).
 * Phase 0 de l'étape 3, validée par David le 2026-11-18 (docs/wip/navadra-progress.md).
 * Les appels au serveur sont remplacés (`combat-client`) ; les règles du tour
 * sont celles de `combat-rules.ts`, testées à part.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import type { MathfieldElement } from 'mathlive';
import type { QuestionInstance } from '#lib/questions/types.ts';
import type { OpenedCombat } from '#lib/descente/combat-rules.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';

// Mocks
const requestQuestion = vi.fn();
const sendAnswer = vi.fn();
const claimVictory = vi.fn();
vi.mock('#lib/descente/combat-client.ts', () => ({ requestQuestion, sendAnswer, claimVictory }));

const { default: CombatArena } = await import('../CombatArena.svelte');

// Constantes
const BEAST_ID = '44444444-4444-4444-8444-444444444444';
const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';

// Functions
function combat(hp = 120): OpenedCombat {
	return {
		beast: {
			id: BEAST_ID,
			kind: 'ordinary',
			province: 'bedonstan',
			name: 'Bête de Bedonstan n° 1',
			hp,
			maxHp: 120
		},
		openProvinces: ['nombrilie', 'bedonstan']
	};
}

function question(): QuestionInstance {
	return {
		templateId: TEMPLATE_ID,
		statement: resolvedMarkdown('Combien ? $\\placeholder[0]{}$'),
		blanks: [{ expectedAnswer: '4', type: 'math' }],
		grades: ['6'],
		level: 1,
		seed: 7,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown('Correction')] }
	} as QuestionInstance;
}

let mains: HTMLElement[] = [];

async function open(opened: OpenedCombat = combat()) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const result = await render(CombatArena, {
		target: main,
		props: { combat: opened, quitHref: '/dashboard/student/descente' }
	});
	flushSync();
	await tick();
	return result;
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
		candidate.textContent?.trim().startsWith(label)
	);
}

async function click(container: HTMLElement, label: string) {
	await expect.poll(() => findButton(container, label)).toBeTruthy();
	const found = findButton(container, label) as HTMLButtonElement;
	found.click();
	flushSync();
	await tick();
}

function text(container: HTMLElement, testId: string): string {
	return container.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
}

/** Tape `keys` dans la case de la carte affichée */
async function type(container: HTMLElement, keys: string) {
	const front = () =>
		container.querySelector('[data-testid="combat-question"] .flip-card-front') as HTMLElement;
	await expect.poll(() => front()?.querySelector('math-field')).toBeTruthy();
	const field = front().querySelector('math-field') as MathfieldElement;
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
	await userEvent.keyboard(keys);
	await expect.poll(() => field.getPromptValue('0')).not.toBe('');
}

/** Un coup : choisir, (taper), valider, continuer */
async function strike(container: HTMLElement, move: string, keys?: string) {
	await click(container, move);
	if (keys) await type(container, keys);
	await click(container, 'Valider');
	await expect.poll(() => text(container, 'combat-verdict')).not.toBe('');
}

beforeAll(async () => {
	await import('mathlive');
	await customElements.whenDefined('math-field');
});

beforeEach(() => {
	requestQuestion.mockReset().mockResolvedValue({ ok: true, value: { instance: question() } });
	sendAnswer.mockReset();
	claimVictory.mockReset().mockResolvedValue({ ok: true, value: { paid: 1, capReached: false } });
});

afterEach(() => {
	for (const main of mains) main.remove();
	mains = [];
});

// Suite
describe('CombatArena — combat de la recrue', () => {
	it('montre la Bête, sa Province sensible, ses PV, les 3 cœurs et les coups', async () => {
		const { container } = await open();
		expect(container.textContent).toContain('Bête de Bedonstan n° 1');
		expect(container.textContent).toContain('Sensible aux coups de Bedonstan');
		expect(text(container, 'combat-beast-hp')).toBe('120 / 120');
		expect(text(container, 'combat-hearts')).toContain('3 sur 3');

		const bedonstan = container.querySelector<HTMLButtonElement>(
			'[data-testid="combat-move-bedonstan"]'
		);
		expect(bedonstan?.disabled).toBe(false);
		expect(bedonstan?.textContent).toContain('Double dégâts');

		// Province sans question à son niveau : coup fermé, avec un mot
		const glitch = container.querySelector<HTMLButtonElement>(
			'[data-testid="combat-move-glitchistan"]'
		);
		expect(glitch?.disabled).toBe(true);
		expect(glitch?.textContent).toContain('Pas encore de question de Glitchistan à ton niveau');
	});

	it('un coup réussi sur la Province sensible : « Coup de Maître », PV rendus par le serveur', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 100, recorded: true, victory: null }
		});
		const { container } = await open();
		await strike(container, 'Coup de Bedonstan', '4');

		expect(requestQuestion).toHaveBeenCalledWith(BEAST_ID, {
			purpose: 'attack',
			province: 'bedonstan',
			recent: []
		});
		const sent = sendAnswer.mock.calls[0][1];
		expect(sent).toMatchObject({ purpose: 'attack', province: 'bedonstan' });
		expect(sent.answer.isCorrect).toBe(true);
		expect(text(container, 'combat-verdict')).toBe(
			'Coup de Maître ! La Bête perd 20 points de vie.'
		);
		expect(text(container, 'combat-beast-hp')).toBe('100 / 120');

		await click(container, 'Continuer');
		expect(text(container, 'combat-round')).toContain('coup 2 sur 3');
	});

	it('réponse ratée : « Tu as dévié »', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 120, recorded: true, victory: null }
		});
		const { container } = await open();
		await strike(container, 'Coup de Nombrilie');
		expect(text(container, 'combat-verdict')).toBe('Tu as dévié : le coup est raté.');
	});

	it('après 3 coups, la riposte : esquive ratée, un cœur de moins', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 120, recorded: true, victory: null }
		});
		const { container } = await open();
		await strike(container, 'Coup de Nombrilie');
		await click(container, 'Continuer');
		await strike(container, 'Coup de Nombrilie');
		await click(container, 'Continuer');
		await strike(container, 'Coup de Nombrilie');

		// Troisième coup : la Bête riposte, l'esquive vient de son point
		await click(container, 'La Bête riposte');
		expect(requestQuestion).toHaveBeenLastCalledWith(BEAST_ID, {
			purpose: 'dodge',
			province: 'bedonstan',
			recent: [TEMPLATE_ID]
		});
		await click(container, 'Valider');
		await expect.poll(() => text(container, 'combat-verdict')).toBe('Touché : tu perds un cœur.');
		expect(text(container, 'combat-hearts')).toContain('2 sur 3');
	});

	it('le coup qui achève : victoire, carnet et gidouille', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 0, recorded: true, victory: { paid: 1, capReached: false } }
		});
		const { container } = await open(combat());
		await click(container, 'Coup de Bedonstan');
		await type(container, '4');
		await click(container, 'Valider');

		await expect.poll(() => text(container, 'combat-won')).toContain('Victoire !');
		expect(text(container, 'combat-won')).toContain('entre dans ton carnet de voyage');
		expect(text(container, 'combat-won')).toContain('+1 gidouille');
	});

	it('plafond atteint : un mot le dit, le combat compte quand même', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 0, recorded: true, victory: { paid: 0, capReached: true } }
		});
		const { container } = await open();
		await click(container, 'Coup de Bedonstan');
		await click(container, 'Valider');
		await expect.poll(() => text(container, 'combat-won')).toContain('plafond de gidouilles');
	});

	it('Bête déjà à 0 à l’ouverture : la victoire est renvoyée', async () => {
		const { container } = await open(combat(0));
		await expect.poll(() => claimVictory.mock.calls.length).toBe(1);
		expect(claimVictory).toHaveBeenCalledWith(BEAST_ID);
		await expect.poll(() => text(container, 'combat-won')).toContain('+1 gidouille');
	});

	it('Bête repartie pendant le combat : le combat s’arrête avec un mot', async () => {
		sendAnswer.mockResolvedValue({ ok: false, code: 'gone' });
		const { container } = await open();
		await click(container, 'Coup de Bedonstan');
		await click(container, 'Valider');
		await expect.poll(() => container.textContent).toContain('Cette Bête est repartie.');
	});

	it('réponse perdue (réseau) : un mot discret, le combat continue', async () => {
		sendAnswer.mockResolvedValue({ ok: false, code: 'network' });
		const { container } = await open();
		await strike(container, 'Coup de Bedonstan', '4');
		expect(container.textContent).toContain('Une réponse n’a pas pu être enregistrée');
		// Le coup ne part pas : les PV ne bougent pas, et le verdict le dit
		expect(text(container, 'combat-beast-hp')).toBe('120 / 120');
		expect(text(container, 'combat-verdict')).toBe(
			'Ta réponse n’a pas pu arriver : le coup n’est pas parti.'
		);
	});

	it('question qui n’arrive pas (réseau) : le combat continue, on rechoisit son coup', async () => {
		requestQuestion.mockResolvedValueOnce({ ok: false, code: 'network' });
		const { container } = await open();
		await click(container, 'Coup de Bedonstan');
		await expect.poll(() => container.textContent).toContain('La question n’a pas pu arriver');
		expect(container.textContent).not.toContain('Le combat ne peut pas continuer');
		// Nouvel essai : la question arrive
		await click(container, 'Coup de Bedonstan');
		await expect
			.poll(() => container.querySelector('[data-testid="combat-question"]'))
			.toBeTruthy();
	});

	it('Bête achevée par une réponse perdue plus tôt : la victoire arrive à l’esquive', async () => {
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 20, recorded: true, victory: null }
		});
		const { container } = await open();
		for (let i = 0; i < 3; i++) {
			await strike(container, 'Coup de Nombrilie');
			if (i < 2) await click(container, 'Continuer');
		}
		await click(container, 'La Bête riposte');
		sendAnswer.mockResolvedValue({
			ok: true,
			value: { beastHp: 0, recorded: true, victory: { paid: 1, capReached: false } }
		});
		await click(container, 'Valider');
		await expect.poll(() => text(container, 'combat-won')).toContain('+1 gidouille');
	});
});
