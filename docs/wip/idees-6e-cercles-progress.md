# Chantier `idees-6e-cercles` — idées reprises d'ailleurs, rubrique « Cercles et disques » de 6e

## Reprendre ici

_Mis à jour le 2026-11-28, migrations générées (PR ouverte)._

- **État** : migrations générées et commitées sur `feat/idees-6e-cercles-migrations` : rangement de N1 c9bc598a
  (niveau 3) et N2 10d20825 (niveau 2) sur `Géométrie > Figures planes > cercle`, tag 6-162 ; contenu des 3
  publiés (+3 variations chacun). Intégration rouge sans (9 échecs), verte avec ; garde des niveaux sans écart.
- **Prochaine action** : `security-auditor` sur la PR, CI verte → merge ; puis depuis `main` à jour
  `migration list --linked` (une autre en attente → stop) et `db:migrate` ; vérifier en base ; relecture des
  brouillons dans `/dev/modeles?noeud=` et série de relecture des 3 publiés.
- **En attente de David** : rien.
- **Pièges en cours** : deux `verifier:` de la même famille (deux cercles) ne font pas une figure composée, et
  la garde de la règle graduée refuse alors le cercle « passant par » : N1 c commence par le segment [CD].
- **Worktree / branche** : `../ubumaths-wt-idees-6e-cercles`, `feat/idees-6e-cercles-migrations` (poussée).

## Phase 0 (2026-11-28)

9 exercices lus : 1 ✅, 2 🟡, 6 ❌ ou en partie (voir le relevé). Question d'accès de la migration : **personne ne
gagne d'accès**, on range des modèles du prof et on ajoute des variations à des modèles publiés.

Page à cocher : https://claude.ai/artifact/WtKPymyPCYikJrmezzon8f (Oui / Non / Autrement + note, collection `verdicts`).

### Fiches

- **F1 — Vocabulaire du cercle : l'autre sens, « le » et « un »** (3 variations ajoutées à b8939937, publié, 6-162).
  Chez eux (6G2A) : une figure, deux sens de question, $OA$ (le rayon, une longueur) et $[OA]$ (un rayon, un segment).
  Chez nous : v1 demande seulement « que représente le segment … ». Figure de v1 reprise (rayon, diamètre, corde).
  (e) « Sur la figure, quel segment est un diamètre ? » (une corde qui n'est pas un diamètre, un rayon), case choix
  parmi $[OA]$, $[BC]$, $[DE]$ ; (f) « Complète : $OA$ est … du cercle » ou « $[OA]$ est … », case choix (le rayon,
  un rayon, le diamètre, une corde) ; (g) « Que représente le segment $[BC]$ ? », plusieurs bonnes réponses (un
  diamètre **et** une corde). Erreurs prévues : un rayon pour $OA$, le rayon pour $[OA]$ ; la corde prise pour un
  diamètre ; un diamètre coché sans la corde.
- **N1 — Construire des cercles d'après un programme** (modèle neuf, 6-162, 3 variations). Chez eux (6G2A-2) :
  papier. Chez nous : construction au CE2 et au CM seulement, rayon donné. Case « figure » sur papier uni.
  (a) centre $O$ et **diamètre** $D$ cm ($D$ de 6 à 12) : `cercle(O, rayon=D/2 cm)` ; (b) cercle de diamètre
  $[AB]$ ($AB$ de 6 à 10 cm) : figure composée, `point I = milieu(A, B)` à la règle graduée puis
  `cercle c = cercle(I, passant=A)` ; (c) programme de deux cercles sur un segment $[CD]$ de 6 à 9 cm : centre $C$
  et rayon 3 à 5 cm, puis centre $D$ passant par $C$ (figure composée). Erreurs prévues : les messages du juge
  (rayon pris égal au diamètre : « ton cercle a un rayon de 8 cm au lieu de 4 cm » ; compas piqué en $A$ au lieu du
  milieu).
- **N2 — Retrouver le programme d'un cercle tracé** (modèle neuf, 6-162, 3 variations). Chez eux (6G2A-3) :
  étiquettes à glisser. Chez nous : rien. Case choix (une phrase, pas à taper). (a) cercle de centre $A$ passant par
  $B$, $[AB]$ tracé : « de centre $A$ passant par $B$ », « de centre $B$ passant par $A$ », « de diamètre $[AB]$ » ;
  (b) cercle de diamètre $[AB]$, milieu $I$ marqué : « de diamètre $[AB]$ », « de centre $A$ passant par $B$ »,
  « de centre $I$ et de rayon $AB$ » ; (c) cercle de centre $O$, un diamètre tracé et coté $d$ cm : « de centre $O$
  et de rayon $d/2$ cm », « de rayon $d$ cm », « de diamètre $d/2$ cm ». Erreurs prévues : centre et point de
  passage échangés ; le diamètre pris pour le rayon ; le rayon pris égal à $AB$.
- **F2 — Ensembles de points : tracer, nommer, lire une région** (3 variations ajoutées à 48524505, publié, 6-163).
  Chez eux (6G2B, 6G2C-1) : construire cercle ou disque ; signes à remplir sous une région grisée. Chez nous : les
  distances sont toujours données. (d) « Trace l'ensemble des points situés à $r$ cm du point $O$ » ($r$ de 2 à 5,
  au mm), case « figure », `cercle(O, rayon=r cm)` ; (e) « Quel est l'ensemble des points situés à $r$ cm au plus
  de $O$ ? » case choix (le disque de centre $O$ et de rayon $r$ cm, le cercle de centre $O$ et de rayon $r$ cm, le
  disque de rayon $2r$ cm, le cercle de diamètre $r$ cm) ; (f) figure : disque grisé, extérieur grisé, ou cercle
  seul ; $M$ est un point de la partie grisée : « $OM$ est égal à $r$ cm », « inférieur ou égal », « supérieur »
  (en mots, pas de $\le$ en 6e). Erreurs prévues : le cercle pour le disque ; le disque de rayon $2r$ ; « égal »
  quand la région est un disque.
