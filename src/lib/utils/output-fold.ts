/**
 * Long-text fold helper for notebook cell outputs.
 *
 * Stream outputs (stdout / stderr) and error tracebacks can run hundreds
 * of lines when an algorithm prints a lot or a stack trace deeply nests.
 * Showing the whole block by default pushes everything else off-screen.
 * Colab / VS Code Notebooks both collapse with a head + ellipsis + tail
 * preview and an "Afficher tout" toggle; we mirror that.
 *
 * Pulled out of the component so the boundary logic is testable in
 * isolation from the (much hairier) Plotly + LaTeX rendering machinery.
 */

/** Default cap before an output is considered "long". */
export const DEFAULT_MAX_VISIBLE_LINES = 20;

/** Number of lines kept at the top of the preview when folding. */
const HEAD_LINES = 10;

/** Number of lines kept at the bottom of the preview when folding. */
const TAIL_LINES = 5;

export interface FoldedOutput {
	/** Either the original text (short) or the head/tail preview (long). */
	preview: string;
	/** Number of lines hidden inside the ellipsis. 0 when not folded. */
	hidden: number;
	/** True when the input exceeded `maxVisibleLines`. */
	isLong: boolean;
}

/**
 * Fold a long text block into a head + ellipsis + tail preview.
 *
 * If `text` has ≤ `maxVisibleLines` lines, returns it as-is with
 * `isLong: false`. Otherwise keeps the first `HEAD_LINES` lines and the
 * last `TAIL_LINES` lines, with a French ellipsis marker in between.
 */
export function foldOutput(
	text: string,
	maxVisibleLines = DEFAULT_MAX_VISIBLE_LINES
): FoldedOutput {
	const lines = text.split('\n');
	if (lines.length <= maxVisibleLines) {
		return { preview: text, hidden: 0, isLong: false };
	}
	const head = lines.slice(0, HEAD_LINES).join('\n');
	const tail = lines.slice(-TAIL_LINES).join('\n');
	const hidden = lines.length - HEAD_LINES - TAIL_LINES;
	return {
		preview: `${head}\n\n… ${hidden} lignes masquées …\n\n${tail}`,
		hidden,
		isLong: true
	};
}
