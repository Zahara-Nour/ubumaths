/**
 * Déclarations de `scratchblocks` (paquet sans types), réduites à ce que lit
 * le bloc ```scratch : `ubumark/utils/scratch-check.ts` (syntaxe) et
 * `ubumark/utils/scratch-render.ts` (dessin, navigateur seulement).
 */

declare module 'scratchblocks/syntax/index.js' {
	export interface ScratchBlockInfo {
		id?: string;
		selector?: string;
		category?: string;
		shape?: string;
	}
	export interface ScratchChild {
		readonly isBlock?: boolean;
		readonly isScript?: boolean;
		readonly isInput?: boolean;
	}
	export interface ScratchBlock extends ScratchChild {
		readonly isBlock: true;
		info: ScratchBlockInfo;
		children: (ScratchChild | ScratchBlock | ScratchScript | ScratchInput)[];
		stringify(): string;
	}
	export interface ScratchInput extends ScratchChild {
		readonly isInput: true;
		value: unknown;
	}
	export interface ScratchScript extends ScratchChild {
		readonly isScript: true;
		blocks: ScratchBlock[];
	}
	export interface ScratchDocument {
		scripts: ScratchScript[];
	}
	export interface ScratchParseOptions {
		languages?: string[];
		inline?: boolean;
	}
	export function parse(code: string, options?: ScratchParseOptions): ScratchDocument;
	export function loadLanguages(languages: Record<string, unknown>): void;
}

declare module 'scratchblocks/index.js' {
	import type { ScratchDocument, ScratchParseOptions } from 'scratchblocks/syntax/index.js';
	export interface ScratchRenderOptions {
		style?: 'scratch2' | 'scratch3' | 'scratch3-high-contrast';
		scale?: number;
	}
	export interface ScratchBlocksApi {
		parse(code: string, options?: ScratchParseOptions): ScratchDocument;
		render(doc: ScratchDocument, options?: ScratchRenderOptions): SVGSVGElement;
		loadLanguages(languages: Record<string, unknown>): void;
		appendStyles(): void;
	}
	export default function init(window: Window): ScratchBlocksApi;
}