- **F3 — Distances à un point : régions et zone d'une chèvre** (3 variations ajoutées à 2f3da9ce, publié, 6-164).
  Chez eux (6G2C-1, 6G2C) : couronne, deux disques ; chèvre dans un enclos, zone à hachurer. Chez nous : v2 (deux
  conditions, tableau) sans figure ; v1 sans figure. (d) couronne grisée entre deux cercles de centre $O$ (rayons
  1,5..2,5 et 3,5..4,5 cm) : cocher les deux conditions vraies pour $M$ (plusieurs bonnes réponses parmi quatre) ;
  (e) deux disques qui se chevauchent, $M$ dans la partie commune (ou dans l'un sans l'autre) : conditions sur $MA$
  et $MB$ ; (f) chèvre attachée par une corde de 3 à 6 m dans un enclos rectangulaire (dessiné) : piquet dans un
  coin, au milieu d'un côté, ou loin des murs : « la zone où elle broute est … » (un quart de disque, un
  demi-disque, un disque). Erreurs prévues : la condition inverse sur le petit cercle ; une seule condition ;
  « un disque » quand le piquet est dans un coin.
- **Rien** : 6G2A-1 (b8939937 v2, 3ec74bbc).
- **Outils proposés** (à `outils-manquants.md` si David les veut) :
  - **O1 — Colorier une région du plan** (un disque, une zone bornée par des cercles et des murs) dans la case
    « figure » : 6G2B (disque à construire), 6G2C (zone broutée à hachurer). 6-163, 6-164.
  - **O2 — Reports bout à bout au compas** sur une demi-droite, jugés en longueur totale : 6G2C-2 (périmètre
    reporté). Points du CM (comparer des périmètres) et 6-148.
  - **O3 — Arcs de cercle** d'extrémités données, tracés et jugés (figure faite d'arcs) : 6G2B-1. CM1-105 / CM2-095.

## Journal

- 2026-11-28 : migrations générées (rangement 20261128171523, contenu 20261128171531). Nœud `cercle` revérifié
  en prod (sous-notion active ; publiés 1/1/2/2/3, N2 en 2 et N1 en 3, rien de neuf depuis le relevé).
  Intégration : 9 échecs avec les SQL vidés, 622 verts avec ; `garde-niveaux-tags` sans écart.
- 2026-11-28 : brouillons N1 (c9bc598a) et N2 (10d20825) créés en prod par David, vérifiés (draft, sans nœud).
- 2026-11-28 : #3323 mergée (fichiers du lot seuls, CI verte).
- 2026-11-28 : lot écrit (`docs/wip/questions/idees-6e-cercles-neufs.py`, `…-publies.py`). Écarts à la phase 0 :
  N1 c reprend le programme de leur exercice (segment [CD] de n cm d'abord, puis les deux cercles : figure
  composée, cf. pièges) ; F2 f : disque grisé et M placé dedans, sur le cercle ou dehors (pas d'« extérieur
  grisé ») ; F3 d et e : M placé sur la figure, pas de région grisée (une couronne évidée demanderait une
  couleur de fond, rendu incertain en thème sombre) ; une case choix ou figure ne porte pas d'erreurs prévues
  (specs seules) ; un choix incomplet (une bonne case sur deux) est jugé « à améliorer », pas faux. Specs : N1 14,
  N2 13, b8939937 +20, 48524505 +16, 2f3da9ce +18, toutes vertes ; sonde des figures : 0 problème. Essai en base
  locale (copies « — essai »), vu dans `/dev/modeles` : consignes « Coche … » en doublon avec la ligne de
  l'appli, remplacées par une question.
- 2026-11-28 : David valide toutes les fiches (« je valide », page à cocher vide). b8939937, 48524505, 2f3da9ce
  réservés (64c7f7593a) et exportés de prod. Outils O1 à O3 → n° 82 à 84 de `outils-manquants.md`.
- 2026-11-28 : rubrique réservée (ad25529d73), relevé et phase 0 écrits.
