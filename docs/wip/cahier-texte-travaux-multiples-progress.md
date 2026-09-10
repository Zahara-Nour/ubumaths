# Cahier de texte — plusieurs travaux à faire par séance

> Doc de progression (crash-recovery). Branche : `feat/cahier-texte-travaux-multiples`.

## Le besoin

Dans « Travail à faire », pouvoir écrire **plusieurs travaux avec des échéances
différentes**. Chaque échéance doit être une date **où la classe a effectivement
cours** — donc lue dans l'emploi du temps, vacances scolaires retirées.

Aujourd'hui une séance ne porte qu'un travail : les colonnes
`class_journal_entries.homework_content` et `homework_due_date`, la date étant
saisie librement, sans aucun contrôle.

## Décisions prises avec David (2026-09-10)

| Sujet              | Décision                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stockage           | Table enfant `journal_entry_homework` (1 ligne = 1 travail)                                                                                                                                                                    |
| Anciennes colonnes | **Conservées**, inertes. Suppression = migration dédiée plus tard                                                                                                                                                              |
| Échéance vide      | Veut dire « le prochain cours » → **résolue par le serveur**, jamais stockée NULL (sauf classe sans emploi du temps)                                                                                                           |
| Vacances           | **Exclues** des dates proposées (`school_holidays` de l'année scolaire de l'école)                                                                                                                                             |
| Point de départ    | Les échéances se comptent depuis **la date de la séance**, pas depuis aujourd'hui — sinon on ne peut pas remplir en retard le cahier d'une séance passée avec sa vraie échéance. Une date déjà passée sera marquée « (passé) » |

### Question d'accès (tranchée)

**Personne ne lit rien de nouveau.** Un travail est lisible par qui lit déjà la
séance : prof/admin tout ; élève de la classe si la séance est publiée **et** sa
date passée ; lien de partage via la fonction `SECURITY DEFINER` existante ;
`anon` sans lien, rien.

## État des lieux en production (2026-09-10)

- **1 seule séance** en base, **aucune** avec du travail → aucune donnée à migrer.
- **3 classes actives sur 4 n'ont AUCUN emploi du temps** (`1SPE 2`, `1SPE-TEST`,
  `2DE 3`). Seule `1SPE 1` en a un : jeudi, deux heures consécutives (donc **deux
  lignes** `class_schedules` pour le jour 4 — la déduplication n'est pas
  théorique). Le repli « classe sans emploi du temps → champ date libre » est
  donc le cas **majoritaire**, pas un cas limite.
- Vacances renseignées pour 2026-2027 (Blaise Pascal) : Toussaint, Noël, Hiver,
  Printemps.

## Découpage

- [x] **Phase 1 — socle** : migration, module de calcul des dates, tests
- [x] **Phase 2 — serveur** : CRUD, Zod, couverture programme, citations de fiches
- [x] **Phase 3 — UI prof** : la liste de travaux dans « Travail à faire »
- [x] **Phase 4 — UI élève + vue publique + lien de partage**
- [ ] **Phase 5 — revue** : `code-reviewer`, `security-auditor`, `check:incremental`, PR

## Phase 1 — fait

**`src/lib/utils/class-sessions.ts`** — calcul pur, sans Supabase : jours de
l'emploi du temps moins les vacances, strictement après la date de la séance,
jusqu'à la fin de l'année scolaire, plafonné à 30 dates.

- Tout est manipulé **en UTC** (`getUTCDay`, `Date.UTC`). Mélanger `new Date('…')`
  (qui parse en UTC) et `getDay()` (qui lit en local) décale d'un jour à l'ouest
  de Greenwich, et transformerait un jeudi en mercredi.
- `isSessionDate()` rejoue la règle **sans le plafond** : le menu est tronqué à
  30 dates, la règle ne l'est pas — sinon un devoir posé loin dans l'année serait
  refusé à l'enregistrement alors qu'il tombe bien un jour de cours.

