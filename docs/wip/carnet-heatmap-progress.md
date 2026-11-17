---
status: phase-0
---

# Heatmap de régularité dans le carnet de liaison — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-17, ouverture du chantier._

- **État** : décisions D1 et D2 prises par David (ci-dessous) ; rien de codé.
- **Prochaine action** : phase 0 : comportements (nominal / limite / erreur) à faire valider, puis découpage en deux PR (migration de la fonction SQL du carnet, puis affichage).
- **En attente de David** : la validation de la phase 0 (pas encore écrite).
- **Pièges en cours** : `db:types` génère depuis la prod → la migration d'abord, mergée et appliquée, puis le code. ADR 0040 à mettre à jour (« 5 semaines » → « depuis la rentrée »).
- **Worktree / branche** : aucun.

---

## Origine

Relecture des captures du carnet (chantier `capture-courriels`, #2771), le 2026-11-17. Sur la
page du parent et sur « Mon carnet », la régularité est montrée en 5 lignes de 3 barres (une par
semaine). David : « pour la régularité, tu n'as pas fait une heatmap comme pour le dashboard ? ».
La heatmap dont il parle est la **grille de régularité du prof** (`ClassRegularityGrid` /
`RegularityTable`, onglet analytique de la classe et fiche élève) : élève × semaine depuis la
rentrée, une case colorée par palier (aucun, 1 jour, 2 à 3, 4 ou plus), vacances marquées. Même
règle de comptage que le carnet (`class_regularity_weeks` : un jour compte à 5 réponses en travail
personnel, contrôles exclus).

## Décisions

- **D1 — Rendu (David, 2026-11-17)** : l'élève voit la heatmap dans « Mon carnet », et le parent
  « la même, c'est plus facile à lire et cohérent avec le reste ». Une rangée de cases, une par
  semaine, comme une ligne de la grille du prof. Toujours des paliers par semaine : jamais un
  jour, jamais une note (Q25 du chantier `partage-parents` tient).
- **D2 — Profondeur (recommandation de Claude, David : « je valide »)** : depuis la rentrée de
  l'année scolaire active, ou depuis l'arrivée de l'élève dans la classe si elle est plus tardive
  (Q43) ; jamais au-delà de l'année scolaire (le lien expire le 31 août). Écarté : 5 semaines (pas
  de tendance visible), trimestre en cours (repart à zéro trois fois par an).
- **Question d'accès (posée avant tout SQL, réponse de David : « je valide »)** : le détenteur
  d'un lien de parent pourra lire les paliers de régularité de l'élève **depuis la rentrée** au
  lieu des 5 dernières semaines. Rien d'autre ne s'ouvre : ni les jours, ni les notes, ni un autre
  élève.

## Découpage (à valider en phase 0)

1. PR 1 — migration : `carnet_payload` rend les paliers depuis la rentrée / l'arrivée ; tests
   d'intégration rouges sans la migration ; ADR 0040 mis à jour.
2. PR 2 — affichage : `CarnetView` (parent et élève) réutilise la rangée de `RegularityTable` ;
   `e2e/verifs/carnet.spec.ts` (aujourd'hui `li[data-level]` × 5) et captures à refaire.

## Journal
