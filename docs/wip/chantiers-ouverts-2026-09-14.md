# Chantiers ouverts — reprise après compactage

> Écrit le 2026-09-14 pour survivre à une perte de contexte. Chaque section
> donne l'état **mesuré**, les décisions **déjà prises** (à ne pas re-litiger),
> et ce qui reste.
>
> Voir aussi [bascule-annee-scolaire-etat-des-lieux.md](bascule-annee-scolaire-etat-des-lieux.md).

## Contexte, en trois lignes

David a **changé d'établissement**. Le Lycée Franco-Qatari Voltaire (77 élèves,
année 2025-2026) est **clôturé** depuis le 2026-09-14 ; il enseigne au Lycée
polyvalent Blaise Pascal (4 classes, année 2026-2027, **1 élève inscrit**).
Une troisième école « Cours particuliers » est prévue, pas encore créée.

## Ce qui est en production

| Chantier                                                                          | État  |
| --------------------------------------------------------------------------------- | ----- |
| Série « élève archivé » — fiches, exercices, Python, notifications, chat + kanban | livré |
| Professeur multi-école (calendrier de toutes ses écoles)                          | livré |
| Classes rattachées à `school_years` (Phase 1)                                     | livré |
| `close_school_year` / `reopen_school_year` (Phase 2)                              | livré |
| Voltaire 2025-2026 clôturée — 77 adhésions archivées                              | fait  |
| Année courante déduite des dates, plus de `is_active`                             | livré |

---

# 1. Realtime — cause établie, correctif non décidé

**Le fait.** `pg_publication_tables` ne contient **aucune table de `public`** —
seulement les partitions internes de `realtime.messages`, qui servent au
`broadcast`. Donc **tout `postgres_changes` est inerte** en production.

**Six stores concernés**, tous utilisant `postgres_changes` :
`achievementsRealtime`, `multiplayer`, `presence`, `chat`,
`notificationsRealtime`, `supabaseRealtime`. Seul `chat` a aussi du
`broadcast`, qui lui fonctionne.

**La cause, établie et datée :**

```
2025-12-30   ALTER PUBLICATION supabase_realtime ADD TABLE messages   (migration versionnée)
2026-06-15   bascule vers le projet EU
2026-06-16   baseline du schéma → 619 migrations archivées
```

La migration existe encore dans `supabase/migrations_archive/20251230162731_enable_realtime_on_messages.sql`.
Le baseline qui l'a remplacée est un **dump de schéma**, et `pg_dump` n'emporte
pas les publications. Même motif que la disparition de `on_auth_user_created`.

**Deux catégories :**

- `messages` était **versionnée** — il suffit de rejouer la migration archivée ;
- les ~19 autres tables n'ont **jamais** été versionnées (activées au
  Dashboard). Aucune trace de ce qui était actif avant la bascule.

**Décision de David (2026-09-14) : enquêter d'abord, ne rien republier.**
L'enquête est faite ; le correctif reste à décider. Republier a un coût en
trafic pour chaque client connecté, sur une base d'élèves mineurs.

**Piste recommandée** : rejouer `messages` seul (restauration d'un état voulu
et documenté), plus un test d'intégration vérifiant que les tables attendues
sont dans `pg_publication_tables` — sans quoi la prochaine bascule de projet
reperdra la même chose en silence.

---

# 2. Phase 3 — lecture seule rétroactive

**Le besoin.** Un élève dont l'adhésion est archivée perd tout accès aux fiches
de la classe quittée. Pour réviser en septembre ce qu'il a travaillé en juin,
il devrait garder la **lecture** de ce qui lui avait été distribué.

**Décision de David : validée sur le principe** (2026-09-12), non implémentée.

**Portée technique.** Une exception ciblée dans `student_has_worksheet_access`,
pas une refonte. Reste fermé : recevoir une nouvelle distribution, écrire
(complétions, signalements, soumissions), le salon, les notifications.

**Limite déjà identifiée.** Une fiche retirée de la distribution après coup
n'est plus lisible : la lecture suit la distribution, pas l'historique de
consultation.

**Recommandation : attendre.** Vérifier d'abord si des anciens de Voltaire
reviennent réellement en cours particuliers. Sinon on construirait pour
personne.

---

# 3. Phase 4 — composer une classe depuis l'année précédente

**Ce que c'est.** Un écran qui liste les élèves des classes de l'année
précédente, groupés par ancienne classe, avec des cases à cocher et une classe
de destination. Les élèves cochés reçoivent une **nouvelle adhésion** dans la
classe cible ; leur ancienne reste archivée.

**Pourquoi ce n'est pas une « promotion automatique ».** Les groupes ne se
reconduisent jamais à l'identique : une 2nde se répartit entre deux 1SPE, une
Terminale part au bac, une 6ᵉ change de professeur. Automatiser produirait des
classes fausses à corriger ensuite. Le modèle retenu est **on clôt, puis on
compose**.

**Ce qui existe déjà** : l'ajout un par un (`/api/admin/add-to-class`, depuis
l'écran des utilisateurs) et l'auto-inscription par code de classe. Cette phase
ajoute le **geste de masse**, pas le mécanisme.

