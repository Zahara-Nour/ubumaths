/**
 * CodeMirror Breakpoint Gutter Marker
 *
 * Red dot rendered in the breakpoint gutter for lines that carry a breakpoint.
 * Used by PythonEditor's clickable breakpoint gutter.
 */

import { GutterMarker } from '@codemirror/view';

/**
 * Custom gutter marker for breakpoint lines (red dot).
 */
export class BreakpointGutterMarker extends GutterMarker {
	toDOM() {
		const marker = document.createElement('div');
		marker.className = 'cm-breakpointGutterMarker';
		marker.textContent = '●';
		return marker;
	}
}
