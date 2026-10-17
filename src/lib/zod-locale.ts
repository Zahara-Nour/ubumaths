/**
 * Messages de Zod en français
 *
 * Un schéma sans message explicite (`z.string().uuid()`, `.min(2)` nu) rend le
 * texte par défaut de Zod, en anglais (« Invalid UUID », « Too small… »). Les
 * routes le renvoient tel quel (`validation.error.issues[0].message`) et les pages
 * l'affichent dans une notification. `z.config` règle la langue pour tout le
 * processus : ce module est importé une fois, pour son effet, par
 * `src/hooks.server.ts` et par la configuration des tests serveur.
 *
 * Un message explicite (`.uuid('Identifiant de fiche invalide')`) reste prioritaire.
 *
 * @module zod-locale
 */
import { z } from 'zod';

z.config(z.locales.fr());
