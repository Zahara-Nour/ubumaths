/**
 * Debug test for spacing commands inside itemize environments
 */
import { describe, it, expect } from 'vitest';
import { transpileLatexToMarkdown } from '../transpiler';

describe('Spacing commands in itemize', () => {
	it('should convert spacing commands inside item content', () => {
		const input = `\\begin{itemize}[label=$\\bullet~$]
\\item 95\\,\\% des jouets réussissent le test de fabrication ;
\\item Parmi les jouets qui réussissent le test de fabrication, 98\\,\\% réussissent le test de sécurité ;
\\item 1\\,\\% des jouets ne réussissent aucun des deux tests.
\\end{itemize}`;

		const result = transpileLatexToMarkdown(input);

		console.log('=== ITEMIZE WITH SPACING COMMANDS ===');
		console.log('Input:', input);
		console.log('Output:', result.markdown);
		console.log('Warnings:', result.warnings);

		// Should NOT contain raw LaTeX spacing commands
		expect(result.markdown).not.toContain('\\,');
		expect(result.markdown).not.toContain('\\%');
		// Should contain converted percentages
		expect(result.markdown).toContain('95');
		expect(result.markdown).toContain('%');
	});
});
