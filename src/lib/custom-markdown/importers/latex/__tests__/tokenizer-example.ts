/**
 * Example usage of the LaTeX tokenizer
 * This file demonstrates how the tokenizer processes various LaTeX constructs
 */

import { tokenize } from '../tokenizer';

// Example 1: Simple document
const simpleLatex = `\\documentclass{article}
\\begin{document}
\\section{Introduction}
This is a \\textbf{bold} word and an equation: $x^2 + y^2 = z^2$
\\end{document}`;

console.log('=== Simple Document Tokens ===');
const simpleTokens = tokenize(simpleLatex);
simpleTokens.forEach((token) => {
	console.log(`${token.type}: ${token.raw.substring(0, 50)}${token.raw.length > 50 ? '...' : ''}`);
});

// Example 2: Mathematical content
const mathLatex = `The quadratic formula is:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

For inline math, we can write $\\int_0^\\infty e^{-x^2} dx$.`;

console.log('\n=== Mathematical Content Tokens ===');
const mathTokens = tokenize(mathLatex);
mathTokens.forEach((token) => {
	if (token.type === 'math-inline' || token.type === 'math-display') {
		console.log(`${token.type}: ${token.raw}`);
	}
});

// Example 3: Lists and environments
const listLatex = `\\begin{itemize}
\\item First item
\\item Second item with \\emph{emphasis}
\\begin{enumerate}
\\item Nested numbered item
\\end{enumerate}
\\end{itemize}`;

console.log('\n=== List Environment Tokens ===');
const listTokens = tokenize(listLatex);
listTokens.forEach((token) => {
	if (token.type === 'environment') {
		console.log(`Environment: ${token.name}`);
		console.log(`Content preview: ${token.content.substring(0, 100)}...`);
	}
});

// Example 4: Commands with various arguments
const commandLatex = `\\textcolor{red}{colored text}
\\href{https://example.com}{link text}
\\frac{numerator}{denominator}
\\section[short title]{Full Section Title}`;

console.log('\n=== Commands with Arguments ===');
const commandTokens = tokenize(commandLatex);
commandTokens.forEach((token) => {
	if (token.type === 'command') {
		console.log(`Command: \\${token.name}`);
		if (token.options) {
			console.log(`  Options: [${token.options.join('], [')}]`);
		}
		if (token.args.length > 0) {
			console.log(`  Args: {${token.args.join('}, {')}}`);
		}
	}
});

// Example 5: Special characters and escaping
const specialLatex = `Price: \\$50.00 with 10\\% discount.
Table alignment: column1 & column2 & column3 \\\\
Math subscript: $a_i$ and superscript: $x^2$`;

console.log('\n=== Special Characters ===');
const specialTokens = tokenize(specialLatex);
specialTokens.forEach((token) => {
	if (token.type === 'special' || (token.type === 'command' && token.name.length === 1)) {
		console.log(`${token.type === 'special' ? 'Special' : 'Escaped'}: ${token.raw}`);
	}
});

// Example 6: Comments and verbatim
const verbatimLatex = `% This is a comment
Normal text here.
\\begin{verbatim}
This is verbatim text with special chars: $ & % # _
\\end{verbatim}`;

console.log('\n=== Comments and Verbatim ===');
const verbatimTokens = tokenize(verbatimLatex);
verbatimTokens.forEach((token) => {
	if (token.type === 'comment') {
		console.log(`Comment: ${token.content}`);
	}
	if (token.type === 'environment' && token.name === 'verbatim') {
		console.log(`Verbatim content: ${token.content}`);
	}
});

// Example 7: Token position tracking
const positionLatex = `Line 1
Line 2 with \\textbf{bold}
Line 3`;

console.log('\n=== Token Position Tracking ===');
const positionTokens = tokenize(positionLatex);
positionTokens.forEach((token) => {
	if (token.type === 'command') {
		console.log(`Command \\${token.name} at line ${token.line}, column ${token.column}`);
	}
});
