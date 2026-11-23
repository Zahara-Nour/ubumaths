# Pied de page : numéro au centre, gidouille + chiph.re à droite — journal

## Reprendre ici

_Mis à jour le 2026-11-19, après #2891._

- **État** : chantier clos, #2891 mergée (numéro au centre, gidouille + chiph.re à droite, niveau sous le titre et au bas de page). Pas encore en prod (attend `deploy:prod`). Suite : chantier `categorie-fiche` (phase 0) ; niveau sur le PDF de l'élève / d'un lien de partage = migration à décider (noté dans son journal).

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
