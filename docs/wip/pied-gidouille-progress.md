# Pied de page : numéro au centre, gidouille + chiph.re à droite — journal

## Reprendre ici

_Mis à jour le 2026-11-19, avant la PR._

- **État** : pied de page (numéro au centre, gidouille + chiph.re à droite) et niveau de la fiche (nom complet sous le titre, forme courte au bas de page) commités sur la branche, PR pas encore ouverte (accord de David pour la même PR) · **Prochaine action** : écouter l'autre modification demandée par David, puis PR · **En attente de David** : sa nouvelle modification · **Pièges en cours** : le PDF de l'élève et celui d'un lien de partage n'ont pas les niveaux (vue SQL sans `grades`) → pas de niveau imprimé ; l'ajouter demande une migration (question d'accès à poser) · **Worktree / branche** : `../ubumaths-wt-pied-gidouille` / `feat/pied-gidouille`

## Historique

- 2026-11-19 — Second retour de David après #2880 : numéro de page au centre, « chiph.re » à
  droite, gidouille devant ; question « Chiphre ou chiph.re ? » → recommandation : chiph.re
  (l'adresse à taper ; la gidouille signe la marque). Fait : `gidouilleSvg()` (même spirale que le
  QR), `SITE_GIDOUILLE_TYPST`, placeholder `{{site_gidouille}}` ; test des positions lues dans le
  PDF (numéro entre 40 et 55 % de la largeur, chiph.re au-delà de 80 %), rouge avant.
- 2026-11-19 — Niveau de la fiche (David : sous le titre + bas de page, même PR) : `levels()` du
  générateur, placeholders `{{show_level}}`, `{{level}}`, `{{level_short}}` ; plusieurs niveaux du
  plus petit au plus grand, « · » ; fiche en anglais : aucun (pas de noms anglais) ;
  `regen-depuis-base.ts` lit aussi `grades`. Tests `titre-pied-de-page.test.ts` (rouges avant).
