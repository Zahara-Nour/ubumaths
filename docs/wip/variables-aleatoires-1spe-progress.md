---
title: Variables aléatoires 1re SPE — questions
date: 2026-10-02
status: en cours (rédaction des modèles)
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

À rédiger (~14-16).
