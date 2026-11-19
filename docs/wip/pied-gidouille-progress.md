# Pied de page : numéro au centre, gidouille + chiph.re à droite — journal

## Reprendre ici

_Mis à jour le 2026-11-19, avant la PR._

- **État** : code + tests + doc commités sur la branche, PDF d'aperçu envoyé à David · **Prochaine action** : go de David → PR, CI verte → merge · **En attente de David** : validation de la disposition et de « chiph.re » (plutôt que « Chiphre ») · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-pied-gidouille` / `feat/pied-gidouille`

## Historique

- 2026-11-19 — Second retour de David après #2880 : numéro de page au centre, « chiph.re » à
  droite, gidouille devant ; question « Chiphre ou chiph.re ? » → recommandation : chiph.re
  (l'adresse à taper ; la gidouille signe la marque). Fait : `gidouilleSvg()` (même spirale que le
  QR), `SITE_GIDOUILLE_TYPST`, placeholder `{{site_gidouille}}` ; test des positions lues dans le
  PDF (numéro entre 40 et 55 % de la largeur, chiph.re au-delà de 80 %), rouge avant.
