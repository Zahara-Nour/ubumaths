---
title: Variables aléatoires 1re SPE — questions
date: 2026-10-02
status: 17 modèles en brouillon (2026-10-02)
---

# Variables aléatoires 1re SPE — point de reprise

## Commande de David (2026-10-02)

Thème suivant après probabilités conditionnelles. Aucun modèle n'existait. Décisions validées (« Ok ») :

1. Trou dans une cellule de tableau NON saisissable (`StaticBlockNode`, tableau = bloc sans trou) →
   la loi est affichée en tableau, la question est posée SOUS le tableau (« $P(X=3)=$ ? »).
2. `x_i` est rendu `x_\imaginaryI` (le `i` devient l'unité imaginaire) → écrire `x_k` dans les modèles.
   Aucun modèle en prod touché (mesuré : 0 texte). Défaut moteur non corrigé.
3. E(aX+b), V(aX+b) exclus (Terminale) — à vérifier contre le BO par l'agent.
4. Variance : définition Σ p_k (x_k − E)² dans la correction, König-Huygens en remarque.
5. Réponses en fraction irréductible + `acceptDecimal` ; σ exact (`\frac{\sqrt a}{b}`) ou arrondi
   au centième (`precision`), forme annoncée dans l'énoncé (`\sqrt{0,84}` refusé si `\frac{\sqrt{21}}{5}` attendu).
6. Thème « Probabilités », domaine « Variables aléatoires » : Loi d'une variable aléatoire, Compléter
   une loi, Espérance, Variance et écart-type, Jeux et gains (déclaré dans `category-order.ts`).
7. Variations = autres formulations/contextes, en FRANÇAIS (pas de FR/EN : c'était une confusion
   avec les fiches).

## Modèles (`scripts/questions/variables-aleatoires-1spe/`)

| Lot | Sous-domaine (fichiers)                                                                          |
| --- | ------------------------------------------------------------------------------------------------ |
| A   | Loi d'une variable aléatoire (A-01 à A-04, dont arbre pondéré) ; Compléter une loi (A-05 à A-07) |
| B   | Espérance (B-01 à B-03, dont QCM d'interprétation) ; Variance et écart-type (B-04 à B-06)        |
| C   | Jeux et gains (C-01 gain moyen, C-02 mise équitable)                                             |

**15 modèles créés en BROUILLON en production le 2026-10-02.** Chacun : `question:specs` vert
(175 specs), 150 tirages par variation (7 050 instances) recalculés en Python (`Fraction`, arrondi
moitié loin de zéro ; lois de somme 1 ; V par définition = König-Huygens) ; arbres lus comme
`probability-tree` ; aucun `imaginaryI` ni `{{` résiduel ; PDF compilés 4/4 (compilateur de prod),
pages relues. Espace insécable avant « € ».

## Ajout après la PR #658 (« oui » de David, 2026-10-02)

Décision 3 était FAUSSE : la linéarité de l'espérance (`1SPE-159`) est au programme de 1re ;
V(aX+b) n'y est pas. Ajoutés en brouillon : `B-07-linearite-esperance` (E(aX+b), 3 variations,
dont une inverse) et `C-03-jeu-favorable-equitable` (QCM favorable / équitable / défavorable, ordre
fixe, index piloté par le signe de E(G) ; cas équitable 29 à 34 % des tirages). Specs 16/16 et
18/18, 450 tirages chacun recalculés en Python (0 écart), PDF 4/4. Correction du QCM : le raccourci
« sommes reçues − mise » (juste mais non expliqué) a été retiré.

## Défauts moteur relevés (non corrigés, contournés ; cf. `docs/ref/fiches-exercices.md`)

`%` et `or` refusés dans une condition ; `{{eval:E;();d}}` fait échouer la génération ; variable
calculée sans `eval` substituée sans parenthèses ; `{{eval:sqrt(21/25)}}` rendu `\dfrac{1}{5}\sqrt{21}` ;
`1,136` pour un arrondi au centième jugé « incorrect » sans message de forme ; `x_i` → `x_\imaginaryI` ; pas de `sign()` dans `eval` ; `;d;()` échoue aussi.
