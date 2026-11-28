# Chantier `outil-engrenages` : figure d'engrenages (outil n° 52)

Lot `engrenages` d'[outils-lots.md](outils-lots.md). Ligne n° 52 d'[outils-manquants.md](outils-manquants.md).
Né du relevé `idees-3e-arithmetique` ([journal archivé](../archive/wip/idees-3e-arithmetique/idees-3e-arithmetique-progress.md)) :
le modèle F6 « Engrenages et évènements qui reviennent ensemble »
(`scripts/questions/idees-3e-arithmetique-neufs/f06-engrenages-evenements.json`) pose ses roues
dentées en texte seul.

## Reprendre ici

_Mis à jour le 2026-11-28, PR 1 codée, pas encore ouverte._

- **État** : PR 1 prête (bloc, écran, animation au corrigé, PDF, catalogue, docs) ; revue
  Sonnet faite, constats 1 à 4 corrigés (animation aussi dans l'aperçu du modèle et la
  « Solution » d'un exercice par `InCorrection.svelte`, têtes de dents affinées, légendes du PDF
  gardées dans la figure, animation remise au départ quand le bloc change) · **Prochaine
  action** : PR ouverte → `pnpm pr:merger <n>`, puis outil 52 au § 4 « Livré » et lot clos · **En
  attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** :
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

Décisions (David, 2026-11-28 : « je suis tes recos ») : **Q1** animation au corrigé seulement ;
**Q2** durée calculée par le bloc (premier retour de tous les repères) ; **Q3** roues en ligne
seulement ; **Q4** pas de flèches de sens ; **Q5** une PR (bloc, écran, animation, PDF), le modèle
F6 aux sessions « idées ».

## PR 1 : l'outil

- « Au corrigé » = le bloc est écrit dans la correction du modèle : `CorrectionView` pose un
  contexte (`correction-context.ts`) que lit le composant ; dans l'énoncé, figure à l'arrêt.
- Un seul dessin pour l'écran et le PDF (`utils/engrenages-moteur.ts`) : rayon = dents / 2 (même
  module pour toutes les roues), phases calculées pour que dent et creux se répondent.
- PDF : légendes en texte Typst posées sous chaque roue (`#place`), pas dans le SVG : le moteur
  SVG de Typst n'a pas nos polices.
- Vérifié à l'écran (`pnpm voir /aide-ecriture/blocs/engrenages --compte prof`, iPhone / Safari) :
  dents engrenées, repères face à face, légendes ; PDF compilé et relu (deux et trois roues).
  Animation : test de composant dans Chromium (`Engrenages.svelte.test.ts`, bouton, compteur,
  phrase finale « après 36 dents : A a fait 3 tours, B a fait 2 tours »).
- Tests : 27 (parseur, moteur dont l'engrènement pour toute parité, Typst avec compilation réelle),
  4 (aller-retour de l'éditeur riche), 3 (écran).
