import { describe, it, expect } from 'vitest';
import { resolveEffectiveTheme, DEFAULT_DARK_THEME } from './editor-theme';

describe('resolveEffectiveTheme', () => {
	it("keeps 'default' as 'default' in light mode (current behavior preserved)", () => {
		expect(resolveEffectiveTheme('default', false)).toBe('default');
	});

	it("maps 'default' to oneDark in dark mode (the bug fix)", () => {
		expect(resolveEffectiveTheme('default', true)).toBe(DEFAULT_DARK_THEME);
		expect(resolveEffectiveTheme('default', true)).toBe('oneDark');
	});

	it('respects an explicit light theme even in dark mode', () => {
		// User picked github on purpose — don't second-guess them.
		expect(resolveEffectiveTheme('github', true)).toBe('github');
		expect(resolveEffectiveTheme('material', true)).toBe('material');
		expect(resolveEffectiveTheme('solarizedLight', true)).toBe('solarizedLight');
	});

	it('respects an explicit dark theme even in light mode', () => {
		expect(resolveEffectiveTheme('oneDark', false)).toBe('oneDark');
		expect(resolveEffectiveTheme('dracula', false)).toBe('dracula');
		expect(resolveEffectiveTheme('vscodeDark', false)).toBe('vscodeDark');
	});

	it('passes through every non-default theme unchanged regardless of mode', () => {
		const themes = [
			'oneDark',
			'dracula',
			'github',
			'githubDark',
			'nord',
			'solarizedLight',
			'solarizedDark',
			'material',
			'materialDark',
			'vscode',
			'vscodeDark'
		] as const;
		for (const t of themes) {
			expect(resolveEffectiveTheme(t, false)).toBe(t);
			expect(resolveEffectiveTheme(t, true)).toBe(t);
		}
	});
});
