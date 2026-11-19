/**
 * Chiphre sur les fiches imprimées (David, 2026-11-19)
 * ====================================================
 *
 * Styles « Fiche élève » et « 2 colonnes - paysage » : QR code vers le site
 * en tête de la page 1, « chiph.re » dessous et en bas des pages suivantes.
 * Placeholders `{{site_qr}}` et `{{site_name}}` des gabarits, remplis par le
 * générateur et par l'aperçu des styles.
 *
 * @module typst/templates/site-mark
 */

import { qrImageTypst } from '#lib/ubumark/generators/qr-typst.ts';
import { SITE_URL } from '#lib/seo/site.ts';

/** Le nom du site imprimé : sous le QR de l'en-tête, en bas des pages suivantes */
export const SITE_NAME = SITE_URL.replace(/^https:\/\/(www\.)?/, '');

/**
 * Le QR code vers le site : une expression Typst (`image(…)`), sans le `#` ;
 * 1,6 cm, la taille qui se lit encore bien une fois imprimée. Le même pour
 * toutes les fiches : calculé une fois.
 */
export const SITE_QR_TYPST = qrImageTypst(SITE_URL, 1.6) ?? '';
