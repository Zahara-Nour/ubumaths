# Tri : la RLS et les adhésions archivées

> **Rien n'a été modifié.** C'est l'autre moitié de
> [tri-adhesions-archivees.md](tri-adhesions-archivees.md), qui ne scannait que
> `src/`. Ici, c'est la base — la couche qui **accorde réellement** l'accès.
>
> Établi le 2026-09-15, après la fermeture des six lectures applicatives
> (PR #305) et l'application des décisions du tas 3 (PR #306).

## Ce que la mesure dit vraiment

Sur la production, au 2026-09-15 :

| Statut     | Adhésions | Élèves | Classes |
| ---------- | --------- | ------ | ------- |
| `archived` | 77        | 77     | 5       |
| `active`   | 1         | 1      | 1       |

⚠️ **Ce « 77 contre 1 » n'est pas une anomalie : c'est une rentrée.** Les cinq
classes qui portent les 77 adhésions archivées sont elles-mêmes **inactives**
(`classes.is_active = false`) — inscriptions d'octobre 2025 à février 2026,
c'est-à-dire l'année scolaire passée :

- 1ère G West Bay Spé Maths (19), 6B West Bay (20), 6A West Bay (17),
  Terminale G West Bay Spé Maths (17), 2nde Maths (4).

L'unique adhésion active est dans **1SPE-TEST**, classe active, inscrite le
2026-08-26 — la nouvelle année, qui commence.

Conséquence directe pour ce qui suit : **poser un filtre de statut sur les
policies « élève », c'est retirer d'un coup à 77 anciens élèves l'accès au
contenu de leurs classes de l'an dernier.** Ce n'est pas une correction
invisible ; c'est un changement qu'ils verront.

ℹ️ `left_at` est **NULL sur les 77** : l'archivage ne renseigne que `status`.
Aucune règle ne peut donc se fonder sur la date de départ aujourd'hui.

## La méthode, et ce qu'elle a failli rater

`pg_policies` : **47 policies** citent `class_members`. Le critère « l'expression
ne contient pas le mot `status` » en isolait 37.

⚠️ Il en manquait une : `message_templates` / `student_view_templates` contient
bien le mot `status`, mais c'est `approval_status`, sur une autre table — sa
sous-requête `class_members` n'a aucun filtre. **Le compte réel est 38**, pas 37. (Les 9 autres filtrent réellement `cm.status = 'active'` : ce sont les
modèles à copier.)

---

## Pile A — l'élève hérite de la classe (25 policies)

Toutes en `SELECT`, toutes de la même forme :

```sql
exists (select 1 from class_members cm
        where cm.class_id = <table>.class_id
          and cm.student_id = auth.uid())   -- pas de statut
```

C'est **le vrai sujet** : un ancien élève lit encore ce que la classe porte.

| Ce qu'il continue de voir | Policies                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| La classe elle-même       | `classes` / `view_member_classes`                                                                                                         |
| Organisation              | `class_schedules`, `class_journal_entries`, `journal_entry_homework`, `coursework_categories`                                             |
| Documents et supports     | `coursework_materials`, `shared_coursework`, `shared_materials`, `rag_documents`, `rag_chunks`, `message_templates`                       |
| Google Classroom          | `class_google_classroom_links`, `google_classroom_coursework`, `google_classroom_materials`, `google_classroom_topics`, `..._attachments` |
| Évaluations               | `assessment_assignments`, `evaluation_tasks`, `evaluation_task_perimeter`                                                                 |
| Énigmes                   | `riddle_assignments`                                                                                                                      |
| Jeux                      | `game_class_settings`, `game_timeslots`, `minesweeper_tournaments`, `minesweeper_tournament_classes`, `minesweeper_tournament_games`      |

⚠️ `assessment_assignments` est **exactement** la policy que la PR #305 a fermée
côté route. La route dit non ; la base dit toujours oui. Un ancien élève qui
interroge PostgREST depuis son navigateur lit encore la ligne d'affectation, et
l'évaluation publiée qu'elle désigne.

⚠️ `rag_documents` / `rag_chunks` sont d'une autre forme : la condition est
« être membre d'**une** classe, n'importe laquelle ». Un élève sans adhésion
active perdrait donc les documents du professeur, pas seulement ceux d'une
classe.

⚠️ `classes` / `view_member_classes` est la **fondation** : beaucoup d'écrans
joignent `classes`. À couper en dernier, et à mesurer séparément.

