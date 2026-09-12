# Bascule d'année scolaire — état des lieux

> Statut : **état des lieux mesuré, décisions produit ouvertes.** Aucun code écrit.
> Date : 2026-09-12. Mesures prises en production EU (`cnevnzsvixxpnurautls`), lecture seule.
> Origine : découvert en soldant la série « élève archivé » (PR #215, #219, #221, #222, #225).

## Le constat qui domine

**La rentrée n'a pas été faite dans l'outil.** Les classes 2026-2027 existent mais
sont vides ; les 77 élèves sont encore inscrits dans les classes 2025-2026, qui
ont été désactivées.

|                               |            |
| ----------------------------- | ---------- |
| élèves en classe **inactive** | **77**     |
| élèves en classe **active**   | **1**      |
| dernier message du chat       | 2026-06-14 |
| gidouilles sur 90 jours       | 0          |
| succès attribués              | 0          |

`is_active` fonctionne exactement comme prévu. C'est l'**absence de bascule
d'année** qui place 77 élèves sur 78 dans un état où ils n'atteignent presque
rien. Cela recoupe le constat déjà fait ailleurs : les chaînes classe sont
construites mais quasi inutilisées.

## Ce que `is_active` veut dire aujourd'hui

Un **marqueur d'année scolaire**, posé par un bouton « Désactiver » dans
`/dashboard/admin/classes` — réversible par « Activer ». C'est le seul écrivain
(`+page.server.ts`, actions `deactivate` / `activate`).

```
1SPE-TEST, 2DE 3, 1SPE 1, 1SPE 2     actives     créées 2026-09     1 élève
6A West Bay, 6B West Bay             inactives   créées 2025-10    37 élèves
1ère G Spé Maths, Terminale G        inactives   créées 2025-10    36 élèves
2nde Maths, Maths Expertes           inactives                      4 élèves
```

## Ce que le drapeau gouverne : 21 objets SQL

Aucun code applicatif ne le filtre directement — tout passe par ces objets.

| Domaine                  | Objets                                                                                                                               | Effet quand la classe est inactive                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Contenu pédagogique**  | `is_in_assigned_class`, `student_has_worksheet_access`, `can_access_assignment`, policy `Students can view their assignment classes` | l'élève perd fiches, exercices et corrections             |
| **Lien social**          | `are_classmates`, `is_classmate`, `validate_class_message_recipients`                                                                | ils cessent d'être camarades — messages, amis             |
| **Listes du professeur** | `get_teacher_classes_with_data`, `_with_students`, `_for_messaging`                                                                  | la classe disparaît des écrans                            |
| **Inscription**          | `resolve_open_class_by_code`, `get_classes_by_user_grade`                                                                            | le code de classe cesse de fonctionner                    |
| **Récompenses et jeux**  | `award_vip_cards_with_filters`, `draw_multiple_vip_cards`, `run_daily_summaries`, `run_weekly_rewards`                               | plus de tirages ni de bilans                              |
| **Partage public**       | `get_class_journal_by_share_token`, `get_worksheet_by_share_token`                                                                   | les liens de partage cessent                              |
| **Exercices**            | `get_all_exercise_assignments`, `get_my_exercise_assignments`, `get_teacher_exercise_assignments`                                    | sans objet : **ces trois fonctions n'ont aucun appelant** |

## Ce qu'il bloque réellement, mesuré

```
fiches distribuées à une classe inactive   10   →  inaccessibles à 36 élèves
exercices distribués à une classe inactive  0
salons de classe inactive                   1   →  0 message dedans
séances de cahier de texte                  0
```

**L'impact concret se réduit à 10 fiches inaccessibles.** Tout le reste est vide,
parce que l'usage l'est aussi.

## Le chaînon manquant : `classes` ignore `school_years`

C'est la découverte qui recadre tout le reste.

**`school_years` existe et sert déjà.** Deux années y sont enregistrées, avec
leurs trimestres et leurs vacances :

|                               | 2025-2026 | 2026-2027 |
| ----------------------------- | --------- | --------- |
| périodes (`academic_periods`) | 3         | 3         |
| vacances (`school_holidays`)  | 0         | **4**     |

Les vacances 2026-2027 sont celles qu'utilise le calendrier de séances du
cahier de texte. `academic_periods` porte les 271 observations
(`student_warnings`) et les évaluations.

**Mais `classes` n'a aucune colonne vers `school_years`.** Le rattachement d'une
classe à son année n'existe pas : `classes.is_active` en tient lieu, à la main.
C'est pourquoi le drapeau porte deux sens contradictoires — il remplace un lien
qui n'a jamais été posé.

**Anomalie liée : les deux années sont `is_active = true` simultanément.** Rien
ne désigne donc « l'année courante » de façon univoque. `src/lib/server/warnings.ts`
filtre pourtant sur `school_years.is_active` en supposant l'unicité.

## Les décisions ouvertes

### 1. Comment se fait une fin d'année ?

Aujourd'hui : on désactive les anciennes classes, on en crée de nouvelles, et
les élèves **restent membres des anciennes**. Rien ne les fait migrer, et rien
ne le signale.

À trancher : geste outillé (« faire passer la classe A à l'année suivante »,
avec choix des élèves reconduits) ou saisie manuelle assumée ?

### 2. Un élève garde-t-il l'accès aux fiches de l'an dernier ?

Actuellement **non**. Pour réviser, ce serait plutôt oui — c'est une lecture
seule sur du contenu qu'il a déjà travaillé. Mais cela suppose de distinguer
« classe terminée » de « classe pas encore ouverte », ce que le drapeau actuel
ne fait pas.

### 3. Rattacher `classes` à `school_years`, ou multiplier les états ?

Deux voies, et elles ne mènent pas au même endroit.

**Rattacher** (`classes.school_year_id`) : « classe de l'année courante » se
déduit alors, au lieu de se saisir. Le drapeau `is_active` retrouve un sens
unique — ouverte ou fermée _à l'intérieur_ de son année — et l'accès rétroactif
du point 2 devient exprimable : _lecture seule sur les classes des années
précédentes_. Coût : une colonne, un rattrapage sur 10 classes, et la reprise
des 21 objets qui testent le drapeau.

**Multiplier les états** (`brouillon` / `en cours` / `archivée`) : moins
invasif, mais l'année reste implicite. Deux classes « 6A » de deux années
resteraient indiscernables autrement que par leur date de création.

Le fait que `school_years` existe déjà, porte les vacances et les périodes, et
soit lue par le cahier de texte penche pour la première.

### 4. Que devient l'adhésion d'un élève à la fin de l'année ?

La série « élève archivé » a établi ce qui se passe quand `class_members.status`
passe à `archived` : plus de fiches, d'exercices, de Python, de notifications de
classe, ni de salon. Mais **rien ne pose ce statut aujourd'hui** — aucun code
n'écrit `archived`, seul un DELETE existe (`/api/admin/remove-from-class`).

La fin d'année est précisément le moment où ce statut prendrait son sens.

## Ce qui a été vérifié, et comment

- Les 21 objets : requête sur `pg_proc` + `pg_policies` filtrée sur `is_active`
  ET `classes`, en production.
- L'écrivain unique : grep sur `is_active:` dans `src/`, un seul site de
  désactivation.
- Les chiffres : comptages directs en production le 2026-09-12.
- Les trois fonctions sans appelant : grep sur `src/`, `e2e/`, `scripts/`.

## À ne pas confondre

`school_years.is_active`, `exercise_assignments.is_active`,
`journal_share_tokens.is_active` et `achievements.is_active` portent le même nom
sans aucun rapport. Ce document ne traite que `classes.is_active`.

## Voisin, découvert en même temps

**Aucune table n'est publiée en realtime** (`pg_publication_tables` ne contient
que les partitions internes de `realtime.messages`). Cinq stores utilisant
`postgres_changes` sont donc inertes : présence, succès, multijoueur démineur,
notifications, et la moitié du chat — dont le `broadcast`, lui, fonctionne.

