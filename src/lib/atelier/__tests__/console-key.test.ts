/**
 * Le raccourci de la console déroulante (lot 2 de
 * `docs/archive/wip/atelier-refonte-interface-phase0.md`).
 *
 * Mesure du 2026-10-18 sur le Mac AZERTY de David (Chrome) : la touche sous
 * Échap rend `IntlBackslash`, la touche `<` rend `Backquote` (inversion des
 * claviers Apple ISO). D'où : sur Mac, l'une ou l'autre ; ailleurs, `Backquote`.
 */
import { describe, expect, it } from 'vitest';
import { consoleShortcut, isMacPlatform, type ShortcutKey } from '../console-key';

function key(overrides: Partial<ShortcutKey>): ShortcutKey {
	return {
		code: '',
		key: '',
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		...overrides
	};
}

describe('la touche sous Échap', () => {
	it('ouvre ou ferme la console sur un PC (Backquote)', () => {
		expect(
			consoleShortcut(key({ code: 'Backquote', key: '²' }), { isMac: false, inField: false })
		).toBe(true);
	});

	it('sur un PC, la touche IntlBackslash (< >) ne fait rien', () => {
		expect(
			consoleShortcut(key({ code: 'IntlBackslash', key: '<' }), { isMac: false, inField: false })
		).toBe(false);
	});

	it('sur Mac AZERTY, la touche sous Échap rend IntlBackslash : elle ouvre la console', () => {
		expect(
			consoleShortcut(key({ code: 'IntlBackslash', key: '@' }), { isMac: true, inField: false })
		).toBe(true);
	});

	it('sur Mac, Backquote aussi (Mac QWERTY ANSI, sans IntlBackslash)', () => {
		expect(
			consoleShortcut(key({ code: 'Backquote', key: '`' }), { isMac: true, inField: false })
		).toBe(true);
	});

	it('ne fait rien quand le focus est dans un champ : on doit pouvoir taper ² ou @', () => {
		expect(
			consoleShortcut(key({ code: 'Backquote', key: '²' }), { isMac: false, inField: true })
		).toBe(false);
		expect(
			consoleShortcut(key({ code: 'IntlBackslash', key: '@' }), { isMac: true, inField: true })
		).toBe(false);
	});

	it('ne fait rien avec un modificateur (Maj, Alt, Ctrl, Cmd)', () => {
		for (const modifier of ['shiftKey', 'altKey', 'ctrlKey', 'metaKey'] as const) {
			expect(
				consoleShortcut(key({ code: 'Backquote', [modifier]: true }), {
					isMac: false,
					inField: false
				})
			).toBe(false);
		}
	});

	it('les autres touches ne font rien', () => {
		expect(consoleShortcut(key({ code: 'KeyA', key: 'a' }), { isMac: true, inField: false })).toBe(
			false
		);
	});
});

describe('Ctrl+Entrée', () => {
	it('ouvre ou ferme la console, hors d’un champ', () => {
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter', ctrlKey: true }), {
				isMac: true,
				inField: false
			})
		).toBe(true);
	});

	it('marche AUSSI depuis un champ', () => {
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter', ctrlKey: true }), {
				isMac: false,
				inField: true
			})
		).toBe(true);
	});

	it('Cmd+Entrée sur Mac ne compte pas (Ctrl, pas Cmd)', () => {
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter', metaKey: true }), {
				isMac: true,
				inField: false
			})
		).toBe(false);
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter', ctrlKey: true, metaKey: true }), {
				isMac: true,
				inField: false
			})
		).toBe(false);
	});

	it('Entrée seule ne fait rien (elle calcule)', () => {
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter' }), { isMac: false, inField: true })
		).toBe(false);
	});

	it('Ctrl+Maj+Entrée ne compte pas', () => {
		expect(
			consoleShortcut(key({ code: 'Enter', key: 'Enter', ctrlKey: true, shiftKey: true }), {
				isMac: false,
				inField: false
			})
		).toBe(false);
	});
});

describe('isMacPlatform', () => {
	it('reconnaît un Mac par userAgentData, puis par platform', () => {
		expect(isMacPlatform({ userAgentData: { platform: 'macOS' } })).toBe(true);
		expect(isMacPlatform({ platform: 'MacIntel' })).toBe(true);
		expect(isMacPlatform({ platform: 'Win32' })).toBe(false);
		expect(isMacPlatform({ userAgentData: { platform: 'Windows' }, platform: 'Win32' })).toBe(
			false
		);
		expect(isMacPlatform({})).toBe(false);
	});
});