**`src/lib/server/class-sessions.ts`** — lecture base : `class_schedules` +
`classes.school_id` → `school_years` (celle qui **contient** la date de la
séance) → `school_holidays`. **Lève** en cas d'erreur base au lieu de rendre un
calendrier dégradé : un emploi du temps illisible qui deviendrait « pas d'emploi
du temps » ouvrirait le champ date libre, et le professeur poserait une échéance
un jour sans cours — exactement ce que ce module existe pour empêcher.

**`supabase/migrations/20260910110000_journal_entry_homework.sql`** — table +
index + trigger `updated_at` + RLS (2 policies, cf. question d'accès) + REVOKE
`anon` + fonction d'écriture atomique + mise à jour de la fonction de partage.

- La règle « l'échéance est un jour de cours » **n'est pas** une contrainte SQL :
  elle dépend de tables qui changent, et un trigger rendrait une ligne valide
  impossible à modifier le jour où le professeur déplace un cours.
- `set_journal_entry_homework(entry_id, items)` en **SECURITY INVOKER** :
  remplacer la liste = DELETE + INSERT, et le client Supabase n'a pas de
  transaction — un échec réseau entre les deux effacerait le travail sans le
  réécrire.
- ⚠️ Deux policies SELECT permissives se combinent en **OU** : celle des élèves
  élargit, elle ne restreint pas.

**Tests** : `src/lib/utils/__tests__/class-sessions.test.ts` — 23 tests verts
(nominal, séance exclue, vacances bornes incluses, doublons d'emploi du temps,
emploi du temps vide, dates illisibles, plafond, `isSessionDate`).

## Phase 1 — livrée

PR [#205](https://github.com/Zahara-Nour/ubumaths/pull/205) mergée le 2026-09-10,
CI verte sur les 11 checks. Migration poussée en prod dans la foulée
(`supabase db push`), vérifiée sur la base EU :

- table créée, 2 policies ;
- `authenticated=arwd` — les quatre verbes, **sans TRUNCATE** ;
- **aucune entrée `anon`** dans l'ACL ;
- anciennes colonnes intactes (et toujours à zéro donnée).

`pnpm db:types` régénéré ensuite : +56 lignes, la table et la fonction, aucune
dérive ailleurs — la prod et les migrations du dépôt sont donc bien en phase.

## Ordre imposé par les types

`pnpm db:types` génère `database.ts` **depuis la prod** (`--project-id`). Donc
tant que la migration n'est pas poussée, aucun code de `src/lib/server/**` ne
peut interroger `journal_entry_homework` sans casser le typecheck. Les tests
d'intégration, eux, sont **hors périmètre** du typecheck (`tsconfig.check.json`
exclut `tests/**`) et peuvent donc être écrits et exécutés avant.

**Séquence obligatoire** : tests d'intégration (vérifiés **rouges sans la
migration**) → `security-auditor` → `pnpm db:migrate` → `pnpm db:types` → code
serveur de la phase 2.

## Audit de sécurité (2026-09-10) — aucun finding bloquant

Vérifié et conforme : pas de fuite brouillon/futur (les trois conditions de la
policy élève sont le verbatim de celle de `class_journal_entries`), GRANTs
corrects sur les trois objets (`authenticated` n'a **pas** TRUNCATE, `anon` n'a
rien), INVOKER/DEFINER justes, aucune garde perdue au `create or replace` de la
fonction de partage, pas d'injection possible via le JSONB.

**Corrigé** : `isSessionDate()` énumérait jour par jour avec la limite levée.
`until` venant de `school_years.end_date` — une date saisie à la main — une
faute de frappe type `9999-06-30` faisait ~2,9 millions de tours à chaque
échéance enregistrée. La vérification décide maintenant directement, en
O(vacances). Test de non-régression : `répond instantanément sur une fin
d'année aberrante`.

