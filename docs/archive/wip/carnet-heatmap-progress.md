---
status: clos
---

# Heatmap de régularité dans le carnet de liaison — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-18, chantier clos._

- **État** : clos. #2786 (affichage, v0.94.0) et #2797 (`carnet_payload` depuis la rentrée, migration en prod) livrés ; vérification manuelle faite par David le 2026-11-18 (page du parent et « Mon carnet », serveur Tailscale sur la base locale).
- **Prochaine action** : aucune. Doc durable : `docs/systeme/carnet-de-liaison.md`.
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : supprimés.

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

## Phase 0 — comportements (validés par David le 2026-11-17 : « je valide »)

Lu dans le code le 2026-11-17 : `carnet_payload` (dernière version :
`20261117113154_carnet_arrivee_en_cours_d_annee.sql`), `CarnetView.svelte`,
`RegularityTable.svelte`, `$lib/validation/carnet.ts`.

### Nominal

- **N1** : le parent (lien) et l'élève (« Mon carnet ») voient la même carte « Régularité » :
  une rangée de cases, une par semaine, de la semaine de la rentrée (ou de l'arrivée de l'élève,
  Q43) à la semaine en cours, la plus ancienne à gauche, comme une ligne de la grille du prof.
- **N2** : même rendu que `RegularityTable` : une couleur (l'accent) en quatre intensités, mois
  au-dessus de la première semaine de chaque mois, trait sous les semaines de vacances, légende.
- **N3** : appui, survol ou clavier sur une case → « semaine du 3 nov. : 2 à 3 jours de travail »
  en toutes lettres, jamais le nombre exact (Q25).
- **N4** : sur téléphone (≈ 40 cases × 16 px = 640 px), la rangée défile horizontalement et
  **s'ouvre calée à droite** : la semaine en cours visible d'emblée.
- **N5** : seule la régularité s'allonge. Les **évaluations gardent leur fenêtre de 5 semaines**
  (Q14), et les courriels sur exception ne changent pas.

### Limites

- **L1** : semaine de la rentrée ou de l'arrivée → une seule case.
- **L2** : élève dans plusieurs classes au carnet → depuis la plus ancienne arrivée (règle Q43 actuelle).
- **L3** : école sans année scolaire connue → aujourd'hui `v_first_day` nul, `greatest` l'ignore,
  la fenêtre reste bornée par les 5 semaines. Sans elle, la profondeur serait infinie : dans ce
  cas on **garde 5 semaines** (aucune classe de la prod n'est concernée, mesuré le 2026-11-16).
- **L4** : borne dure de 53 semaines (Zod et SQL), même si une année était mal saisie.
- **L5** : semaine en cours à 0 → case vide comme les autres (plus de « Pas encore de travail
  cette semaine » à part).

### Erreur

- **E1** : réponse SQL hors forme (plus de 53 semaines, palier inconnu) → Zod refuse, la page
  montre l'erreur du carnet comme aujourd'hui, rien de partiel.

### Piège trouvé : l'ordre des PR s'inverse

`carnetSchema.weeks` est en `.max(5)`. Si la migration passait la première, elle serait appliquée
au merge (`db:migrate`) alors que le code en prod (Zod `.max(5)`) n'est livré qu'au prochain
`deploy:prod` : **le carnet de tous les parents tomberait en erreur** entre les deux. Et
`db:types` n'est pas en jeu : la fonction rend toujours un `jsonb`, la signature ne change pas.

## Découpage (validé le 2026-11-17)

1. **PR 1 — affichage** : Zod `.max(53)` ; `CarnetView` passe à la rangée de cases (réutilise
   `RegularityTable`, un seul « élève ») ; marche avec 5 semaines comme avec 40 ;
   `e2e/verifs/carnet.spec.ts` (`li[data-level]` × 5) refait. Puis `deploy:prod` (David).
2. **PR 2 — migration**, seulement après ce `deploy:prod` : `carnet_payload` rend les paliers
   depuis la rentrée / l'arrivée (évaluations : fenêtre de 5 semaines gardée) ; tests
   d'intégration rouges sans la migration ; ADR 0040 mis à jour ; captures refaites.

## Questions de phase 0 (tranchées le 2026-11-17 : recommandations validées)

- **Q1 — vocabulaire** : le carnet dit « jours de travail », la grille du prof « jours actifs ».
  `RegularityTable` prend une prop de libellé : le carnet garde « jours de travail » (recommandé :
  un parent ne connaît pas « jour actif »), la grille du prof ne bouge pas.
- **Q2 — en-tête de la rangée** : la grille du prof met le nom de l'élève à gauche. Dans le
  carnet, le prénom est déjà en titre de page : **pas de colonne de nom** (recommandé).

## Journal

- 2026-11-17 : phase 0 validée (ordre inversé, Q1 « jours de travail », Q2 sans colonne de nom). Worktree ouvert pour la PR 1.
- 2026-11-17 : PR 1 #2786 mergée (CI verte, `code-reviewer` : rien de bloquant).
- 2026-11-17 : PR 2. **L3, prémisse corrigée** : `carnet_school_year` ne rend jamais une rentrée nulle (à défaut, le 1er septembre écoulé, sans année) ; la décision « année inconnue → 5 semaines » est appliquée sur `year_id` nul (classe sans école ou école sans année active), comme l'alerte d'inactivité. Évaluations : `v_start` (5 semaines) inchangé, régularité sur `v_weeks_start`. e2e : le compte de cases suit l'arrivée de A (il y a 30 jours : 5 ou 6 selon le jour).
- 2026-11-18 : #2797 mergée (CI verte ; `code-reviewer` : e2e fragile en septembre corrigé, rentrée lue dans le décor ; `security-auditor` : rien de bloquant). `db:migrate` laissé à David (autre migration en attente).
- 2026-11-18 : migration trouvée déjà en prod (`db push` d'une autre session), vérifiée par le MCP. Vérification manuelle de David OK (lien de parent et « Mon carnet », téléphone et ordinateur). Chantier clos, journal archivé.