### Les fonctions du même côté

- `student_has_assignment_for_assessment()` — le pendant SQL de la policy
  ci-dessus.
- `is_riddle_assigned_to_student()` — une énigme de la classe quittée reste
  ouverte.
- `check_marketplace_enabled()` — prend **une** classe (`LIMIT 1`, sans ordre) :
  l'ancien élève garde le marché de l'an dernier.
- `is_kanban_board_member()` — ⚠️ **ne pas y toucher** : le filtre y casse le
  `DELETE` (piège documenté en 2026-09-15, migration `20260915420000` ; le
  filtre a été posé dans une fonction dédiée à l'assignation, pas ici).

---

## Pile B — le professeur agit sur « ses » élèves (13 policies)

Forme différente : `is_teacher_or_admin()` **et** une adhésion quelconque. Ici
`class_members` ne sert pas à ouvrir un accès à l'élève, mais à dire « cet
élève est bien dans l'école du professeur ».

`assessment_assignments` (INSERT) · `conversations` · `messages` ·
`notifications` (INSERT) · `parental_consents` (INSERT, UPDATE) · `profiles`
(UPDATE récompenses) · `python_exercise_assignments` (INSERT) ·
`riddle_assignments` (INSERT) · `riddle_attempts` (UPDATE) · `skill_attempts`
(INSERT) · `student_warnings` (UPDATE) · `vip_cards_activity` (INSERT).

Plus `can_view_student_profile()`, `is_teacher_of_student()` et les fonctions
`SECURITY DEFINER` d'attribution (`award_*`, `grant_*`, `remove_*`,
`approve_*`, `use_vip_card`, …), qui reposent sur la même idée.

✅ **Ne pas filtrer.** Y poser `status = 'active'` **retirerait au professeur**
le droit d'agir sur un ancien élève : plus de consentement à relancer, plus
d'avertissement à lever, plus de notification. C'est l'inverse de ce que David a
tranché le 2026-09-15 sur les deux mêmes sujets côté application
(notifications : « garder » ; consentements : statu quo).

ℹ️ Cas à part, cosmétique : `search_users_unaccent()` agrège les `class_ids`
d'un élève sans distinguer les archivés — la recherche du professeur présente
donc d'anciennes classes comme actuelles.

---

## La question d'accès, en miroir

> **Les 77 élèves des classes de l'an dernier doivent-ils garder l'accès au
> contenu de ces classes — emploi du temps, cahier de texte, devoirs, documents,
> énigmes, tournois, évaluations ?**

✅ **Réponse de David, le 2026-09-15 : « couper le support de classe, garder
leurs traces »** — la deuxième option ci-dessous.

Premier lot livré : migration `20260915700000_support_de_classe_membres_actifs`,
**19 policies + 2 fonctions**. Test d'intégration
`tests/integration/support-de-classe-eleve-archive.test.ts`, vu **rouge sans la
migration** (4 échecs : emploi du temps, cahier de texte, évaluation, énigme
restaient lisibles) et **vert avec** (9/9, témoin actif compris).

Restent hors lot 1, et pourquoi : `classes / view_member_classes` (fondation,
~15 écrans la joignent en `!inner`), `rag_documents` / `rag_chunks` (forme
« membre d'une classe quelconque »), les trois tables de tournoi (un tournoi
porte aussi les PARTIES de l'élève : support et trace y sont mêlés),
`check_marketplace_enabled()`, et `is_kanban_board_member()` — jamais.

Les trois réponses possibles, telles qu'elles étaient posées :

1. **Tout couper.** Cohérent avec le kanban (« tout couper », 2026-09-15). Les
   77 ouvrent l'application sur un écran vide. 25 policies + 3 fonctions.
2. **Couper le contenu de classe, garder ce qui est à eux.** C'est le principe
   déjà retenu le 2026-09-12 pour les signalements d'erreur : _la fiche
   appartient à la classe, le signalement appartient à l'élève_. Plus juste,
   mais il faut trier les 25 une par une et distinguer, dans chaque table, ce
   qui est le support et ce qui est la trace de l'élève.
3. **Ne rien couper.** Statu quo. Le trou d'`assessment_assignments` reste
   ouvert côté base.

⚠️ Quelle que soit la réponse, **chaque ligne retire un accès** : à livrer par
petits lots, avec un test d'intégration par lot, et jamais `view_member_classes`
en premier.
