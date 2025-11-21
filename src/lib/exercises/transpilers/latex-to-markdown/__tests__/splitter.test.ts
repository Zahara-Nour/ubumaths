import { describe, it, expect } from 'vitest';
import {
	splitStatementAndSolution,
	detectSplitMethod,
	type SplitResult,
	type SplitMethod
} from '../splitter';

describe('splitter', () => {
	describe('splitStatementAndSolution', () => {
		describe('solution environment detection', () => {
			it('should split on solution environment', () => {
				const latex = `
This is the problem statement.

\\begin{solution}
This is the solution.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('This is the problem statement.');
				expect(result.solution).toBe('This is the solution.');
			});

			it('should handle case-insensitive environment name', () => {
				const latex = `
Problem here.

\\begin{SOLUTION}
Solution here.
\\end{SOLUTION}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem here.');
				expect(result.solution).toBe('Solution here.');
			});

			it('should handle solution environment with whitespace variations', () => {
				const latex = `
Statement.

\\begin  {solution}
Answer.
\\end  {solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Statement.');
				expect(result.solution).toBe('Answer.');
			});

			it('should use custom solution environment name', () => {
				const latex = `
Question.

\\begin{reponse}
Answer.
\\end{reponse}
`;
				const result = splitStatementAndSolution(latex, { solutionEnvName: 'reponse' });

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Question.');
				expect(result.solution).toBe('Answer.');
			});

			it('should handle nested environments inside solution', () => {
				const latex = `
Problem.

\\begin{solution}
The solution uses:
\\begin{itemize}
\\item First step
\\item Second step
\\end{itemize}
Done.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toContain('\\begin{itemize}');
				expect(result.solution).toContain('\\end{itemize}');
			});

			it('should use only the first solution block when multiple exist', () => {
				const latex = `
Problem 1.

\\begin{solution}
Solution 1.
\\end{solution}

Problem 2.

\\begin{solution}
Solution 2.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem 1.');
				// The solution includes everything after the first \begin{solution}
				// until the first matching \end{solution}
				expect(result.solution).toBe('Solution 1.');
			});

			it('should handle empty solution environment', () => {
				const latex = `
Problem statement.

\\begin{solution}
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem statement.');
				expect(result.solution).toBe(null);
			});
		});

		describe('section-based split', () => {
			it('should split on \\section{Solution}', () => {
				const latex = `
\\section{Problem}
This is the problem.

\\section{Solution}
This is the answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toContain('This is the problem.');
				expect(result.solution).toBe('This is the answer.');
			});

			it('should split on \\section*{Solution} (unnumbered)', () => {
				const latex = `
Problem text.

\\section*{Solution}
Answer text.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Problem text.');
				expect(result.solution).toBe('Answer text.');
			});

			it('should split on \\section{Correction}', () => {
				const latex = `
Exercice.

\\section{Correction}
Voici la correction.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Exercice.');
				expect(result.solution).toBe('Voici la correction.');
			});

			it('should split on \\section{Réponse} (French with accent)', () => {
				const latex = `
Question posée.

\\section{Réponse}
Voici la réponse.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Question posée.');
				expect(result.solution).toBe('Voici la réponse.');
			});

			it('should handle section with optional argument', () => {
				const latex = `
Problem.

\\section[Sol]{Solution}
Answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});

			it('should be case insensitive for section titles', () => {
				const latex = `
Problem.

\\section{SOLUTION}
Answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});

			it('should use custom section titles', () => {
				const latex = `
Problem.

\\section{Antwort}
German answer.
`;
				const result = splitStatementAndSolution(latex, {
					solutionSectionTitles: ['Antwort', 'Lösung']
				});

				expect(result.splitMethod).toBe('section');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('German answer.');
			});
		});

		describe('comment-based split', () => {
			it('should split on % --- SOLUTION ---', () => {
				const latex = `
Problem statement.

% --- SOLUTION ---

Here is the answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Problem statement.');
				expect(result.solution).toBe('Here is the answer.');
			});

			it('should split on % SOLUTION', () => {
				const latex = `
Problem.

% SOLUTION

Answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});

			it('should split on %% CORRECTION', () => {
				const latex = `
Exercice.

%% CORRECTION

Correction.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Exercice.');
				expect(result.solution).toBe('Correction.');
			});

			it('should split on % RÉPONSE (French with accent)', () => {
				const latex = `
Question.

% RÉPONSE

La réponse.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Question.');
				expect(result.solution).toBe('La réponse.');
			});

			it('should be case insensitive for comment markers', () => {
				const latex = `
Problem.

% solution

Answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});

			it('should handle comment with multiple dashes', () => {
				const latex = `
Problem.

% ---- SOLUTION ----

Answer.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('comment');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});
		});

		describe('no split detected', () => {
			it('should return full content as statement when no markers found', () => {
				const latex = `
This is just a problem without any solution.
It has multiple lines.
But no solution marker.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('none');
				expect(result.statement).toContain('This is just a problem');
				expect(result.statement).toContain('no solution marker.');
				expect(result.solution).toBe(null);
			});

			it('should handle empty input', () => {
				const result = splitStatementAndSolution('');

				expect(result.splitMethod).toBe('none');
				expect(result.statement).toBe('');
				expect(result.solution).toBe(null);
			});

			it('should handle whitespace-only input', () => {
				const result = splitStatementAndSolution('   \n\n   ');

				expect(result.splitMethod).toBe('none');
				expect(result.statement).toBe('');
				expect(result.solution).toBe(null);
			});
		});

		describe('document content extraction', () => {
			it('should only process content inside \\begin{document}...\\end{document}', () => {
				const latex = `
\\documentclass{article}
% This solution comment in preamble should be ignored
% SOLUTION

\\begin{document}
Problem here.

\\begin{solution}
Answer here.
\\end{solution}
\\end{document}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem here.');
				expect(result.solution).toBe('Answer here.');
			});

			it('should handle document without \\begin{document}', () => {
				const latex = `
Problem statement.

\\begin{solution}
Solution.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem statement.');
			});

			it('should handle missing \\end{document}', () => {
				const latex = `
\\begin{document}
Problem.

\\begin{solution}
Answer.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem.');
				expect(result.solution).toBe('Answer.');
			});
		});

		describe('edge cases', () => {
			it('should handle solution at the very beginning', () => {
				// When solution is at the beginning, treat entire content as statement
				const latex = `
\\begin{solution}
This is at the beginning.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				// Should not split if it would result in empty statement
				expect(result.splitMethod).toBe('none');
				expect(result.statement).toBe('This is at the beginning.');
				expect(result.solution).toBe(null);
			});

			it('should prioritize solution environment over section', () => {
				const latex = `
Problem.

\\begin{solution}
Answer in env.
\\end{solution}

\\section{Solution}
This should not be the solution.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.solution).toBe('Answer in env.');
			});

			it('should prioritize section over comment', () => {
				const latex = `
Problem.

\\section{Solution}
Answer in section.

% SOLUTION
This should not be the solution.
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('section');
				expect(result.solution).toContain('Answer in section.');
			});

			it('should preserve math content in statement and solution', () => {
				const latex = `
Given $x^2 + y^2 = z^2$, find $z$.

\\begin{solution}
$z = \\sqrt{x^2 + y^2}$
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.statement).toContain('$x^2 + y^2 = z^2$');
				expect(result.solution).toContain('$z = \\sqrt{x^2 + y^2}$');
			});

			it('should handle solution environment with math content', () => {
				const latex = `
Find \\(\\int x \\, dx\\).

\\begin{solution}
\\[\\int x \\, dx = \\frac{x^2}{2} + C\\]
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.solution).toContain('\\frac{x^2}{2}');
			});

			it('should handle nested solution environments (same name)', () => {
				const latex = `
Problem.

\\begin{solution}
Outer start.
\\begin{solution}
Inner solution.
\\end{solution}
Outer end.
\\end{solution}
`;
				const result = splitStatementAndSolution(latex);

				expect(result.splitMethod).toBe('solution-env');
				expect(result.statement).toBe('Problem.');
				// Should capture everything including nested solution
				expect(result.solution).toContain('Inner solution.');
				expect(result.solution).toContain('Outer end.');
			});
		});
	});

	describe('detectSplitMethod', () => {
		it('should detect solution-env method', () => {
			const latex = `
Problem.
\\begin{solution}
Answer.
\\end{solution}
`;
			expect(detectSplitMethod(latex)).toBe('solution-env');
		});

		it('should detect section method', () => {
			const latex = `
Problem.
\\section{Solution}
Answer.
`;
			expect(detectSplitMethod(latex)).toBe('section');
		});

		it('should detect comment method', () => {
			const latex = `
Problem.
% SOLUTION
Answer.
`;
			expect(detectSplitMethod(latex)).toBe('comment');
		});

		it('should return none when no method applies', () => {
			const latex = `Just some text without markers.`;
			expect(detectSplitMethod(latex)).toBe('none');
		});

		it('should respect priority: solution-env over section', () => {
			const latex = `
Problem.
\\begin{solution}
Env answer.
\\end{solution}
\\section{Solution}
Section answer.
`;
			expect(detectSplitMethod(latex)).toBe('solution-env');
		});

		it('should respect priority: section over comment', () => {
			const latex = `
Problem.
\\section{Solution}
Section answer.
% SOLUTION
Comment answer.
`;
			expect(detectSplitMethod(latex)).toBe('section');
		});

		it('should use custom options', () => {
			const latex = `
Problem.
\\begin{antwort}
German answer.
\\end{antwort}
`;
			expect(detectSplitMethod(latex, { solutionEnvName: 'antwort' })).toBe('solution-env');
		});
	});

	describe('type exports', () => {
		it('should have correct SplitResult type structure', () => {
			const result: SplitResult = {
				statement: 'test',
				solution: null,
				splitMethod: 'none'
			};
			expect(result).toBeDefined();
		});

		it('should have correct SplitMethod type values', () => {
			const methods: SplitMethod[] = ['solution-env', 'section', 'comment', 'none'];
			expect(methods).toHaveLength(4);
		});
	});
});