Cause établie : la migration `20251230162731_enable_realtime_on_messages.sql`
(`ALTER PUBLICATION supabase_realtime ADD TABLE messages`) a été archivée dans
`supabase/migrations_archive/` lors du baseline du 2026-06-16, qui a suivi la
bascule EU du 2026-06-15. Le baseline étant un dump de schéma, il n'emporte pas
les publications. Même motif que la disparition de `on_auth_user_created`.

Les autres tables écoutées n'ont **jamais** été versionnées : activées au
Dashboard, sans trace de ce qui l'était avant la bascule.

---

# Spécification — validée par David le 2026-09-12

> Statut : **Phase 0 — spec validée sur le principe, en attente du feu vert par phase.**

## Le modèle retenu

> **L'élève est permanent. La classe appartient à une année. L'adhésion est annuelle.**

`profiles` traverse les années avec son historique, ses gidouilles et ses succès.
`classes` naît dans une année. `class_members` est le lien annuel : une nouvelle
ligne à chaque rentrée.

**Deux objets, pas un** : « 1ère G Spé Maths » de 2025-2026 et celle de 2026-2027
sont deux classes distinctes. Aucune promotion automatique — les groupes ne se
reconduisent jamais à l'identique (une 2nde se répartit entre deux 1SPE, une
Terminale part au bac). Rien ne se transforme : **on clôt, puis on compose.**

