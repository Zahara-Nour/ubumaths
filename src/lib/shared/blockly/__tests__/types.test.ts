/**
 * Type tests for Blockly module
 */

import { describe, it, expect } from 'vitest';
import type {
	ExecutorState,
	ExecutionLanguage,
	OutputLine,
	BlocklyWorkspaceState,
	CodeGenerationResult,
	ExecutionContext,
	WorkspaceOptions
} from '../types';
import {
	BLOCKLY_CONFIG,
	LOADING_STAGES,
	ERROR_MESSAGES,
	CODE_TEMPLATES,
	DEFAULT_WORKSPACE_OPTIONS
} from '../config';

describe('Blockly Types', () => {
	describe('ExecutorState', () => {
		it('should accept valid executor states', () => {
			const states: ExecutorState[] = ['initial', 'ready', 'executing', 'error'];
			expect(states).toHaveLength(4);
		});
	});

	describe('ExecutionLanguage', () => {
		it('should accept valid execution languages', () => {
			const languages: ExecutionLanguage[] = ['javascript', 'python'];
			expect(languages).toHaveLength(2);
		});
	});

	describe('OutputLine', () => {
		it('should create valid output line', () => {
			const line: OutputLine = {
				type: 'stdout',
				text: 'Hello, world!',
				timestamp: Date.now()
			};
			expect(line.text).toBe('Hello, world!');
		});

		it('should allow optional timestamp', () => {
			const line: OutputLine = {
				type: 'stderr',
				text: 'Error occurred'
			};
			expect(line.timestamp).toBeUndefined();
		});
	});

	describe('BlocklyWorkspaceState', () => {
		it('should create valid workspace state', () => {
			const state: BlocklyWorkspaceState = {
				xml: '<xml></xml>',
				lastModified: Date.now(),
				language: 'javascript',
				metadata: {
					blockCount: 5,
					scale: 1.0
				}
			};
			expect(state.language).toBe('javascript');
			expect(state.metadata?.blockCount).toBe(5);
		});
	});

	describe('CodeGenerationResult', () => {
		it('should create successful generation result', () => {
			const result: CodeGenerationResult = {
				code: 'console.log("test");',
				language: 'javascript',
				success: true,
				blockCount: 3
			};
			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should create failed generation result', () => {
			const result: CodeGenerationResult = {
				code: '',
				language: 'python',
				success: false,
				error: 'Invalid block configuration',
				blockCount: 0,
				warnings: ['Warning 1', 'Warning 2']
			};
			expect(result.success).toBe(false);
			expect(result.warnings).toHaveLength(2);
		});
	});

	describe('ExecutionContext', () => {
		it('should create valid execution context', () => {
			const context: ExecutionContext = {
				id: 'ctx-123',
				language: 'javascript',
				jsTimeout: BLOCKLY_CONFIG.JS_TIMEOUT_MS,
				pythonTimeout: BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS,
				maxOutputLines: BLOCKLY_CONFIG.MAX_OUTPUT_LINES,
				createdAt: Date.now()
			};
			expect(context.language).toBe('javascript');
			expect(context.jsTimeout).toBe(10_000);
		});
	});

	describe('WorkspaceOptions', () => {
		it('should accept string toolbox', () => {
			const options: WorkspaceOptions = {
				toolbox: '<xml></xml>'
			};
			expect(typeof options.toolbox).toBe('string');
		});

		it('should accept object toolbox', () => {
			const options: WorkspaceOptions = {
				toolbox: { kind: 'categoryToolbox', contents: [] }
			};
			expect(typeof options.toolbox).toBe('object');
		});
	});
});

describe('Blockly Config', () => {
	describe('BLOCKLY_CONFIG', () => {
		it('should have correct timeout values', () => {
			expect(BLOCKLY_CONFIG.JS_TIMEOUT_MS).toBe(10_000);
			expect(BLOCKLY_CONFIG.PYTHON_TIMEOUT_MS).toBe(30_000);
		});

		it('should have correct limits', () => {
			expect(BLOCKLY_CONFIG.MAX_CODE_LENGTH).toBe(100_000);
			expect(BLOCKLY_CONFIG.MAX_OUTPUT_LINES).toBe(1000);
		});

		it('should be immutable at compile time', () => {
			// TypeScript ensures immutability at compile time with 'as const'
			// @ts-expect-error - Cannot assign to 'JS_TIMEOUT_MS' because it is a read-only property
			const test = () => (BLOCKLY_CONFIG.JS_TIMEOUT_MS = 5000);
			expect(test).toBeDefined();
		});
	});

	describe('LOADING_STAGES', () => {
		it('should have 4 stages', () => {
			expect(LOADING_STAGES).toHaveLength(4);
		});

		it('should have French stage messages', () => {
			expect(LOADING_STAGES[0].stage).toContain('Initialisation');
			expect(LOADING_STAGES[3].stage).toBe('Pret !');
		});

		it('should have progressive percentages', () => {
			expect(LOADING_STAGES[0].percent).toBe(0);
			expect(LOADING_STAGES[3].percent).toBe(100);
		});
	});

	describe('ERROR_MESSAGES', () => {
		it('should have French error messages', () => {
			expect(ERROR_MESSAGES.TIMEOUT_JS).toContain('JavaScript');
			expect(ERROR_MESSAGES.TIMEOUT_PYTHON).toContain('Python');
		});

		it('should be immutable at compile time', () => {
			// TypeScript ensures immutability at compile time with 'as const'
			// @ts-expect-error - Cannot assign to 'TIMEOUT_JS' because it is a read-only property
			const test = () => (ERROR_MESSAGES.TIMEOUT_JS = 'New message');
			expect(test).toBeDefined();
		});
	});

	describe('CODE_TEMPLATES', () => {
		it('should have JavaScript wrapper template', () => {
			expect(CODE_TEMPLATES.JAVASCRIPT_WRAPPER).toContain('%CODE%');
			expect(CODE_TEMPLATES.JAVASCRIPT_WRAPPER).toContain("'use strict'");
		});

		it('should have Python setup template', () => {
			expect(CODE_TEMPLATES.PYTHON_SETUP).toContain('import sys');
		});
	});

	describe('DEFAULT_WORKSPACE_OPTIONS', () => {
		it('should have grid configuration', () => {
			expect(DEFAULT_WORKSPACE_OPTIONS.grid.spacing).toBe(20);
			expect(DEFAULT_WORKSPACE_OPTIONS.grid.snap).toBe(true);
		});

		it('should have zoom configuration', () => {
			expect(DEFAULT_WORKSPACE_OPTIONS.zoom.controls).toBe(true);
			expect(DEFAULT_WORKSPACE_OPTIONS.zoom.startScale).toBe(1.0);
		});

		it('should enable trashcan and sounds', () => {
			expect(DEFAULT_WORKSPACE_OPTIONS.trashcan).toBe(true);
			expect(DEFAULT_WORKSPACE_OPTIONS.sounds).toBe(true);
		});
	});
});
