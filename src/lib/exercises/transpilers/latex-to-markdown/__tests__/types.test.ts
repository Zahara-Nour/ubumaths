/**
 * Unit tests for LaTeX to Markdown transpiler types
 *
 * Since TypeScript types are compile-time only, these tests verify:
 * 1. Type compatibility - Objects matching interfaces compile correctly
 * 2. Union type discrimination - Discriminated unions narrow correctly
 * 3. Default values - Required vs optional fields
 */

import { describe, it, expect } from 'vitest';
import type {
	LatexToMarkdownOptions,
	TranspileResult,
	TranspileWarning,
	TranspileStats,
	WarningType,
	LatexToken,
	LatexTokenType,
	BaseToken,
	TextToken,
	CommandToken,
	EnvironmentToken,
	MathInlineToken,
	MathDisplayToken,
	CommentToken,
	NewlineToken,
	GroupToken,
	WhitespaceToken,
	SpecialToken,
	VerbatimToken,
	ConversionContext,
	ConverterFn,
	CommandConverterRegistry,
	EnvironmentConverterRegistry,
	SpecialCharacterRegistry,
	ListType,
	ListItem,
	ParsedList,
	TableAlignment,
	TableColumn,
	TableCell,
	TableRow,
	ParsedTable,
	SectionLevel,
	ParsedSection,
	CitationStyle,
	ParsedCitation,
	TranspilerFunction
} from '../types';

