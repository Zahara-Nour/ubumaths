# Chantier `automaths` — ergonomie du catalogue Automaths

## Reprendre ici

_Mis à jour le 2026-11-18, choix validés, avant la PR 1._

- **État** : recherche faite, **les 8 choix sont validés par David (2026-11-18)** : ce sont mes recommandations, telles quelles (historique ci-dessous). Rien de codé. Page : [automaths-recherche-ui.html](automaths-recherche-ui.html), https://claude.ai/artifact/SCczsfi9ayGXjioFtsQq2R.
- **Prochaine action** : créer le worktree `../ubumaths-wt-automaths` (branche `feat/automaths-catalogue`), puis PR 1 « correctifs immédiats » : aperçu de série qui ne masque plus « Ajouter », sans clignotement ; retrait depuis la grille (bouton + / ✓) ; notion gardée dans l’adresse. Phase 0 (comportements en français) à présenter avant de coder. Puis PR 2 recherche, PR 3 navigation (arbre des notions + bascule programme), PR 4 série en cours.
- **En attente de David** : rien.
- **Pièges en cours** : la tuile reste la flash-card (décision du 2026-09-29) ; plusieurs points désignent le même nœud (4-021, 4-075, 4-023 → Calcul littéral) ; un point posé sur une notion peut n’avoir aucune question en propre (4-003) → inclure ses sous-notions ; le panier détaillé `/automaths/panier` ne change pas.
- **Worktree / branche** : aucun encore.

## Historique

### 2026-11-18 — recherche

- Mesures prod (lecture seule) : 2 454 modèles publiés, 17 branches non vides sur 19, jusqu'à 21 notions (Géométrie) et 88 sous-notions (Nombres et calculs) par branche ; 4 modèles par sous-notion en médiane, 56 au plus.
- Constaté en prod sur téléphone : 16 onglets de notions sur 9 lignes ; le bouton flottant du panier masque « Ajouter au panier » et clignote en permanence.
- Autres constats : aucune recherche ; sous-notions fermées, sans compteur ; retrait du panier impossible depuis la grille ; l'adresse ne garde que le niveau.
- Proposition : barre fixe (recherche + niveau), thèmes en liste à compteurs (colonne / panneau du bas), sous-notions en pastilles qui défilent, sections dépliées avec aperçus calculés à l'approche, série en cours visible selon l'écran.
- Roue (cercle de parts), étudiée à la demande de David : à parts proportionnelles, Thalès a 16 px et Pythagore 9 px sur une roue de téléphone ; deux étages au plus. Avis : vue d'ensemble facultative au mieux.
- Arbre du programme : les 2 762 points (tous niveaux) ont un `node_id` ; presque tous ont des questions (exception T_EXP : 13 sur 176). Avis : deuxième façon de parcourir, dès qu'un niveau est choisi.
- Découpage proposé : PR 1 correctifs immédiats · PR 2 recherche · PR 3 navigation · PR 4 série en cours.

### 2026-11-18 — recommandations, validées par David le jour même

1. Recherche et arbre visibles ensemble, sans focus automatique (clavier du téléphone).
2. Niveau non obligatoire ; « Tous » à la 1re visite, puis le dernier niveau retenu.
3. Série : colonne ≥ 1 280 px, panneau en dessous, barre en bas sur téléphone ; libellé « Ma série » (CONTEXT.md).
4. Sous-notions toutes dépliées + pastilles.
5. Cartes plus basses sur téléphone seulement.
6. Programme : bascule en plus de l’arbre des notions, par défaut dès qu’un niveau est choisi.
7. Questions montrées sous chaque point (✓ partout) ; point posé sur une notion → questions des sous-notions incluses.
8. Roue abandonnée pour l’instant.

Le panier détaillé `/automaths/panier` reste inchangé (durées, répétitions, PDF, enregistrement, lien, lancement) ; le catalogue n’en montre qu’un aperçu.
