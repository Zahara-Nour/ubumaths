/**
 * Validation library - central export
 * Re-exports all validation schemas for easy importing
 */

// Common schemas and helpers
export * from './common';

// Feature-specific schemas
export * from './admin';
export * from './assessments';
export * from './auth';
export * from './chat';
export * from './classes';
export * from './draw-vip-cards';
export * from './errors';
export * from './exercises';
export * from './games';
export * from './google';
export * from './image-upload';
export * from './latex';
export * from './message-templates';
export * from './messages';
export * from './notifications';
export * from './questions';
export * from './rewards';
export * from './riddles';
export * from './srs';
export * from './tags';
export * from './warnings';
export * from './worksheets';

// Route parameter validation helpers
export * from './params';

// Disambiguate names exported by several modules (resolves the `export *` collisions).
// An explicit named re-export takes precedence over the star-exported ones. No barrel
// consumer imports these two directly, so the pick is functionally neutral — it only
// satisfies TypeScript.
// NOTE (latent debt): `questionCategorySchema` is defined twice with DIFFERENT shapes
// (./assessments has `level`, ./questions does not); `variableSchema` is defined in
// ./exercises AND in $lib/questions/template-schema (re-exported by ./questions).
// These duplications should be consolidated to a single source of truth.
export { questionCategorySchema } from './assessments';
export { variableSchema } from './exercises';
