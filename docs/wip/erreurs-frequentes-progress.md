# Chantier `erreurs-frequentes` — erreurs fréquentes d'une question / d'un point (P4, E4)

Ouvert le 2026-11-14. Besoins P4 (prof) et E4 (élève) validés par David le 2026-11-11
([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de suivi
validés ») ; suite directe de P6 ([`bilan-controle-progress.md`](../archive/wip/bilan-controle-progress.md),
Q4 : « clic sur une question = P4 »). David : « ok pour P4 / E4 ».

## Reprendre ici

_Mis à jour le 2026-11-14, ouverture._

- **État** : phase 0 écrite (ci-dessous), aucun code · **Prochaine action** : réponses de David à Q1-Q5, puis tests rouges de la PR 1 · **En attente de David** : Q1-Q5 · **Pièges en cours** : aucune trace de série n'a encore de réponse en prod (0 ligne `answer_parts`) ; seuls les contrôles ont des réponses (101, dont 44 fausses, 20 modèles) · **Worktree / branche** : `../ubumaths-wt-erreurs-frequentes` · `feat/erreurs-frequentes`

## Ce qui existe (vérifié le 2026-11-14)

- **Contrôles** : `test_answers` garde, par question, l'**énoncé tiré entier** (`question_instance`, réponses
  attendues comprises), la réponse de l'élève case par case (`user_answer.value`), `is_correct`, `points`,
  `status` (juste / partiel / faux / sans réponse). Pas de verdict par case stocké : il est recalculé à la
  relecture d'une copie (`readSubmittedCopy`). Chaque élève a **sa** graine : les valeurs diffèrent d'un élève
  à l'autre.
- **Séries** (Saisie, Contrôle blanc, Course) : `skill_attempts.answer_parts` + `part_verdicts` + `seed`
  (ADR 0038). Flash-cards et révisions : rien de tapé, donc rien à montrer.
- **Bilan P6** (`getEvaluationBreakdown`, `EvaluationBreakdown.svelte`) : une ligne par modèle ; clic = rien.
- Décision déjà prise (2026-11-11) : les erreurs fréquentes d'une **série** ne regroupent que les traces
  **postérieures à la dernière modification du modèle** (graine + modèle modifié = relecture fausse).

## Le problème de fond

Les tirages sont aléatoires : deux élèves ratent « la même » question avec des nombres différents. Regrouper
les réponses fausses **identiques** n'a donc de sens qu'à énoncé identique. Deviner le **type** d'erreur
(signe, oubli du carré…) serait un autre chantier (moteur mathAST) : hors périmètre.
Ce qui reste comparable d'un tirage à l'autre : **quelle case** est ratée, et chaque réponse lue **face à
son énoncé**.

## Phase 0 — comportements proposés

### PR 1 — prof, bilan d'un contrôle : clic sur une question

- **Nominal** : sur la page résultats d'un contrôle, chaque ligne « par question » du bilan s'ouvre. On y voit :
  1. **cases ratées** (question à plusieurs cases) : « case 1 : 2 erreurs sur 12 · case 2 : 9 sur 12 » ;
  2. **les réponses fausses ou partielles**, une par copie comptée (même règle que P6 : meilleure copie) :
     l'énoncé tiré (rendu comme à l'élève), la réponse attendue, la réponse de l'élève (texte échappé, la case
     ratée marquée), le nom de l'élève ;
  3. réponses **identiques à énoncé identique** regroupées : « 3 élèves ont répondu 12 ».
- **Limites** : question juste pour tous → « Aucune erreur sur cette question. » ; « sans réponse » compté à
  part, sans ligne vide ; QCM / ranger / figure à compléter : le choix de l'élève lu comme à la correction
  (libellé du choix, ordre affiché), la figure seulement par son verdict ; modèle sorti de la série : s'ouvre
  aussi ; **mode test** suivi comme dans P6.
- **Erreur** : lecture en échec → le panneau le dit, le reste de la page reste.
- **Pas de mode projection** sur la page résultats (vérifié) : rien à masquer de plus que P6.

### PR 2 — prof, par point du programme (analytique de la classe)

- **Nominal** : depuis « Top à remédier » (widget E, fenêtre des élèves concernés), un onglet « Erreurs » :
  pour chaque modèle du point, mêmes blocs que la PR 1, à partir des **traces de séries** (Saisie, Contrôle blanc,
  Course) **et** des réponses de contrôle de la classe.
- **Limites** : traces antérieures à la dernière modification du modèle écartées (déjà décidé) ; aucune réponse
  tapée → « Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de réponse). »
- **Erreur** : comme la PR 1.

### PR 3 — élève, « mes erreurs récurrentes » (E4)

- **Nominal** : une liste des modèles que l'élève **rate encore** : au moins 2 échecs, dont le **dernier essai**
  raté. Pour chacun : son dernier énoncé raté, sa réponse face à la bonne, un bouton « M'entraîner » vers ce
  modèle. Un modèle réussi au dernier essai sort de la liste.
- **Limites** : aucune comparaison avec la classe, aucun compte d'échecs affiché (« à revoir », pas
  « raté 7 fois »), aucune notification ; réponses de contrôle comprises seulement après la date limite ou
  quand la copie est consultable.
- **Erreur** : lecture en échec → message, la page reste.

## Questions à David (phase 0)

- **Q1 — Découpage** : trois PR dans l'ordre ci-dessus (contrôles d'abord : ce sont les seules réponses
  qui existent en prod aujourd'hui) ? Ou seulement la PR 1 pour l'instant ?
- **Q2 — Nominatif** : dans la PR 1, le prof voit-il **qui** a répondu quoi (proposé), ou seulement les
  réponses sans nom ?
- **Q3 — Regroupement** : regrouper seulement les réponses identiques **à énoncé identique** (proposé),
  et montrer le reste une par une ?
- **Q4 — Où, pour E4** : sur quelle page élève (« Progression », « Notions », une rubrique à part) ?
- **Q5 — « Récurrente »** : au moins 2 échecs, dont le dernier essai (proposé) ? Autre seuil ?

## Historique

- 2026-11-14 : ouverture, état des lieux, phase 0 écrite.
