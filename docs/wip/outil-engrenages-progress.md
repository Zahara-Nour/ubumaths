# Chantier `outil-engrenages` : figure d'engrenages (outil n° 52)

Lot `engrenages` d'[outils-lots.md](outils-lots.md). Ligne n° 52 d'[outils-manquants.md](outils-manquants.md).
Né du relevé `idees-3e-arithmetique` ([journal archivé](../archive/wip/idees-3e-arithmetique/idees-3e-arithmetique-progress.md)) :
le modèle F6 « Engrenages et évènements qui reviennent ensemble »
(`scripts/questions/idees-3e-arithmetique-neufs/f06-engrenages-evenements.json`) pose ses roues
dentées en texte seul.

## Reprendre ici

_Mis à jour le 2026-11-28, phase 0 envoyée._

- **État** : phase 0 envoyée à David, rien de codé · **Prochaine action** : lire sa réponse
  (Q1 à Q5), la noter ici, puis tests rouges → bloc ` ```engrenages ` · **En attente de David** :
  Q1 à Q5 · **Pièges en cours** : aucun · **Worktree / branche** :
  `../ubumaths-wt-outil-engrenages`, `feat/outil-engrenages`.

## Phase 0 (envoyée le 2026-11-28)

Besoin : dessiner deux ou trois roues dentées qui s'engrènent, avec le nombre de dents donné et
une marque sur chaque roue ; au corrigé, les roues tournent jusqu'à ce que les marques se
retrouvent à leur place de départ. Aucun point du programme (3e, classique du brevet).

Syntaxe d'auteur proposée (bloc neuf, comme ` ```horloge `) :

````text
```engrenages
roues: {{a}} ; {{b}}
légendes: A ; B
taille: 6cm
```
````

- **Cas normal** : roues de 12 et 18 dents, côte à côte, chacune avec sa marque (un point
  coloré) en face de l'autre. L'élève lit la figure et répond dans les cases du modèle (36 dents,
  3 tours pour A, 2 pour B), comme aujourd'hui. Au corrigé, un bouton « Voir tourner » : A fait
  3 tours, B en fait 2 en sens contraire, et les deux marques se retrouvent face à face ; le
  compteur de tours de chaque roue s'affiche pendant l'animation.
- **Trois roues** : `roues: 12 ; 18 ; 8`, alignées A–B–C ; B tourne dans l'autre sens que A et
  C. L'animation va jusqu'à ce que les trois marques soient revenues ensemble.
- **Limites** : on dessine vraiment toutes les dents (l'élève peut les compter) ; de 6 à 60 dents
  par roue, au-delà les dents ne se voient plus. Rayon proportionnel au nombre de dents (les dents
  ont la même taille sur toutes les roues, sinon elles ne s'engrèneraient pas).
- **PDF** : figure à l'arrêt, position de départ ; pas d'animation.
- **Erreurs d'auteur** (message situé, le bloc ne disparaît pas) : une seule roue ou plus de
  trois, nombre de dents non entier ou hors de 6 à 60, légendes en nombre différent des roues.

Questions :

- **Q1 animation** : seulement au corrigé (reco : dans l'énoncé, l'élève compterait les tours au
  lieu de chercher le multiple commun), ou aussi dans l'énoncé ?
- **Q2 durée de l'animation** : calculée par le bloc jusqu'au premier retour des marques (reco :
  aucune erreur d'auteur possible), ou un nombre de tours écrit par l'auteur ?
- **Q3 trois roues** : en ligne seulement (reco), ou aussi en triangle (trois roues qui se
  touchent deux à deux ne peuvent pas tourner : à éviter) ?
- **Q4 sens de rotation** : flèches dessinées sur l'énoncé (utile pour « dans quel sens tourne
  C ? »), ou rien (reco : rien, une option `sens: oui` quand un modèle le demandera) ?
- **Q5 découpage** : une PR : le bloc, l'écran, l'animation du corrigé, le PDF ; le modèle F6
  reste aux sessions « idées » (règle 5 d'`outils-lots.md`). Reco : oui.