describe('LaTeX to Markdown Types', () => {
	describe('LatexToMarkdownOptions', () => {
		it('should accept empty options (all optional)', () => {
			const options: LatexToMarkdownOptions = {};
			expect(options).toEqual({});
		});

		it('should accept partial options', () => {
			const options: LatexToMarkdownOptions = {
				preserveComments: true
			};
			expect(options.preserveComments).toBe(true);
			expect(options.mathDelimiters).toBeUndefined();
		});

		it('should accept full options', () => {
			const options: LatexToMarkdownOptions = {
				preserveComments: true,
				mathDelimiters: 'dollar',
				maxNestingDepth: 5,
				fallbackToText: false,
				preserveWhitespace: true
			};
			expect(options.preserveComments).toBe(true);
			expect(options.mathDelimiters).toBe('dollar');
			expect(options.maxNestingDepth).toBe(5);
			expect(options.fallbackToText).toBe(false);
			expect(options.preserveWhitespace).toBe(true);
		});

		it('should accept brackets as mathDelimiters', () => {
			const options: LatexToMarkdownOptions = {
				mathDelimiters: 'brackets'
			};
			expect(options.mathDelimiters).toBe('brackets');
		});
	});

	describe('TranspileResult', () => {
		it('should have required fields', () => {
			const result: TranspileResult = {
				markdown: '# Hello',
				warnings: []
			};
			expect(result.markdown).toBe('# Hello');
			expect(result.warnings).toHaveLength(0);
			expect(result.stats).toBeUndefined();
		});

		it('should include warnings array', () => {
			const result: TranspileResult = {
				markdown: '',
				warnings: [
					{
						type: 'unsupported-command',
						message: 'Unknown command: \\foo',
						command: '\\foo'
					}
				]
			};
			expect(result.warnings[0].type).toBe('unsupported-command');
			expect(result.warnings[0].command).toBe('\\foo');
		});

		it('should include optional stats', () => {
			const stats: TranspileStats = {
				tokenCount: 100,
				commandsConverted: 25,
				environmentsConverted: 5,
				mathExpressions: 10
			};
			const result: TranspileResult = {
				markdown: '# Test',
				warnings: [],
				stats
			};
			expect(result.stats).toBeDefined();
			expect(result.stats?.tokenCount).toBe(100);
			expect(result.stats?.commandsConverted).toBe(25);
			expect(result.stats?.environmentsConverted).toBe(5);
			expect(result.stats?.mathExpressions).toBe(10);
		});
	});

	describe('TranspileWarning', () => {
		it('should have required type and message', () => {
			const warning: TranspileWarning = {
				type: 'parse-error',
				message: 'Unexpected token'
			};
			expect(warning.type).toBe('parse-error');
			expect(warning.message).toBe('Unexpected token');
		});

		it('should accept all warning types', () => {
			const warningTypes: WarningType[] = [
				'unsupported-command',
				'unsupported-environment',
				'parse-error',
				'nested-too-deep',
				'malformed-table',
				'unclosed-group',
				'mismatched-environment',
				'invalid-math'
			];

			warningTypes.forEach((type) => {
				const warning: TranspileWarning = { type, message: `Test ${type}` };
				expect(warning.type).toBe(type);
			});
		});

		it('should accept optional location information', () => {
			const warning: TranspileWarning = {
				type: 'parse-error',
				message: 'Error at position',
				line: 10,
				column: 5
			};
			expect(warning.line).toBe(10);
			expect(warning.column).toBe(5);
		});

		it('should accept optional command and severity', () => {
			const warning: TranspileWarning = {
				type: 'unsupported-command',
				message: 'Unknown command',
				command: '\\customcmd',
				severity: 'warning'
			};
			expect(warning.command).toBe('\\customcmd');
			expect(warning.severity).toBe('warning');
		});

		it('should accept all severity levels', () => {
			const severities: Array<'info' | 'warning' | 'error'> = ['info', 'warning', 'error'];

			severities.forEach((severity) => {
				const warning: TranspileWarning = {
					type: 'parse-error',
					message: 'Test',
					severity
				};
				expect(warning.severity).toBe(severity);
			});
		});
	});

	describe('LatexToken discriminated union', () => {
		const baseTokenFields = {
			raw: 'test',
			start: 0,
			end: 4,
			line: 1,
			column: 1
		};

		it('should discriminate TextToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'text',
				content: 'Hello'
			};

			if (token.type === 'text') {
				// TypeScript should narrow to TextToken
				expect(token.content).toBe('Hello');
				expect(token.needsEscaping).toBeUndefined();
			}
			expect(token.type).toBe('text');
		});

		it('should discriminate TextToken with needsEscaping', () => {
			const token: TextToken = {
				...baseTokenFields,
				type: 'text',
				content: '*bold*',
				needsEscaping: true
			};
			expect(token.needsEscaping).toBe(true);
		});

		it('should discriminate CommandToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'command',
				raw: '\\textbf{bold}',
				name: 'textbf',
				args: ['bold']
			};

			if (token.type === 'command') {
				expect(token.name).toBe('textbf');
				expect(token.args).toEqual(['bold']);
				expect(token.options).toBeUndefined();
				expect(token.parsedArgs).toBeUndefined();
				expect(token.isSupported).toBeUndefined();
			}
			expect(token.type).toBe('command');
		});

		it('should discriminate CommandToken with all optional fields', () => {
			const token: CommandToken = {
				...baseTokenFields,
				type: 'command',
				name: 'href',
				options: ['option1', 'option2'],
				args: ['url', 'text'],
				parsedArgs: [[{ ...baseTokenFields, type: 'text', content: 'url' }]],
				isSupported: true
			};
			expect(token.options).toEqual(['option1', 'option2']);
			expect(token.parsedArgs).toHaveLength(1);
			expect(token.isSupported).toBe(true);
		});

		it('should discriminate EnvironmentToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'environment',
				raw: '\\begin{itemize}...\\end{itemize}',
				name: 'itemize',
				content: '\\item First\n\\item Second'
			};

			if (token.type === 'environment') {
				expect(token.name).toBe('itemize');
				expect(token.content).toContain('\\item');
				expect(token.options).toBeUndefined();
				expect(token.children).toBeUndefined();
				expect(token.isSupported).toBeUndefined();
				expect(token.depth).toBeUndefined();
			}
			expect(token.type).toBe('environment');
		});

		it('should discriminate EnvironmentToken with all optional fields', () => {
			const token: EnvironmentToken = {
				...baseTokenFields,
				type: 'environment',
				name: 'lstlisting',
				options: 'language=python',
				content: 'print("hello")',
				children: [],
				isSupported: true,
				depth: 2
			};
			expect(token.options).toBe('language=python');
			expect(token.children).toEqual([]);
			expect(token.isSupported).toBe(true);
			expect(token.depth).toBe(2);
		});

		it('should discriminate MathInlineToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'math-inline',
				raw: '$x^2$',
				latex: 'x^2'
			};

			if (token.type === 'math-inline') {
				expect(token.latex).toBe('x^2');
				expect(token.useParentheses).toBeUndefined();
			}
			expect(token.type).toBe('math-inline');
		});

		it('should discriminate MathInlineToken with useParentheses', () => {
			const token: MathInlineToken = {
				...baseTokenFields,
				type: 'math-inline',
				latex: 'x^2',
				useParentheses: true
			};
			expect(token.useParentheses).toBe(true);
		});

		it('should discriminate MathDisplayToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'math-display',
				raw: '\\[x^2\\]',
				latex: 'x^2'
			};

			if (token.type === 'math-display') {
				expect(token.latex).toBe('x^2');
				expect(token.useBrackets).toBeUndefined();
				expect(token.label).toBeUndefined();
				expect(token.number).toBeUndefined();
			}
			expect(token.type).toBe('math-display');
		});

		it('should discriminate MathDisplayToken with all optional fields', () => {
			const token: MathDisplayToken = {
				...baseTokenFields,
				type: 'math-display',
				latex: 'E = mc^2',
				useBrackets: true,
				label: 'eq:einstein',
				number: '1'
			};
			expect(token.useBrackets).toBe(true);
			expect(token.label).toBe('eq:einstein');
			expect(token.number).toBe('1');
		});

		it('should discriminate CommentToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'comment',
				content: 'This is a comment'
			};

			if (token.type === 'comment') {
				expect(token.content).toBe('This is a comment');
				expect(token.isSpecial).toBeUndefined();
			}
			expect(token.type).toBe('comment');
		});

		it('should discriminate CommentToken with isSpecial', () => {
			const token: CommentToken = {
				...baseTokenFields,
				type: 'comment',
				content: 'TODO: fix this',
				isSpecial: true
			};
			expect(token.isSpecial).toBe(true);
		});

		it('should discriminate NewlineToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'newline',
				count: 2
			};

			if (token.type === 'newline') {
				expect(token.count).toBe(2);
				expect(token.isParagraphBreak).toBeUndefined();
			}
			expect(token.type).toBe('newline');
		});

		it('should discriminate NewlineToken with isParagraphBreak', () => {
			const token: NewlineToken = {
				...baseTokenFields,
				type: 'newline',
				count: 2,
				isParagraphBreak: true
			};
			expect(token.isParagraphBreak).toBe(true);
		});

		it('should discriminate GroupToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'group',
				content: 'grouped content'
			};

			if (token.type === 'group') {
				expect(token.content).toBe('grouped content');
				expect(token.children).toBeUndefined();
				expect(token.isArgument).toBeUndefined();
			}
			expect(token.type).toBe('group');
		});

		it('should discriminate GroupToken with all optional fields', () => {
			const token: GroupToken = {
				...baseTokenFields,
				type: 'group',
				content: 'nested',
				children: [],
				isArgument: true
			};
			expect(token.children).toEqual([]);
			expect(token.isArgument).toBe(true);
		});

		it('should discriminate WhitespaceToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'whitespace',
				content: '   '
			};

			if (token.type === 'whitespace') {
				expect(token.content).toBe('   ');
				expect(token.isSignificant).toBeUndefined();
			}
			expect(token.type).toBe('whitespace');
		});

		it('should discriminate WhitespaceToken with isSignificant', () => {
			const token: WhitespaceToken = {
				...baseTokenFields,
				type: 'whitespace',
				content: ' ',
				isSignificant: true
			};
			expect(token.isSignificant).toBe(true);
		});

		it('should discriminate SpecialToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'special',
				char: '&'
			};

			if (token.type === 'special') {
				expect(token.char).toBe('&');
				expect(token.meaning).toBeUndefined();
			}
			expect(token.type).toBe('special');
		});

		it('should discriminate SpecialToken with meaning', () => {
			const token: SpecialToken = {
				...baseTokenFields,
				type: 'special',
				char: '&',
				meaning: 'alignment'
			};
			expect(token.meaning).toBe('alignment');
		});

		it('should accept all special character meanings', () => {
			const meanings: Array<'alignment' | 'parameter' | 'subscript' | 'superscript' | 'escape'> = [
				'alignment',
				'parameter',
				'subscript',
				'superscript',
				'escape'
			];

			meanings.forEach((meaning) => {
				const token: SpecialToken = {
					...baseTokenFields,
					type: 'special',
					char: '#',
					meaning
				};
				expect(token.meaning).toBe(meaning);
			});
		});

		it('should discriminate VerbatimToken', () => {
			const token: LatexToken = {
				...baseTokenFields,
				type: 'verbatim',
				content: 'console.log("hello")'
			};

			if (token.type === 'verbatim') {
				expect(token.content).toBe('console.log("hello")');
				expect(token.language).toBeUndefined();
			}
			expect(token.type).toBe('verbatim');
		});

		it('should discriminate VerbatimToken with language', () => {
			const token: VerbatimToken = {
				...baseTokenFields,
				type: 'verbatim',
				content: 'def hello(): pass',
				language: 'python'
			};
			expect(token.language).toBe('python');
		});

		it('should verify all token types are covered', () => {
			const allTokenTypes: LatexTokenType[] = [
				'text',
				'command',
				'environment',
				'math-inline',
				'math-display',
				'comment',
				'newline',
				'group',
				'whitespace',
				'special',
				'verbatim'
			];

			// Create a token for each type to verify the union is exhaustive
			allTokenTypes.forEach((type) => {
				let token: LatexToken;
				switch (type) {
					case 'text':
						token = { ...baseTokenFields, type, content: '' };
						break;
					case 'command':
						token = { ...baseTokenFields, type, name: 'test', args: [] };
						break;
					case 'environment':
						token = { ...baseTokenFields, type, name: 'test', content: '' };
						break;
					case 'math-inline':
						token = { ...baseTokenFields, type, latex: '' };
						break;
					case 'math-display':
						token = { ...baseTokenFields, type, latex: '' };
						break;
					case 'comment':
						token = { ...baseTokenFields, type, content: '' };
						break;
					case 'newline':
						token = { ...baseTokenFields, type, count: 1 };
						break;
					case 'group':
						token = { ...baseTokenFields, type, content: '' };
						break;
					case 'whitespace':
						token = { ...baseTokenFields, type, content: '' };
						break;
					case 'special':
						token = { ...baseTokenFields, type, char: '' };
						break;
					case 'verbatim':
						token = { ...baseTokenFields, type, content: '' };
						break;
				}
				expect(token.type).toBe(type);
			});
		});
	});

	describe('ConversionContext', () => {
		it('should have all required fields', () => {
			const warnings: TranspileWarning[] = [];
			const context: ConversionContext = {
				indentLevel: 0,
				listStack: [],
				inListItem: false,
				inTable: false,
				inMath: false,
				inVerbatim: false,
				environmentStack: [],
				options: {
					preserveComments: false,
					mathDelimiters: 'dollar',
					maxNestingDepth: 10,
					fallbackToText: false,
					preserveWhitespace: false
				},
				warnings,
				addWarning: (warning, line, column) => {
					warnings.push({ ...warning, line, column });
				}
			};

			expect(context.indentLevel).toBe(0);
			expect(context.listStack).toEqual([]);
			expect(context.inListItem).toBe(false);
			expect(context.inTable).toBe(false);
			expect(context.inMath).toBe(false);
			expect(context.inVerbatim).toBe(false);
			expect(context.environmentStack).toEqual([]);
			expect(context.options.mathDelimiters).toBe('dollar');
		});

		it('should support addWarning function', () => {
			const warnings: TranspileWarning[] = [];
			const context: ConversionContext = {
				indentLevel: 0,
				listStack: [],
				inListItem: false,
				inTable: false,
				inMath: false,
				inVerbatim: false,
				environmentStack: [],
				options: {
					preserveComments: false,
					mathDelimiters: 'dollar',
					maxNestingDepth: 10,
					fallbackToText: false,
					preserveWhitespace: false
				},
				warnings,
				addWarning: (warning, line, column) => {
					warnings.push({ ...warning, line, column });
				}
			};

			context.addWarning({ type: 'parse-error', message: 'Test error' }, 5, 10);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].line).toBe(5);
			expect(warnings[0].column).toBe(10);
			expect(warnings[0].type).toBe('parse-error');
		});

		it('should support optional processChildren and convertToken', () => {
			const warnings: TranspileWarning[] = [];
			const context: ConversionContext = {
				indentLevel: 1,
				listStack: ['itemize'],
				inListItem: true,
				inTable: false,
				inMath: false,
				inVerbatim: false,
				environmentStack: ['document', 'itemize'],
				options: {
					preserveComments: true,
					mathDelimiters: 'brackets',
					maxNestingDepth: 5,
					fallbackToText: true,
					preserveWhitespace: true
				},
				warnings,
				addWarning: (warning, line, column) => {
					warnings.push({ ...warning, line, column });
				},
				processChildren: (tokens) => tokens.map((t) => t.raw).join(''),
				convertToken: (token) => token.raw
			};

			expect(context.processChildren).toBeDefined();
			expect(context.convertToken).toBeDefined();
			expect(context.processChildren?.([])).toBe('');
		});
	});

	describe('Converter Types', () => {
		const baseTokenFields = {
			raw: 'test',
			start: 0,
			end: 4,
			line: 1,
			column: 1
		};

		it('should define ConverterFn signature', () => {
			const converter: ConverterFn = (token, _context) => {
				return token.raw;
			};

			const mockContext: ConversionContext = {
				indentLevel: 0,
				listStack: [],
				inListItem: false,
				inTable: false,
				inMath: false,
				inVerbatim: false,
				environmentStack: [],
				options: {
					preserveComments: false,
					mathDelimiters: 'dollar',
					maxNestingDepth: 10,
					fallbackToText: false,
					preserveWhitespace: false
				},
				warnings: [],
				addWarning: () => {}
			};

			const token: TextToken = { ...baseTokenFields, type: 'text', content: 'hello' };
			expect(converter(token, mockContext)).toBe('test');
		});

		it('should define CommandConverterRegistry type', () => {
			const registry: CommandConverterRegistry = {
				textbf: (token, _context) => `**${token.args[0]}**`,
				textit: (token, _context) => `*${token.args[0]}*`
			};

			expect(Object.keys(registry)).toContain('textbf');
			expect(Object.keys(registry)).toContain('textit');
		});

		it('should define EnvironmentConverterRegistry type', () => {
			const registry: EnvironmentConverterRegistry = {
				itemize: (token, _context) => `- ${token.content}`,
				enumerate: (token, _context) => `1. ${token.content}`
			};

			expect(Object.keys(registry)).toContain('itemize');
			expect(Object.keys(registry)).toContain('enumerate');
		});

		it('should define SpecialCharacterRegistry with string values', () => {
			const registry: SpecialCharacterRegistry = {
				'&': '|',
				'#': '#'
			};

			expect(registry['&']).toBe('|');
		});

		it('should define SpecialCharacterRegistry with function values', () => {
			const registry: SpecialCharacterRegistry = {
				'&': (context) => (context.inTable ? '|' : '&')
			};

			expect(typeof registry['&']).toBe('function');
		});
	});

	describe('List Types', () => {
		it('should accept all list types', () => {
			const listTypes: ListType[] = ['itemize', 'enumerate', 'description'];

			listTypes.forEach((type) => {
				const list: ParsedList = {
					type,
					items: [],
					level: 0
				};
				expect(list.type).toBe(type);
			});
		});

		it('should define ListItem with required content', () => {
			const item: ListItem = {
				content: 'Item content'
			};
			expect(item.content).toBe('Item content');
			expect(item.label).toBeUndefined();
			expect(item.number).toBeUndefined();
			expect(item.nestedList).toBeUndefined();
		});

		it('should define ListItem with all optional fields', () => {
			const nestedList: ParsedList = {
				type: 'itemize',
				items: [{ content: 'Nested item' }],
				level: 1
			};

			const item: ListItem = {
				content: 'Description item',
				label: 'Term',
				number: 1,
				nestedList
			};

			expect(item.label).toBe('Term');
			expect(item.number).toBe(1);
			expect(item.nestedList?.level).toBe(1);
		});

		it('should define ParsedList with required fields', () => {
			const list: ParsedList = {
				type: 'enumerate',
				items: [{ content: 'First' }, { content: 'Second' }],
				level: 0
			};

			expect(list.type).toBe('enumerate');
			expect(list.items).toHaveLength(2);
			expect(list.level).toBe(0);
			expect(list.markerStyle).toBeUndefined();
		});

		it('should define ParsedList with markerStyle', () => {
			const list: ParsedList = {
				type: 'itemize',
				items: [],
				level: 2,
				markerStyle: 'square'
			};

			expect(list.markerStyle).toBe('square');
		});
	});

	describe('Table Types', () => {
		it('should accept all table alignments', () => {
			const alignments: TableAlignment[] = ['left', 'center', 'right'];

			alignments.forEach((alignment) => {
				const column: TableColumn = { alignment };
				expect(column.alignment).toBe(alignment);
			});
		});

		it('should define TableColumn with required alignment', () => {
			const column: TableColumn = {
				alignment: 'center'
			};
			expect(column.alignment).toBe('center');
			expect(column.leftBorder).toBeUndefined();
			expect(column.rightBorder).toBeUndefined();
			expect(column.width).toBeUndefined();
		});

		it('should define TableColumn with all optional fields', () => {
			const column: TableColumn = {
				alignment: 'left',
				leftBorder: true,
				rightBorder: false,
				width: '5cm'
			};

			expect(column.leftBorder).toBe(true);
			expect(column.rightBorder).toBe(false);
			expect(column.width).toBe('5cm');
		});

		it('should define TableCell with required content', () => {
			const cell: TableCell = {
				content: 'Cell content'
			};
			expect(cell.content).toBe('Cell content');
		});

		it('should define TableCell with all optional fields', () => {
			const cell: TableCell = {
				content: 'Header',
				colspan: 2,
				rowspan: 1,
				alignment: 'center',
				isHeader: true
			};

			expect(cell.colspan).toBe(2);
			expect(cell.rowspan).toBe(1);
			expect(cell.alignment).toBe('center');
			expect(cell.isHeader).toBe(true);
		});

		it('should define TableRow with required cells', () => {
			const row: TableRow = {
				cells: [{ content: 'A' }, { content: 'B' }]
			};
			expect(row.cells).toHaveLength(2);
		});

		it('should define TableRow with all optional fields', () => {
			const row: TableRow = {
				cells: [{ content: 'Header' }],
				topBorder: true,
				bottomBorder: true,
				isHeader: true
			};

			expect(row.topBorder).toBe(true);
			expect(row.bottomBorder).toBe(true);
			expect(row.isHeader).toBe(true);
		});

		it('should define ParsedTable with required fields', () => {
			const table: ParsedTable = {
				columns: [{ alignment: 'left' }, { alignment: 'right' }],
				rows: [
					{ cells: [{ content: 'A' }, { content: 'B' }] },
					{ cells: [{ content: '1' }, { content: '2' }] }
				]
			};

			expect(table.columns).toHaveLength(2);
			expect(table.rows).toHaveLength(2);
		});

		it('should define ParsedTable with all optional fields', () => {
			const table: ParsedTable = {
				columns: [{ alignment: 'center' }],
				rows: [{ cells: [{ content: 'Data' }] }],
				caption: 'Table 1: Sample data',
				label: 'tab:sample',
				useBooktabs: true
			};

			expect(table.caption).toBe('Table 1: Sample data');
			expect(table.label).toBe('tab:sample');
			expect(table.useBooktabs).toBe(true);
		});
	});

	describe('Section Types', () => {
		it('should accept all section levels', () => {
			const levels: SectionLevel[] = [
				'part',
				'chapter',
				'section',
				'subsection',
				'subsubsection',
				'paragraph',
				'subparagraph'
			];

			levels.forEach((level) => {
				const section: ParsedSection = {
					level,
					title: 'Test',
					numbered: true,
					markdownLevel: 1
				};
				expect(section.level).toBe(level);
			});
		});

		it('should define ParsedSection with required fields', () => {
			const section: ParsedSection = {
				level: 'section',
				title: 'Introduction',
				numbered: true,
				markdownLevel: 2
			};

			expect(section.level).toBe('section');
			expect(section.title).toBe('Introduction');
			expect(section.numbered).toBe(true);
			expect(section.markdownLevel).toBe(2);
		});

		it('should define ParsedSection with all optional fields', () => {
			const section: ParsedSection = {
				level: 'chapter',
				title: 'Getting Started with LaTeX',
				shortTitle: 'Getting Started',
				label: 'ch:intro',
				numbered: false,
				markdownLevel: 1
			};

			expect(section.shortTitle).toBe('Getting Started');
			expect(section.label).toBe('ch:intro');
		});
	});

	describe('Bibliography Types', () => {
		it('should accept all citation styles', () => {
			const styles: CitationStyle[] = ['author-year', 'numeric', 'footnote'];

			styles.forEach((style) => {
				const citation: ParsedCitation = {
					keys: ['ref1'],
					style
				};
				expect(citation.style).toBe(style);
			});
		});

		it('should define ParsedCitation with required fields', () => {
			const citation: ParsedCitation = {
				keys: ['knuth1984', 'lamport1994'],
				style: 'author-year'
			};

			expect(citation.keys).toEqual(['knuth1984', 'lamport1994']);
			expect(citation.style).toBe('author-year');
		});

		it('should define ParsedCitation with all optional fields', () => {
			const citation: ParsedCitation = {
				keys: ['einstein1905'],
				prefix: 'see',
				suffix: 'p. 42',
				style: 'numeric',
				includeAuthor: false
			};

			expect(citation.prefix).toBe('see');
			expect(citation.suffix).toBe('p. 42');
			expect(citation.includeAuthor).toBe(false);
		});
	});

	describe('TranspilerFunction', () => {
		it('should define the main transpiler function signature', () => {
			const mockTranspiler: TranspilerFunction = (latex, options) => {
				return {
					markdown: latex.replace(/\\textbf\{([^}]+)\}/g, '**$1**'),
					warnings: [],
					stats: options?.preserveComments
						? { tokenCount: 1, commandsConverted: 1, environmentsConverted: 0, mathExpressions: 0 }
						: undefined
				};
			};

			const result = mockTranspiler('\\textbf{bold}');
			expect(result.markdown).toBe('**bold**');
			expect(result.warnings).toEqual([]);

			const resultWithOptions = mockTranspiler('\\textbf{bold}', { preserveComments: true });
			expect(resultWithOptions.stats?.tokenCount).toBe(1);
		});

		it('should accept optional options parameter', () => {
			const mockTranspiler: TranspilerFunction = (latex, _options) => ({
				markdown: latex,
				warnings: []
			});

			// Call without options
			const result1 = mockTranspiler('test');
			expect(result1.markdown).toBe('test');

			// Call with empty options
			const result2 = mockTranspiler('test', {});
			expect(result2.markdown).toBe('test');

			// Call with full options
			const result3 = mockTranspiler('test', {
				preserveComments: true,
				mathDelimiters: 'brackets',
				maxNestingDepth: 5,
				fallbackToText: true,
				preserveWhitespace: true
			});
			expect(result3.markdown).toBe('test');
		});
	});

	describe('BaseToken interface', () => {
		it('should require all base fields', () => {
			const base: BaseToken = {
				type: 'text',
				raw: 'Hello',
				start: 0,
				end: 5,
				line: 1,
				column: 1
			};

			expect(base.type).toBe('text');
			expect(base.raw).toBe('Hello');
			expect(base.start).toBe(0);
			expect(base.end).toBe(5);
			expect(base.line).toBe(1);
			expect(base.column).toBe(1);
		});

		it('should enforce position ordering (start < end)', () => {
			// This is a semantic check, not a TypeScript check
			const token: BaseToken = {
				type: 'text',
				raw: 'test',
				start: 10,
				end: 14,
				line: 2,
				column: 5
			};

			expect(token.end).toBeGreaterThan(token.start);
			expect(token.end - token.start).toBe(token.raw.length);
		});
	});
});
