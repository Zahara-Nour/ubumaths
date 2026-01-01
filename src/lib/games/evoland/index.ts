/**
 * Evoland Game - Public exports
 *
 * Port of Evoland Classic (Haxe/OpenFL) to TypeScript/Svelte 5
 * Original: https://github.com/deepnight/evolern
 */

// Types
export * from './logic/types';
export * from './logic/constants';

// Logic (pure functions)
export * from './logic/world';
export * from './logic/entities';
export * from './logic/hero';
export * from './logic/monster';
// export * from './logic/progression';

// Engine
export * from './engine/sprite-sheet';
export * from './engine/renderer';
export * from './engine/game-loop';
export * from './engine/input-manager';
export * from './engine/audio-manager';
export * from './engine/world-renderer';
export * from './engine/entity-renderer';

// Components
// export { default as EvolandGame } from './components/EvolandGame.svelte';
// export { default as GameHUD } from './components/GameHUD.svelte';
// export { default as DialogPopup } from './components/DialogPopup.svelte';

// Store
// export { evolandStore } from './stores/evoland.svelte';
