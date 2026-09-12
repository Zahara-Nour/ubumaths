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
rien. Cela recoupe [l'état des lieux pédagogique](../../README.md) : les chaînes
classe sont construites mais quasi inutilisées.

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

### 3. Faut-il trois états plutôt que deux ?

`is_active = false` porte aujourd'hui deux sens opposés : _pas encore commencée_
et _terminée_. Un état explicite (`brouillon` / `en cours` / `archivée`)
permettrait des règles différentes — notamment l'accès rétroactif du point 2.

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
