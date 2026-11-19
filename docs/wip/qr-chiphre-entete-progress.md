# QR de Chiphre en tête des fiches — journal

## Reprendre ici

_Mis à jour le 2026-11-19, PR #2880 ouverte._

- **État** : PR ouverte · **Prochaine action** : revue + CI verte → merge · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-qr-chiphre-entete` / `feat/qr-chiphre-entete`

## Historique

- 2026-11-19 — Décisions de David : QR vers l'accueil `https://www.chiph.re` (destination 1 sur 3
  proposées ; la série Automaths et le lien de partage écartés) ; QR dans l'en-tête de la page 1,
  à droite du titre, « chiph.re » dessous ; « chiph.re » au bas des pages suivantes ; sur tous les
  PDF (fiche, réponses, corrigé). Styles « Fiche élève » et « 2 colonnes - paysage ».
- Fait : `templates/site-mark.ts` (`SITE_QR_TYPST`, `SITE_NAME`), `qrImageTypst` extrait de
  `qr-typst.ts`, placeholders `{{site_qr}}` / `{{site_name}}`, aperçu des styles compris. Test au
  compilateur de prod `qr-chiphre-entete.test.ts` (rouge avant). QR décodé par jsQR depuis le PDF
  rendu à 150 dpi : `https://www.chiph.re`.
