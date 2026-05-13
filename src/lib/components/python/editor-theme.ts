/**
 * Editor theme resolution + lazy loader.
 *
 * The user-selected `editorTheme` is persisted (localStorage / DB), but the
 * special `'default'` value means "follow the app theme" rather than a fixed
 * light theme. `resolveEffectiveTheme` maps the persisted value + the
 * current app dark mode to the actual theme name CodeMirror should use.
 * `loadThemeExtension` then lazy-imports the matching extension package.
 *
 * Both `PythonEditor` and `LockedPythonEditor` consume these helpers — keeps
 * the theme logic in one place and ensures the locked-zones editor switches
 * to `oneDark` in dark mode just like the regular editor.
 */

import type { Extension } from '@codemirror/state';
import type { EditorTheme } from '$lib/stores/pythonPlayground.svelte';

/** Theme used when `editorTheme === 'default'` and the app is in dark mode. */
export const DEFAULT_DARK_THEME: EditorTheme = 'oneDark';

/**
 * Resolve the actual CodeMirror theme to apply, given:
 *   @param userTheme  the value the user has selected (`'default'` or any of
 *                     the 11 explicit themes)
 *   @param dark       whether the app is currently in dark mode
 */
export function resolveEffectiveTheme(userTheme: EditorTheme, dark: boolean): EditorTheme {
	if (userTheme === 'default' && dark) {
		return DEFAULT_DARK_THEME;
	}
	return userTheme;
}

/**
 * Lazy-load the CodeMirror extension for a resolved theme. Returns `null` if
 * the name is unknown (the caller should fall back to its own base styling).
 *
 * The `'default'` value here means "pure light" (the resolver above is
 * responsible for translating an unresolved `'default'` + dark-mode into
 * `'oneDark'`). Each branch dynamically imports only the package it needs,
 * keeping the initial bundle small.
 */
export async function loadThemeExtension(themeName: EditorTheme): Promise<Extension | null> {
	const { EditorView } = await import('@codemirror/view');

	switch (themeName) {
		case 'default':
			return EditorView.theme({
				'&': { backgroundColor: '#ffffff' },
				'.cm-gutters': { backgroundColor: '#ffffff' }
			});
		case 'oneDark': {
			const { oneDark } = await import('@codemirror/theme-one-dark');
			return oneDark;
		}
		case 'dracula': {
			const { dracula } = await import('@uiw/codemirror-theme-dracula');
			return dracula;
		}
		case 'github': {
			const { githubLight } = await import('@uiw/codemirror-theme-github');
			return githubLight;
		}
		case 'githubDark': {
			const { githubDark } = await import('@uiw/codemirror-theme-github');
			return githubDark;
		}
		case 'nord': {
			const { nord } = await import('@uiw/codemirror-theme-nord');
			return nord;
		}
		case 'solarizedLight': {
			const { solarizedLight } = await import('@uiw/codemirror-theme-solarized');
			return solarizedLight;
		}
		case 'solarizedDark': {
			const { solarizedDark } = await import('@uiw/codemirror-theme-solarized');
			return solarizedDark;
		}
		case 'material': {
			const { materialLight } = await import('@uiw/codemirror-theme-material');
			return materialLight;
		}
		case 'materialDark': {
			const { materialDark } = await import('@uiw/codemirror-theme-material');
			return materialDark;
		}
		case 'vscode': {
			const { vscodeLightInit } = await import('@uiw/codemirror-theme-vscode');
			return vscodeLightInit();
		}
		case 'vscodeDark': {
			const { vscodeDark } = await import('@uiw/codemirror-theme-vscode');
			return vscodeDark;
		}
		default:
			return null;
	}
}
