/**
 * Instrument Components - SVG geometry instruments for constructions
 *
 * Ported from InstrumenPoche (https://instrumenpoche.sesamath.net/)
 * Original author: Yves Biton <yves.biton@sesamath.net>
 * License: AGPL-3.0-or-later
 *
 * These components render detailed SVG representations of geometry instruments
 * for use in geometric construction animations.
 */

export { default as Compass } from './Compass.svelte';
export { default as CompassRaised } from './CompassRaised.svelte';
export { default as Ruler } from './Ruler.svelte';
export { default as SetSquare } from './SetSquare.svelte';
export { default as Protractor } from './Protractor.svelte';
export { default as Pencil } from './Pencil.svelte';

// Re-export types for convenience
export type { ComponentProps } from 'svelte';
