/**
 * Markdown Utilities
 * ==================
 *
 * Shared utility functions for markdown components.
 *
 * @module components/markdown/utils
 */

// Échappement HTML : un seul exemplaire, celui de `#lib/utils/html-escape.ts`.
// À appeler avant tout rendu `{@html}` d'un contenu fourni par l'utilisateur.
export { escapeHtml } from '#lib/utils/html-escape.ts';
