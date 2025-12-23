/**
 * CodeMirror Debug Gutter Marker
 * Shows an arrow pointing to the current debug line
 */

import { GutterMarker } from '@codemirror/view';

/**
 * Custom gutter marker for debug current line (arrow)
 */
export class DebugGutterMarker extends GutterMarker {
	toDOM() {
		const marker = document.createElement('div');
		marker.className = 'cm-debugGutterMarker';
		marker.textContent = '→';
		return marker;
	}
}
