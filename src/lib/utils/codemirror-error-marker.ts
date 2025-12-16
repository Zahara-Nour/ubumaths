/**
 * CodeMirror Error Gutter Marker
 * Shared between PythonEditor and JsonEditor
 */

import { GutterMarker } from '@codemirror/view';

/**
 * Custom gutter marker for error lines (red dot)
 */
export class ErrorGutterMarker extends GutterMarker {
	toDOM() {
		const marker = document.createElement('div');
		marker.className = 'cm-errorGutterMarker';
		marker.textContent = '●';
		return marker;
	}
}
