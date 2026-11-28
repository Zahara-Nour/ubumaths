---
status: clos le 2026-11-19 (#2890)
---

# Chantier `parcours-serie` — vue « Parcours » d'une série dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-11-19, après #2890._

- **État** : clos — parcours d'une série en `/dev/modeles` mergé (#2890) ; le durable est dans
  `docs/systeme/questions.md` (« Parcours d'une série ») · **Prochaine action** : aucune ·
  **En attente de David** : rien · **Pièges en cours** : série d'essai en base LOCALE seulement
  (`6411f128`) · **Worktree / branche** : supprimés

## But

Tester une série : la progression est-elle juste, manque-t-il des modèles intéressants, un modèle
à plusieurs variations devrait-il être scindé, en voyant les cartes telles que les élèves les voient.

## Décisions (phase 0 validée par David le 2026-11-19)

- **Remodeler `/dev/modeles`**, pas de nouvelle page : un affichage « Parcours » quand une série est
  choisie, par défaut ; « Fiches » (l'affichage d'avant) reste, `&vue=fiches` dans l'adresse.
- En tête : titre, nombre de questions, durée totale, choix de rendu (Flash-card / Contrôle blanc /
  En classe) commun à toutes les cartes, « ↻ tout retirer ».
- Une rangée par modèle dans l'ordre de la série : rang, titre, « × 2 · 1 min 30 », statut, verdict ;
  une carte élève par variation, côte à côte, chacune avec son « ↻ » ; verdict + commentaire
  dessous ; lien « fiche complète ».
- Sous la série : « Ailleurs dans les mêmes notions » (modèles des mêmes **notions** — l'étage au-dessus
  de la sous-notion —, **du niveau de la série seulement**, absents de la série), puis « Points sans
  aucun modèle » (points du niveau de la série dans ces notions, aucun modèle tagué). Bloc vide :
  « Rien d'autre dans ces notions ».
- Limites : série vide ; modèle introuvable (rangée grise) ; 6 variations et plus → la rangée défile ;
  écran étroit → cartes sous le titre ; série longue → cartes dessinées à l'arrivée à l'écran.
- Erreurs : variation qui ne se génère pas → erreur dans sa carte ; verdict non enregistré → toast,
  verdict inchangé ; série inconnue → message.

## Mesures (prod, lecture seule, 2026-11-19)

- Arbre : branche « Géométrie » > notion « Figures planes » > sous-notion « médiatrice et
  bissectrice ». La notion = 2e étage du chemin d'un nœud.
- Série médiatrice (`756deb56`, niveau `6`) : 6 modèles ; 20 modèles de 6e dans « Figures planes »
  (donc 14 ailleurs) ; 17 points de 6e, tous avec un modèle.

## Journal

### 2026-11-19

- Phase 0 écrite et validée ; worktree ouvert.
- Code + tests (11 sur les fonctions, 1 sur `QuestionPreviewTabs` en `bare`) ; serveur de test sur
  la branche (`:10000` → 5179).
- Retours de David : arbre des programmes repliable (fait) ; en sombre, cartes noyées dans la
  rangée (même fond `card`) → plateau plus sombre sous les cartes (fait, « c'est bien »).
- Piège : `$app/environment` est déprécié (kit 3) → `$app/env`, sinon typecheck en erreur.
- #2890 mergé (CI verte, revue `code-reviewer` : 2 mineurs corrigés). Journal archivé.
