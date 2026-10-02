---
title: Produit scalaire 1re SPE — questions
date: 2026-10-02
status: en cours (rédaction des modèles)
---

# Produit scalaire 1re SPE — point de reprise

## Commande de David (2026-10-02)

« go pour le produit scalaire ». Aucun modèle de géométrie n'existait. Décisions validées (« ok ») :

1. Pas de repère : coordonnées données dans le texte ; bloc `figure (sans axes ni grille) pour
illustrer. Un repère pour `figure = chantier séparé éventuel (géométrie repérée).
2. `\lVert … \rVert` interdit (sort « lVert » en PDF) ; `\|\vec u\|` fonctionne.
3. Étiquettes de points qui se chevauchent sur une petite figure : l'agent cherche l'option de
   position du DSL ; si elle ne suffit pas, il RAPPORTE avant de toucher geometry-core.
4. Réponses : forme exacte simplifiée (`a\sqrt b`, dénominateur rationnel) annoncée dans l'énoncé ;
   `acceptDecimal` ; `precision` pour les arrondis (longueur au dixième, angle au degré) ; angles en
   degrés (`45`, `45^\circ`, `45°` acceptés ; `\frac{\pi}{4}` refusé).
   Mesuré : `\sqrt{20}` et `\frac{1}{\sqrt2}` = mauvaise forme ; `\frac{-7}{2}`, `\sqrt5\times2` = non optimal.
5. Nouveau thème « Géométrie », domaine « Produit scalaire » : Calculer un produit scalaire,
   Propriétés, Angles et longueurs, Lieux de points (déclaré dans `category-order.ts`).
6. Exclus : loi des sinus, concourance des hauteurs / médianes (approfondissements).

## Modèles (`scripts/questions/produit-scalaire-1spe/`)

À rédiger (~13-14).