**Corrigé** : `content` n'avait aucune borne de taille. Contrainte
`char_length(content) <= 50000` ajoutée (même borne que `MAX_CONTENT_LENGTH`
côté Zod) — la liste était plafonnée à 50 travaux, mais pas chaque travail, et
c'est le visiteur anonyme du lien de partage qui retélécharge le tout.

**À faire en phase 4** : la page publique doit assainir `homework[].content`
avec le **même filtre que `lesson_content`**. Même classe d'exposition
qu'aujourd'hui (l'auteur est prof/admin), mais c'est un champ neuf, donc facile
à oublier.

**Hors périmètre, signalé à David** : `journal_entry_activities`,
`journal_entry_points` et `class_journal_entries` gardent un `GRANT ALL … TO
authenticated` du baseline, jamais révoqué (`ALL` inclut TRUNCATE, qui ignore
la RLS). Exploitabilité faible — PostgREST n'expose pas TRUNCATE, il faut une
connexion Postgres directe — mais la nouvelle table est la seule de la famille
correctement fermée. À traiter dans une migration d'hygiène dédiée, pas ici.

## Phase 2 — fait

**`src/lib/server/journal-homework.ts`** — le cœur.

- `estContenuVide()` : la contrainte SQL `btrim(content) <> ''` ne voit pas un
  éditeur riche vide (`<p></p>`). Mais un travail peut n'être QU'une formule ou
  QU'une image : les juger vides effacerait le travail du professeur, donc les
  éléments porteurs de sens sans texte sont reconnus avant le dépouillement.
- `resolveHomeworkItems()` : retire les travaux vides, résout une échéance
  absente au prochain cours, refuse celles qui ne tombent pas un jour de cours.
  **Rien n'est écrit dès qu'une échéance est refusée** — écrire les bonnes et
  jeter les autres laisserait une séance à moitié enregistrée, sans le dire.
  Les refus sont rendus en **liste** : le professeur corrige tout d'un coup.
- `setHomeworkForEntry()` passe par la fonction SQL atomique.

**Actions du cahier de texte** — `preparerTravaux()` valide **avant** toute
écriture, à la création comme à la mise à jour : une échéance impossible refuse
l'enregistrement sans avoir rien touché. Un formulaire qui ne porte PAS le champ
`homeworkItems` ne déclenche aucune écriture (une liste vide efface tout).

**Zod** — `homeworkItemsSchema` dans `validation/journal.ts`, bornes alignées
sur le SQL (50 travaux, 50 000 caractères). La chaîne vide est acceptée comme
échéance absente : un `<input type="date">` vidé renvoie `''`, pas `null`, et la
refuser ferait échouer l'enregistrement sur le geste le plus naturel qui soit.
Une saisie malformée n'est **pas** avalée en silence, contrairement aux
activités en attente : ce champ porte le texte que le professeur vient
d'écrire.

**`getUpcomingHomework()`** lit désormais la table fille : un travail par carte,
et non plus un par séance. `UpcomingHomework.id` est l'id du **travail**,
`entryId` celui de la séance — deux travaux d'une même séance partageant une
clé `{#each}` n'auraient donné qu'une seule carte, l'autre disparaissant sans
erreur.

**Couverture programme et citations de fiches** — les deux balaient maintenant
aussi les travaux. Pour les citations, cela demande **deux requêtes** (la séance
et ses travaux), regroupées par séance avant extraction pour qu'une fiche citée
des deux côtés reste une seule ligne.

**Tests** : 20 unitaires (`journal-homework.test.ts`), 27 d'intégration sur les
travaux, 54 sur la couverture. Les 4 nouveaux tests couverture/citations ont été
**vérifiés rouges** en neutralisant les correctifs depuis une copie. Le
quatrième passait au premier essai — le cours citait aussi la fiche, donc
l'ancien code la trouvait quand même ; il exige désormais la sélection venue du
devoir.

## Phases 3 et 4 — fait

**Éditeur prof** — « Travail à faire » est une liste : un éditeur riche et un
sélecteur d'échéance par travail, « Ajouter un travail », suppression.

- Le menu affiche « jeudi 17 septembre (prochain cours) », et « (passé) » sur
  une date antérieure à aujourd'hui — elle apparaît quand on remplit en retard
  le cahier d'une séance ancienne, et la proposer sans le dire laisserait croire
  à une erreur.
- ⚠️ `timeZone: 'UTC'` dans le formatage des libellés. `new Date('2026-09-17')`
  est interprété à minuit UTC ; un formatage en heure locale afficherait
  « mercredi 16 » à l'ouest de Greenwich, alors que tout le calcul est en UTC.
- Une échéance **déjà enregistrée mais devenue invalide** (cours déplacé,
  vacances ajoutées) reste affichée, marquée « (hors emploi du temps) ». La
  cacher la ferait retomber sur le placeholder, et l'enregistrement suivant
  écraserait la date en silence. Le serveur la refuse en la nommant.
- Une `key` par travail, pas l'index : supprimer une ligne du milieu ferait
  sinon recycler le mauvais éditeur, et le texte du travail suivant
  apparaîtrait dans le cadre qu'on vient de vider.
- `resynchroniserTravaux()` après enregistrement : le serveur ne recopie pas ce
  qu'on lui envoie (il retire les vides, résout les échéances), donc la page
  doit reprendre ce que la base connaît — sinon l'enregistrement suivant
  repartirait d'un état faux.

**Vues élève et publique** — un bloc par travail, avec son échéance et son
décompte. La pastille de la grille prof compte les travaux (`homeworkCount`,
requête dédiée : elle se fondait sur `homework_content`, qui n'est plus
écrite).

**Séances antérieures à la bascule** : l'ancien devoir unique n'est pas migré,
il est simplement encore **lu** partout où il s'affichait. Rien n'est perdu,
rien n'est réécrit.

**Assainissement** : `homework[].content` passe par le **même** `renderContent`
que `lesson_content` sur les deux pages — c'est le point que l'audit demandait
de ne pas oublier.

### Reste à savoir

`getJournalStatistics().entriesWithHomework` compte encore l'ancienne colonne,
donc vaudra toujours 0. **La fonction n'est appelée nulle part** en production
(seulement dans ses propres tests) : laissée telle quelle plutôt que d'élargir
le périmètre à du code mort. À corriger le jour où elle sert.

## Pièges connus pour la phase 2

- La contrainte SQL `btrim(content) <> ''` ne voit PAS un éditeur riche vide :
  TipTap rend `<p></p>`, qui n'est pas une chaîne blanche. C'est donc au serveur
  de retirer les travaux dont le texte, une fois les balises ôtées, ne contient
  rien — sinon l'élève voit une puce vide avec une échéance et rien à faire.
- `set_journal_entry_homework` **remplace** la liste entière. Un appel avec un
  tableau vide efface tous les travaux de la séance : ne l'appeler que lorsque
  la page a réellement envoyé sa liste, jamais « par précaution ».

## Ce que la phase 2 ne doit pas oublier

Consommateurs actuels de `homework_content` / `homework_due_date` :

- `src/lib/server/journal.ts` — `getUpcomingHomework()` (vue élève), conversion
  d'entrée, statistiques `entriesWithHomework`
- `src/lib/components/journal/{JournalEntryCard,JournalWeekGrid,HomeworkCard}.svelte`
- pages élève `dashboard/student/cahier-texte/` (liste + `[entryId]`)
- page publique `(public)/cahier/[token]/`
- **`src/lib/server/curriculum-coverage.ts`** — les `[[exercice:…]]` cités dans
  un travail alimentent le programme travaillé ; doit balayer **tous** les
  travaux, pas une colonne
- **`src/lib/server/worksheets/citations.ts`** — fait un `ilike` sur
  `homework_content` ; sans mise à jour, « où cette fiche est-elle citée ? »
  perdra silencieusement les devoirs
