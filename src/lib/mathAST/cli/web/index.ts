/**
 * Web REPL Infrastructure
 *
 * Browser-compatible REPL components for mathAST.
 * Provides HTML-formatted output, history management, and reactive state.
 *
 * @module mathAST/cli/web
 */

// =============================================================================
// REPL Engine
// =============================================================================

export { WebReplEngine } from './web-repl-engine';

// =============================================================================
// Types
// =============================================================================

export type { ReplInputMode, TabStyle, ReplExecutionResult, ReplHistoryEntry } from './types';

// =============================================================================
// Output Formatting
// =============================================================================

export {
	formatErrorHtml,
	formatInputErrorHtml,
	escapeWithLabel,
	formatTreeHtml,
	formatHashHtml
} from './output-formatter-web';