## Phase 1 — Rattacher les classes à leur année

**Nominal.** `classes.school_year_id` référence `school_years`. Toute classe
créée reçoit l'année en cours.

**Rattrapage.** Neuf classes sur dix se déduisent de leur date de création. La
dixième, `1SPE-TEST` (créée le 2026-08-25), tombe **entre** la fin de 2025-2026
(2026-06-30) et le début de 2026-2027 (2026-08-31) : elle est rattachée
explicitement à 2026-2027, en dur dans la migration, avec la justification.
Un rattrapage par date seule l'aurait laissée à `NULL` en silence.

**Limite.** Une classe sans année reste possible pendant la transition : la
colonne est nullable en Phase 1. Elle ne le sera plus après la Phase 2.

**Anomalie à corriger dans la même phase.** Les deux `school_years` sont
`is_active = true`. Une seule année doit l'être — `src/lib/server/warnings.ts`
suppose déjà l'unicité. À trancher : 2026-2027 devient la seule active.

## Phase 2 — Clôturer une année

**Nominal.** Un bouton « Clôturer l'année 2025-2026 », avec confirmation nommant
ce qui va changer. Effet : toutes les classes de l'année passent
`is_active = false`, et **toutes leurs adhésions passent `status = 'archived'`**.

Ce que l'élève perd immédiatement, par les cinq volets déjà livrés : les
nouvelles fiches, les exercices, le Python, les notifications de classe, et le
salon de groupe.

Ce qu'il garde : son compte, ses gidouilles, ses succès, ses signalements
d'erreur et leurs réponses, et — voir Phase 3 — la lecture des fiches déjà
distribuées.

**Réversible.** « Rouvrir l'année » remet les adhésions en `active`. Les cinq
triggers rejouent en sens inverse, y compris le retour dans le salon.

**Limite.** Une année sans classe, une classe sans élève : le geste réussit sans
rien faire. Clôturer une année déjà close ne change rien.

**Erreur.** Clôturer l'année **courante** doit être refusé — ou demander une
confirmation renforcée, puisque cela couperait l'accès à tous les élèves en
cours d'année.

## Phase 3 — Lecture seule rétroactive

**Nominal.** Un élève dont l'adhésion est archivée conserve l'accès **en lecture**
aux fiches qui lui avaient été distribuées, pour réviser. Exception ciblée dans
`student_has_worksheet_access`, pas une refonte.

**Ce qui reste fermé** : recevoir une nouvelle distribution, écrire (complétions,
signalements, soumissions), le salon, les notifications.

**Limite.** Une fiche retirée de la distribution après coup n'est plus lisible :
la lecture suit la distribution, pas l'historique de consultation.

## Phase 4 — Composer une classe depuis l'année précédente

**Nominal.** Un écran qui liste les élèves des classes de l'année précédente,
groupés par ancienne classe, avec cases à cocher et une classe de destination.
Les élèves cochés reçoivent une **nouvelle adhésion** dans la classe cible ;
leur ancienne reste archivée.

**Limite.** Un élève déjà membre de la classe cible est ignoré, pas dupliqué.
Un élève sans compte n'apparaît pas — l'import reste la voie des nouveaux.

**Erreur.** Une classe de destination archivée, ou d'une année close, est
refusée.

**Existe déjà** : l'ajout un par un (`/api/admin/add-to-class`, depuis l'écran
des utilisateurs) et l'auto-inscription par code de classe. Cette phase ajoute
le geste de masse, pas le mécanisme.

## Ordre et dépendances

Phase 1 conditionne les autres — sans rattachement, « les classes de l'année »
ne se calcule pas. Les phases 2, 3 et 4 sont ensuite indépendantes entre elles.

La Phase 2 est **destructive au sens de CLAUDE.md** : elle change l'accès de 77
élèves d'un coup. Elle exigera son inventaire, ses tests rouges, son audit, et
un feu vert explicite.
