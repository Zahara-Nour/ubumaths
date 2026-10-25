---
title: Atelier — une saisie naturelle dans Calcul (MathLive, sans point)
date: 2026-10-14
status: versé dans docs/systeme/atelier.md (« Réglages et écriture mathématique ») le 2026-10-25, au retrait de /calc
---

# Atelier — une saisie naturelle dans Calcul

Contexte : l'atelier doit remplacer `/calc` ([atelier-progress.md](../../wip/atelier-progress.md)). Inventaire de
`/calc` du 2026-10-13 : il manque à l'atelier la saisie en écriture mathématique (MathLive) dans Calcul,
le clavier virtuel, les étapes d'un calcul simple et un bouton « Copier ». Décisions de David du même
jour : clavier virtuel = celui de MathLive, configuré ; étapes d'un calcul simple : oui ; Copier : oui ;
historique gardé au rechargement : **oui** (option 1, 2026-10-13 : les lignes de Calcul reviennent
au rechargement comme les cartes, PR à part). **Premier chantier : la saisie** (« c'est le plus gros
morceau ») — David ne veut PAS du point devant les commandes : « une écriture la plus naturelle possible ».

## Constats (MathLive 0.111.1, lus dans `node_modules/mathlive/types` et `mathlive.mjs`)

- Un seul champ mélange texte et maths (`\text{…}`) ; bascule manuelle Alt+=.
- `smartMode` devine texte/maths avec une heuristique ANGLAISE (« if x > 0 ») : inutilisable tel quel.
- 385 raccourcis automatiques, dont certains cassent nos mots : `in` → ∈ (« intégrer » → « ∈tégrer »),
  `or` → ∨ (« ordre », « factoriser »), `lim` → gabarit `\lim_{…}` (« limite »), `and`, `nn` → ∩, `mod`.
- Les cartes de valeur lisent déjà les unités dans MathLive : `mathModeSpace = '\,'` garde l'espace,
  `definitionFromField` (`atelier/mathfield.ts`) ramène `\,` et `\min` au texte de Calcul (ADR 0026).
- Le clavier virtuel ne passe pas par `keydown` (seulement `beforeinput` / `input`,
  `DefinitionField.svelte`).
- API utile : `getValue(début, fin, format)`, `position`, `getElementInfo(offset)` (position à l'écran),
  `\placeholder{}` (cases à remplir, Tab pour passer à la suivante), `keydown` en capture.

## Décisions de David (2026-10-13, « je suis tes recos »)

1. **Un seul champ MathLive, aucun mode à choisir, aucun point.** Écriture en maths par défaut.
2. **Le premier mot décide** : une ligne qui commence par un mot du vocabulaire des commandes
   (résoudre, dériver, factoriser, développer, simplifier, variations, limite, intégrer, réciproque,
   domaine, aide… ; accents facultatifs ; formes conjuguées « résous », « dérive ») est une commande ;
   sinon un calcul ou une définition.
3. **Les petits mots** (de, à, en, sur, pour, dans, et, ordre, par) ne sont des mots QUE dans une
   commande (et « sur » après le `=` d'une définition) — jamais dans un calcul.
4. **Un mot devient texte quand il est FINI** (espace, caractère mathématique, ou choix dans la liste),
   pas dès que les lettres correspondent (sinon « de » dans « deriver »). Retour aux maths automatique.
5. **Texte libre** (modalités `fille ; garçon`) : reste dans Données et les cartes au lot 1.
6. **Tournures nominales au lot 2** : « dérivée de f », « limite de f en +∞ », « variations de f »,
   « intégrale de f de 0 à 1 », « image de 3 par f », « antécédents de 4 par f ».
7. **Modèles à trous** : choisir une commande insère « intégrer ▢ de ▢ à ▢ » (`\placeholder{}`) ;
   **onglet « Commandes » du clavier virtuel**.
8. **Unités** : la règle « un nombre, une espace, une unité » reste (même `mathModeSpace` que les
   cartes) ; une unité reconnue s'affiche en romain (5 km). **Conversion naturelle `2,5 h en min`
   au lot 2.**
9. **Complétion** : commandes dès les premières lettres d'une ligne, unités après « nombre + espace » ;
   fonctions et lettres grecques déjà complétées par les raccourcis de MathLive ; déclenchée sur
   `input` (clavier virtuel compris).
10. **Ce qui ne change pas** : le champ produit le texte que lit la chaîne actuelle (`runInput`) ; moteur,
    commandes, rejeu, exports inchangés ; le point reste accepté sans bruit, jamais montré.
11. **Prototype jetable d'abord** (page de test), pour juger la frappe au clavier ; phase 0 ensuite.

## À mesurer au prototype

- Le conflit de l'espace : unité après un nombre, fin de mot après une lettre.
- Les raccourcis MathLive à retirer (liste complète contre le vocabulaire).
- Comment MathLive range un « é » tapé en mode maths.
- ↑/↓ (navigation dans une fraction vs rappel des saisies, liste de complétion).
- Le collage d'un texte brut (« résoudre x^2=4 »).
- Clavier physique ET clavier virtuel ; ordinateur ET téléphone.

## Journal

- 2026-10-13 — inventaire de `/calc` ; décisions 1-11 de David ; historique gardé au rechargement : oui.
- 2026-10-14 — prototype jetable `/test-saisie` (branche `proto/saisie-naturelle`, PR brouillon) :
  les exemples passent par le vrai `CalcDesk` ; mesures : espace, « é », ↑/↓, collage, clavier
  virtuel ; 15 raccourcis retirés, 3 restreints ; `.limite` et `.développer` absents du moteur.
- 2026-10-14 — prototype `/test-saisie` (PR brouillon #1355, jetable). **Décisions de David** :
  (1) PAS de sortie automatique d'une fraction quand on tape un opérateur — le comportement de
  MathLive reste (on sort par → ou Tab) ; (2) **créer les commandes `limite` et `développer`** ;
  (3) liste ouverte : **Entrée calcule, Tab choisit** (comme pour les fonctions aujourd'hui).
- 2026-10-14 — prototype mergé (#1355) et en production (v0.31.0, www.chiph.re/test-saisie) pour les
  essais de David sur téléphone ; historique de Calcul gardé au rechargement MERGÉ (#1356, liste blanche
  `safe-latex.ts`, deux audits de sécurité). `.limite` créée par une autre session ; reste `développer`.
- 2026-10-14 — **demande de David** : une fenêtre de réglages où l'élève choisit la saisie de Calcul,
  texte (l'actuelle) ou MathLive. Change la décision 1 (« aucun mode à choisir ») : le mode texte
  reste. Phase 0 : [atelier-reglages-phase0.md](atelier-reglages-phase0.md).
