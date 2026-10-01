/**
 * Inscrit le rendu Typst du bloc ```figure (effet de bord VOULU à l'import).
 *
 * À importer par chaque module qui appelle `generateTypst` pour produire un PDF
 * (`import '$lib/ubumark/generators/figure-typst-setup';`) — un test le vérifie.
 * Voir `figure-typst-registry.ts` pour la raison (chunk des pages Markdown).
 *
 * @module ubumark/generators/figure-typst-setup
 */

import { registerFigureTypstRenderer } from './figure-typst-registry';
import { generateFigureTypst } from './figure-typst';

registerFigureTypstRenderer(generateFigureTypst);
