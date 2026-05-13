/**
 * CodeMirror widget extracted from `LockedPythonEditor.svelte` so the
 * class is declared at module top-level (Svelte's `perf_avoid_nested_class`
 * warning flagged the previous in-function declaration — each call to
 * `initEditor` was creating a fresh class identity).
 *
 * The module is loaded lazily from inside the component's `initEditor`,
 * preserving the existing import strategy (`@codemirror/view` is only
 * pulled in when the locked-zones path is actually used).
 */

import { WidgetType } from '@codemirror/view';

export class ZoneResetWidget extends WidgetType {
	zoneId: string;

	constructor(zoneId: string) {
		super();
		this.zoneId = zoneId;
	}

	toDOM(): HTMLElement {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'cm-zoneResetBtn';
		btn.dataset.zoneId = this.zoneId;
		btn.title = 'Réinitialiser cette zone';
		btn.setAttribute('aria-label', 'Réinitialiser cette zone');
		btn.textContent = '↺';
		return btn;
	}

	ignoreEvent(): boolean {
		// Let CodeMirror's domEventHandlers receive the click.
		return false;
	}

	eq(other: ZoneResetWidget): boolean {
		return other.zoneId === this.zoneId;
	}
}
