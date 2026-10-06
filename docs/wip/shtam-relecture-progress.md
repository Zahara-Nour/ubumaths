# Relecture des articles du Shtam — progression

Relecture par David, article par article, dans l'ordre de parution. Un commit par article validé.
Branche `relecture/shtam` (worktree `ubumaths-wt-relecture`).

| #   | Date       | Article                                                        | État                                                                                                                              |
| --- | ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-09-21 | Pythagore dans la vie courante (`pythagore-vie-courante`)      | ✅ validé — titre et texte réécrits par David, armoire couchée sur le dos, écran en pouces, corde à 13 nœuds, 2 illustrations SVG |
| 2   | 2026-09-25 | π transcendant le mardi (`pi-transcendant-le-mardi`)           | ✅ validé — titre au conditionnel, réplique de Mère Ubu (tartes), décimales « jamais périodiques », aire du disque πr²            |
| 3   | 2026-09-29 | Division par zéro en Nombrilie (`nombrilie-division-par-zero`) | ✅ validé — « Erreur mathématique », Galopin qui veut recommencer, experts (limites ±∞) et forme indéterminée 0/0                 |

## Outillage ajouté pendant la relecture

- Illustrations : fichiers SVG dans `static/shtam/`, insérés par `![texte](/shtam/fichier.svg){size=large}`.
- Moteur Markdown (`ImageDisplay`) : un chemin qui commence par `/` (pas `//`) désigne un fichier du site.

## Note

- La barre des racines `\sqrt{…}` en ligne apparaît décalée d'une ligne vers le haut, en local ET en production, avec ou sans images (constaté le 2026-10-06). Bug de rendu à traiter à part (PR dédiée), hors relecture.
