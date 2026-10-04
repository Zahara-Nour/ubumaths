import { Atelier } from './atelier.svelte';
export const MAX_LINK_CURVES = 8;
export type LinkCurves =
	| { readonly kind: 'none' }
	| { readonly kind: 'curves'; readonly definitions: readonly string[] }
	| { readonly kind: 'invalid'; readonly message: string };
export function curvesFromLink(_params: URLSearchParams): LinkCurves {
	return { kind: 'none' };
}
export function atelierFromCurves(
	_definitions: readonly string[]
): { ok: true; atelier: Atelier } | { ok: false; message: string } {
	return { ok: true, atelier: new Atelier() };
}
