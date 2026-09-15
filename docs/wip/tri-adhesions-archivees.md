# Tri : les lectures de `class_members` sans filtre de statut

> **État au 2026-09-15 : le tas 1 est corrigé** (six filtres `status`, plus un
> test d'intégration sur le cas d'accès). Les tas 2 et 3 sont intacts — le tas 3
> attend toujours un « oui / non » de David, ligne par ligne.
>
> Établi le 2026-09-15, après les correctifs `20260915400000` (accès au kanban)
> et `20260915420000` (assignation d'une carte).
>
> ⚠️ **Ce tri ne couvre que `src/`.** La base, elle, n'a pas été triée : 37
> policies RLS et 25 fonctions `SECURITY DEFINER` lisent `class_members` sans
> regarder `status`. Voir « L'autre moitié » en fin de document.

## Pourquoi ce tri existe

Depuis le **2026-09-13**, retirer un élève d'une classe l'**archive** au lieu de
le supprimer. `class_members` conserve donc la ligne, avec `status = 'archived'`.

Conséquence : **l'existence d'une adhésion ne dit plus rien**. Tout code qui
lit `class_members` sans regarder `status` traite un ancien élève comme un
élève actuel. Deux trous déjà bouchés l'ont prouvé — l'un ouvrait l'**écriture**
sur le kanban d'une classe quittée.

⚠️ Ces sites sont **invisibles à un `grep is_class_member`** : ils ne nomment
pas la fonction, ils refont la requête à la main.

## Méthode et fiabilité

Capture de la requête **entière** (de `.from('class_members')` jusqu'au `;`),
puis recherche de `status` dedans. Sur **109** lectures dans `src/`, **30** n'ont
aucun filtre de statut.

⚠️ Une première mesure à fenêtre fixe de 8 lignes en annonçait « une
quarantaine » : elle coupait les chaînes longues avant leur `.eq('status', …)`.
Le chiffre de 30 est celui de la méthode fiable.

⚠️ Limite restante : un filtre posé **ailleurs** que dans la chaîne (garde en
amont, filtrage après coup en JS) n'est pas vu. Les classements ci-dessous
tiennent compte du contexte lu à la main, pas seulement de l'heuristique.

---

## Tas 1 — CORRIGÉ (6)

Une adhésion archivée y **accordait un accès** ou **rattachait à la mauvaise
classe**. C'étaient des défauts, pas des choix — les six portent désormais
`.eq('status', 'active')`.

Le cas `assessments` est couvert par
`tests/integration/acces-evaluation-eleve-archive.test.ts`, **vu rouge sans le
filtre** : l'élève archivé obtenait un `200` sur l'évaluation de la classe
quittée, pendant que le témoin actif obtenait lui aussi `200`.

| Fichier                                                             | Ce que fait la requête                                  | Ce que l'archivé provoque                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/marketplace/helpers.ts:225`                         | la classe de l'élève, `.single()`                       | rattache au marché de son **ancienne** classe. Et `.single()` **lève** si l'élève a une adhésion active _et_ une archivée                                                                   |
| `src/lib/server/marketplace/helpers.ts:277`                         | idem                                                    | idem                                                                                                                                                                                        |
| `src/routes/api/assessments/[id]/+server.ts:142`                    | les classes de l'élève, pour ouvrir une évaluation      | **accorde l'accès** à une évaluation de la classe quittée                                                                                                                                   |
| `src/routes/api/games/minesweeper/tournaments/active/+server.ts:71` | les classes de l'élève, pour lister les tournois actifs | fait concourir un ancien élève dans le tournoi de son ancienne classe                                                                                                                       |
| `src/routes/api/marketplace/config/+server.ts:115`                  | la classe de l'élève, `.single()`                       | charge la configuration de l'ancienne classe ; même fragilité `.single()`                                                                                                                   |
| `src/routes/api/teacher/chapters/[id]/progress/+server.ts:78`       | les élèves de la classe du chapitre                     | **incohérent** avec la page équivalente, `teacher/cours/[classId]/[chapterId]/+page.server.ts:319`, qui filtre bien `status`. Deux écrans du même chapitre ne montrent pas les mêmes élèves |

**Déjà corrigé** : `src/lib/server/kanban.ts:297` (PR #293) — le sélecteur
d'assignés listait les 77 adhésions archivées.

⚠️ Le cas `assessments` est le plus proche d'un problème d'accès : il décide
ce qu'un élève a le droit d'ouvrir.

---

## Tas 2 — LÉGITIME (3)

Ces sites **doivent** voir les archivés. Y ajouter un filtre casserait quelque
chose.

| Fichier                                                        | Pourquoi c'est voulu                                                                                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/api/admin/class-composition-source/+server.ts:121` | vérifie qui est **déjà** dans la classe cible avant d'insérer. Ignorer les archivés ferait ré-insérer une ligne existante → violation de contrainte d'unicité. **Ne pas toucher** |
| `src/routes/api/admin/class-composition-source/+server.ts:111` | composition de classes par l'admin : il lui faut la photo complète, archivés compris                                                                                              |
| `src/routes/api/admin/users/[id]/status/+server.ts:154`        | fiche admin d'un utilisateur : son historique de classes est précisément l'objet de l'écran                                                                                       |

---

## Tas 3 — À DISCUTER (16)

Aucun n'est un défaut évident. Chacun pose une **question de produit** à
laquelle je ne peux pas répondre seul.

### a) Résoudre l'école ou le fuseau horaire de l'élève (3)

`src/routes/(protected)/dashboard/+page.server.ts:95` ·
`src/routes/(protected)/dashboard/student/minesweeper/stats/+page.server.ts:153` ·
`src/routes/api/consent/send-email/+server.ts:98`

Ces requêtes remontent à l'école (nom, fuseau, horaires) **par la classe**.
Pour un élève archivé partout, elles rendent son **ancienne** école.

> **Question** : un élève qui a quitté toutes ses classes doit-il garder le
> fuseau horaire et le nom de son ancienne école, ou retomber sur un défaut ?
> Conséquence visible : horaires décalés, et un e-mail de consentement au nom
> de la mauvaise école.

### b) Le tableau de saisie des notes (2)

`src/routes/(protected)/dashboard/teacher/evaluation-tasks/[id]/saisie/+page.server.ts:79` et `:232`

> **Question** : un élève archivé doit-il apparaître dans la grille de saisie ?
> Le cas n'est pas symétrique — s'il était présent **le jour du contrôle**, sa
> note doit pouvoir être saisie ; s'il est parti avant, il encombre la grille.
> Filtrer `status` traite les deux pareil. Faire mieux demanderait de comparer
> la date de l'évaluation à celle du départ (`left_at`).
>
> ⚠️ **Piège** : `left_at` est **NULL sur les 77 adhésions archivées** — le
> chemin d'archivage ne renseigne que `status`. Toute règle fondée sur
> `left_at` serait donc fail-open aujourd'hui.

### c) Le suivi des consentements (1)

`src/routes/(protected)/dashboard/teacher/consent/+page.server.ts:82`

> **Question** : faut-il continuer à réclamer le consentement d'un élève qui a
> quitté la classe ? C'est peut-être une **obligation légale** de garder la
> trace — auquel cas ce site passe en « légitime ».

### d) Les écrans d'administration du marché (9)

`marketplace/admin/activity/+server.ts:80` et `:94` ·
`marketplace/admin/analytics/+server.ts:76` et `:90` ·
`marketplace/admin/stats/+server.ts:97`, `:112` et `:147` ·
`marketplace/admin/trades/+server.ts:101` et `:153`

Tous comptent ou listent les élèves d'une ou plusieurs classes.

> **Question, une seule pour les neuf** : ces statistiques décrivent-elles la
> classe **d'aujourd'hui** ou **toute son histoire** ? Inclure les archivés
> gonfle les effectifs ; les exclure fait disparaître l'activité passée des
> élèves partis.
>
> ℹ️ `stats/+server.ts:112` n'a **aucun** filtre de classe : il lit toutes les
> adhésions de la base.

### e) Le ciblage des notifications (1)

`src/lib/server/notifications.ts:90`

Ce n'est pas une liste d'affichage mais un **contrôle d'autorisation** :
« le professeur peut-il cibler ces destinataires ? ». La règle actuelle est
« tout élève inscrit quelque part est le sien » (modèle mono-professeur).

> **Question** : doit-il pouvoir encore écrire à un ancien élève ? Le risque
> est faible — il n'y a qu'un professeur — mais c'est bien un élargissement de
> droit fondé sur une adhésion périmée.

---

## Tas 0 — Faux positifs (4), pour mémoire

À **ne pas** toucher : l'heuristique les a remontés, ce ne sont pas des
lectures.

| Fichier                                                                      | Nature                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/lib/server/middleware/student-access.ts:110`                            | exemple dans un bloc **JSDoc** (`@example Migration from old pattern`) |
| `src/lib/server/middleware/student-access.ts:225`                            | idem                                                                   |
| `src/routes/(protected)/dashboard/admin/import-students/+page.server.ts:193` | un `.insert()`, pas une lecture                                        |
| `src/routes/api/admin/add-to-class/+server.ts:61`                            | un `.insert()`, pas une lecture                                        |

---

## L'autre moitié : la base

Le tri ci-dessus a scanné `src/`. Il ne pouvait donc pas voir que **la base
elle-même** raisonne sur l'existence d'une adhésion.

Mesuré le 2026-09-15 sur la production (`pg_policies`, `pg_proc`) :

- **37 policies RLS** dont l'expression cite `class_members` sans jamais citer
  `status` ;
- **25 fonctions `SECURITY DEFINER`** dans le même cas.

C'est la couche qui **accorde réellement** l'accès. Exemple exact, celui que le
tas 1 vient de fermer côté route :

```sql
-- policy « Students can view own assignments » sur assessment_assignments
exists (select 1 from class_members cm
        where cm.class_id = assessment_assignments.class_id
          and cm.student_id = auth.uid())   -- pas de statut
```

Conséquence : la route est fermée, mais un ancien élève qui interroge
PostgREST **directement depuis son navigateur** lit encore la ligne
d'affectation — et l'évaluation publiée qu'elle désigne, la policy
`student_has_assignment_for_assessment()` ayant le même angle mort.

⚠️ Chaque ligne de cette liste **retire** un accès : c'est la question d'accès
en miroir (« qui ne pourra plus lire ce qu'il lisait ? »), et elle se pose
avant d'écrire du SQL. Rien n'a été touché.

ℹ️ Mesure indicative : le critère est « l'expression ne contient pas le mot
`status` ». Il produit des faux positifs (une policy qui parle d'un autre
statut) et des faux négatifs (un filtre posé dans une fonction appelée).

---

## Ce que je propose

1. ~~**Le tas 1 en une PR**~~ — fait, avec le test d'intégration sur
   `assessments` puisqu'il décide d'un accès.
2. **Le tas 3 point par point**, quand tu auras tranché. Le groupe (d) se
   règle en une seule réponse pour ses neuf sites.
3. **Le tas 2, jamais** — et `class-composition-source:121` mérite un
   commentaire disant pourquoi, sans quoi quelqu'un « corrigera » l'oubli
   apparent et cassera l'import.

Une idée à part, qui rendrait ce document inutile à l'avenir : un helper
`activeClassMembers(supabase)` qui pose le filtre par construction, et une
règle de lint interdisant `.from('class_members')` en dehors de lui. C'est ce
qui a manqué ici — la garde a été mise dans une fonction SQL
(`is_class_student`, `is_class_member`), que le code contourne en refaisant la
requête à la main.
