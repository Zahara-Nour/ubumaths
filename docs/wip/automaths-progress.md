# Chantier `automaths` — ergonomie du catalogue Automaths

## Reprendre ici

_Mis à jour le 2026-11-18, avant toute PR (phase de recherche)._

- **État** : recherche faite, rien de codé. Page de synthèse : [automaths-recherche-ui.html](automaths-recherche-ui.html), publiée sur https://claude.ai/artifact/SCczsfi9ayGXjioFtsQq2R (diagnostic, sources, maquettes ordinateur/tablette/téléphone, roue, arbre du programme).
- **Prochaine action** : attendre les réponses de David aux 8 questions de la section « Ce que tu dois trancher » de la page ; la PR 1 (correctifs immédiats) n'en dépend pas et peut partir sur un go.
- **En attente de David** : les 8 choix (recherche ou arbre d'abord, niveau obligatoire, place de la série, sous-notions dépliées, hauteur des cartes, parcours par le programme, points qui partagent une notion, sort de la roue).
- **Pièges en cours** : la tuile reste la flash-card (décision du 2026-09-29, ne pas la remettre en cause) ; plusieurs points du programme désignent le même nœud (4-021, 4-075, 4-023 → Calcul littéral) ; un point posé sur une notion peut n'avoir aucune question en propre (4-003).
- **Worktree / branche** : aucun pour l'instant (travail doc sur `main`) ; créer `../ubumaths-wt-automaths` au premier code.

## Historique

### 2026-11-18 — recherche

- Mesures prod (lecture seule) : 2 454 modèles publiés, 17 branches non vides sur 19, jusqu'à 21 notions (Géométrie) et 88 sous-notions (Nombres et calculs) par branche ; 4 modèles par sous-notion en médiane, 56 au plus.
- Constaté en prod sur téléphone : 16 onglets de notions sur 9 lignes ; le bouton flottant du panier masque « Ajouter au panier » et clignote en permanence.
- Autres constats : aucune recherche ; sous-notions fermées, sans compteur ; retrait du panier impossible depuis la grille ; l'adresse ne garde que le niveau.
- Proposition : barre fixe (recherche + niveau), thèmes en liste à compteurs (colonne / panneau du bas), sous-notions en pastilles qui défilent, sections dépliées avec aperçus calculés à l'approche, série en cours visible selon l'écran.
- Roue (cercle de parts), étudiée à la demande de David : à parts proportionnelles, Thalès a 16 px et Pythagore 9 px sur une roue de téléphone ; deux étages au plus. Avis : vue d'ensemble facultative au mieux.
- Arbre du programme : les 2 762 points (tous niveaux) ont un `node_id` ; presque tous ont des questions (exception T_EXP : 13 sur 176). Avis : deuxième façon de parcourir, dès qu'un niveau est choisi.
- Découpage proposé : PR 1 correctifs immédiats · PR 2 recherche · PR 3 navigation · PR 4 série en cours.
