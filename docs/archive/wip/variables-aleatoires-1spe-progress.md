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

## Défauts moteur relevés (non corrigés, contournés ; cf. `docs/pratiques/fiches-exercices.md`)

`%` et `or` refusés dans une condition ; `{{eval:E;();d}}` fait échouer la génération ; variable
calculée sans `eval` substituée sans parenthèses ; `{{eval:sqrt(21/25)}}` rendu `\dfrac{1}{5}\sqrt{21}` ;
`1,136` pour un arrondi au centième jugé « incorrect » sans message de forme ; `x_i` → `x_\imaginaryI` ; pas de `sign()` dans `eval` ; `;d;()` échoue aussi.

## Élargissement de la variété des énoncés (2026-10-02, « occupe-toi des points pédagogiques »)

Mesure : énoncés distincts sur 150 tirages par variation. Tout ce qui était sous ~40 a été élargi
(avant → après) : A-03 v2 9 → 60 (somme de deux dés : `X = k`, `X ≤ k`, `X ≥ k`, `X < k`, `X > k`,
`a ≤ X ≤ b` ; tableau des effectifs par somme dans le corrigé) ; A-03 v3 NOUVELLE, dé tétraédrique +
dé cubique (46) ; A-04 v1 22 → 71 (urne jusqu'à 12 boules, `P(X ≥ 1)` ou `P(X ≤ 1)`) ; A-04 v2
30 → 89 (`P(X = k)`, k = 0, 1 ou 2) ; A-06 v2 5 → 106 (dés à 4/6/8/10/12/20 faces, événement tiré) ;
A-07 v1 : réponses 7 → dénominateurs 20/24/30 ; B-02 v1 23 → 58, v2 33 → 103 (jeu de 32 ou 52
cartes) ; B-03 21/23/26 → 73/124/121 (espérance négative « perd en moyenne », heure tirée, dé à
n faces) ; C-02 v0 20 → 63, v2 40 → 81. Pluriels corrigés (« 1 boule noire », « 1 point »).
Specs vertes (115), 3 450 tirages recalculés en Python par énumération des issues : 0 écart, lois
de somme 1, aucun `imaginaryI`, `{{` ni NaN. Variations non touchées : déjà ≥ 46 énoncés.

## cleanCoefficients activé (2026-10-03)

- **B-07 v0** (`Y = aX + b`) : option activée, `abs(a) >= 2` → `a != 0` (Y = X + 1, Y = −X + 6).
  53 tirages sur 300 à a = ±1. Gardés : b ≠ 0 (le piège « la constante n'est pas multipliée »
  disparaîtrait), a ≠ 0 (Y constante). Le calcul `E(Y)=1\times(-3,1)+1` reste écrit (étape de
  substitution voulue) et « seul E(X) est multiplié par 1 » reste vrai. v1 / v2 non touchées
  (prix et gain par cible : p = 1 € ferait écrire « sans les multiplier par 1 » et `\dfrac{…}{1}`).
- **Sans objet** : A-06 (b, c, d distincts entre eux ET de 1, coefficient de la première case `p`),
  A-07 (k = 1 rendrait « P = 1 × P » trivial), A-04 / probabilités (étiquettes d'arbre).
- Préexistant, non touché : B-04 / B-05 écrivent `V(X)=1.2+0+1.2` et `0.6 - 0^2` (calcul voulu).
- Vérifs : 300 tirages/variation, 0 motif interdit ; recalcul Python 0 écart ; 5 specs ajoutées,
  vertes (21) ; PDF regardé.
