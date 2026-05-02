/**
 * Editor theme resolution.
 *
 * The user-selected `editorTheme` is persisted (localStorage / DB), but the
 * special `'default'` value means "follow the app theme" rather than a fixed
 * light theme. This helper maps the persisted value + the current app dark
 * mode to the actual theme name PythonEditor should pass to CodeMirror.
 *
 * Explicit theme choices (anything other than `'default'`) are respected as
 * is, regardless of dark mode — the user picked them on purpose.
 */

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