**Comportements spécifiés** : un élève déjà membre de la cible est ignoré, pas
dupliqué ; un élève sans compte n'apparaît pas (l'import reste la voie des
nouveaux) ; une classe de destination archivée ou d'une année close est
refusée.

**Sans objet cette année** : les nouveaux élèves de Blaise Pascal ne viennent
pas de Voltaire — c'est un changement d'établissement, pas une bascule
d'année. Utile **l'an prochain**, quand les 2DE 3 deviendront des 1SPE.

---

# 4. Cahier de texte / Mon cours / fiches / quiz

C'est le chantier d'origine de la session, resté en suspens. Deux constats
mesurés le 2026-09-14 changent sa priorité.

## 4a. « Mon cours » est entièrement vide

```
class_chapters ......... 0        chapter_exercises ...... 0
chapter_documents ...... 0        chapter_quiz_questions . 0
class_journal_entries .. 2
```

Aucun chapitre n'existe. La rubrique est construite mais **jamais utilisée**.
Toute amélioration technique y serait prématurée tant que David n'y met rien.

## 4b. Les fiches dans « Mon cours »

**Le besoin, formulé par David** : « je mets mes ressources dans Mon cours en
avance et je distribue au fur et à mesure ». Aujourd'hui la page d'un chapitre
affiche **toutes** les fiches de la classe, pas les siennes.

**Ce qui manque** : une table de jonction `chapter_worksheets` (vérifié : elle
n'existe pas), sur le modèle de `chapter_exercises` et `chapter_documents` qui
existent déjà. Puis la page de chapitre lit SES fiches.

**Point d'attention** : `/dashboard/student/cours/[chapterId]` appelle
`/api/student/worksheets?class_id=…`. Ce filtre passe par la jonction depuis la
PR #213 ; la page distingue désormais « aucune fiche » d'une panne de lecture.

## 4c. Le quiz de chapitre n'a jamais rien montré

**Établi en lisant le code** (`src/routes/(protected)/dashboard/student/cours/[chapterId]/+page.server.ts`,
commentaires aux lignes ~60 et ~205) :

Le code interrogeait `question_templates.question`, `.answer` et
`.explanation`. **Aucune de ces colonnes n'existe** : un modèle de question
porte `title`, `description` et surtout `variations`, où vit l'énoncé. La
requête échouait à chaque affichage, sans erreur visible, et `ChapterQuiz`
filtre les questions sans modèle — **le quiz n'a donc jamais affiché quoi que
ce soit**.

La requête morte a été retirée ; l'action de soumission renvoie un 404
explicite au lieu de calculer un `isCorrect` sur une colonne fantôme.

**Le schéma est déjà prêt** : `chapter_quiz_questions` porte
`question_template_id`, `display_order` et `points_override`. Le lien vers le
système de questions **existe**.

**Ce qui bloque est un choix produit, pas une réparation** : comment une
`variation` d'un modèle de question devient-elle une question vrai/faux ? Tant
que ce contrat n'est pas tranché, on ne peut pas corriger une réponse.

## 4d. Objectifs

**Explicitement mis de côté par David** (deux fois). Ne pas le relancer.

---

# Décisions prises, à ne pas re-litiger

- **Deux objets, pas un** : une classe appartient à une année ; deux classes
  homonymes de deux années sont distinctes.
- **L'élève est permanent, l'adhésion est annuelle.** On clôt, puis on compose.
- **Le salon de classe suit l'adhésion**, dans les deux sens. Un élève qui en
  sort perd l'historique du groupe — validé par David.
- **Les signalements d'erreur restent à l'élève**, même archivé : ses données.
- **Commentaires en français, identifiants en anglais** (`CLAUDE.md` à jour).
- **Les 77 comptes de Voltaire sont conservés** jusqu'au 2031-06-30, selon le
  registre des traitements. Rien à supprimer aujourd'hui.
- **École dédiée pour les cours particuliers** : David y tient, le multi-école
  est livré pour ça.
- **Les groupes de cours particuliers sont de vraies classes**, petites (2-3
  élèves), qui communiquent — rien à coder, le modèle suffit.

# Pièges rencontrés, pour ne pas les repayer

- Un fichier **untracked suit le changement de branche** : une migration
  destructive est partie dans la mauvaise PR. Commiter avant de basculer.
- **Ne jamais réécrire une fonction de mémoire** : partir de
  `pg_get_functiondef`. J'ai perdu un suffixe de nom et changé un comportement.
- **Les policies permissives se combinent en OU** : corriger l'une sans l'autre
  ne ferme rien. Ce piège a mordu trois fois dans la même journée.
- **Un test peut être vert sans rien prouver** : vérifier le code d'erreur, pas
  seulement sa présence ; et fabriquer l'état que le correctif vise.
- **Après beaucoup de `db:reset`, GoTrue casse les sign-in** avec une erreur
  vide. Remède : `db:stop` puis `db:start` — un reset ne suffit pas.
- Les **tests d'intégration ne tournent pas en CI** : les lancer localement.

# Ce qui rapporterait le plus, maintenant

1. Créer l'école « Cours particuliers », son année, ses vacances, ses groupes.
2. **Inscrire des élèves** à Blaise Pascal : 1 sur 4 classes en a un.
3. Le reste est de la dette, aucune ne bloque l'usage quotidien.
