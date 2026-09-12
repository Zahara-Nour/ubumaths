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

| Chantier                                                                          | État                   |
| --------------------------------------------------------------------------------- | ---------------------- |
| Série « élève archivé » — fiches, exercices, Python, notifications, chat + kanban | livré                  |
| Professeur multi-école (calendrier de toutes ses écoles)                          | livré                  |
| Classes rattachées à `school_years` (Phase 1)                                     | livré                  |
| `close_school_year` / `reopen_school_year` (Phase 2)                              | livré                  |
| Voltaire 2025-2026 clôturée — 77 adhésions archivées                              | fait                   |
| Année courante déduite des dates, plus de `is_active`                             | livré                  |
| Realtime : 5 des 6 tables republiées (PR #234)                                    | mergé, **pas en prod** |
| Phase 3 — lecture seule rétroactive (PR #235 + #237)                              | mergé, **pas en prod** |
| Phase 4 — composer une classe depuis l'année précédente (PR #236)                 | livré                  |

> ⚠️ **Trois migrations attendent `db:migrate`** : `20260914140000` (realtime),
> `20260914160000` et `20260914180000` (Phase 3). Le mode auto de Claude Code
> refuse d'écrire en production ; il faut lancer `pnpm db:migrate` à la main,
> puis `pnpm db:types` et commiter `database.ts`.

---

# 1. Realtime — corrigé, sauf `user_presence`

> **État au 2026-09-14** : PR #234 mergée. Cinq tables republiées
> (`messages`, `notifications`, `student_achievements`,
> `minesweeper_multiplayer_game_state`, `minesweeper_multiplayer_matches`).
> **`user_presence` volontairement laissée de côté**, en attente d'arbitrage.
>
> **Pourquoi.** La RLS ne s'applique pas aux DELETE, et le `filter`
> d'abonnement non plus tant que la replica identity vaut `default` : les deux
> remparts tombent ensemble. Ce qui part est la clé primaire seule — un `id`
> opaque pour les cinq autres, mais **`user_presence` a `user_id` pour clé
> primaire**. La publier diffuserait l'UUID d'un compte au moment de sa
> suppression (CASCADE depuis `profiles`, effacement RGPD compris) à tout
> abonné.
>
> **La question** : accepter cette diffusion, ou repasser la présence en
> `broadcast` (ce que fait déjà `tradeRealtime`, qui n'a jamais cessé de
> marcher) ? Réversible en une ligne. Un test refuse la publication tant que
> rien n'est tranché.

**Le fait.** `pg_publication_tables` ne contenait **aucune table de `public`** —
seulement les partitions internes de `realtime.messages`, qui servent au
`broadcast`. Donc **tout `postgres_changes` était inerte** en production.

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

> **État au 2026-09-14** : livrée (PR #235), puis corrigée (PR #237) après
> audit. **Pas encore en production.**
>
> Mécanisme : un prédicat `had_class_access_to_assignment(uuid)` — adhésion
> ARCHIVÉE à une classe destinataire, fiche distribuée dans la fenêtre de
> l'année de la classe ET après l'arrivée de l'élève (`joined_at`) — OR-é dans
> `student_has_worksheet_access` et dans la policy de `worksheet_assignments`.
> `can_access_assignment` n'est pas touchée : elle garde les écritures. Un
> pendant lecture, `can_read_assignment`, lui est ajouté à côté.
>
> **Effet mesuré en prod** : 36 élèves archivés retrouvent 10 fiches, toutes au
> Lycée Franco-Qatari Voltaire.
>
> **Deux questions ouvertes**, posées par l'audit :
>
> **Les deux questions sont tranchées** (2026-09-14, PR #239) :
>
> 1. « Ancien membre » = adhésion archivée **OU** classe fermée. L'égalité sur
>    `status = 'archived'` laissait dans un trou l'élève resté actif dans une
>    classe désactivée à la main — le cas réellement observé à Voltaire.
> 2. La relecture **s'éteint douze mois après la fin de l'année**. Mesuré :
>    0 adhésion gagne, 0 adhésion perd aujourd'hui.
>
> Attention, la durée réelle va jusqu'à ~22 mois : le compteur part de
> `sy.end_date`, pas du départ de l'élève.
>
> **Côté application (PR #238, en prod)** : la décision d'accès vit dans
> `src/lib/server/worksheets/assignment-access.ts` — trois issues (écrire,
> relire, rien) et une quatrième à ne jamais confondre avec « rien » :
> « je n'ai pas su lire ». La réponse porte un drapeau `read_only`, et l'écran
> retire alors les boutons de maîtrise, le signalement d'erreur, l'onglet
> Signalements **et le tuteur** — celui-ci écrit des conversations et appelle
> le modèle, ce qu'une fiche relue n'a pas à déclencher, et rien ne le gardait
> côté serveur. Un bandeau dit pourquoi.
>
> **Effet mesuré une fois en prod** : 8 fiches relisibles en 1ère G, 1 en
> Terminale G, 133 paires élève/fiche après la borne du séjour.

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

> **État au 2026-09-14** : **livrée** (PR #236), en production au prochain
> déploiement. Écran `/dashboard/admin/classes/composer`, deux routes
> (`POST /api/admin/compose-class`, `GET /api/admin/class-composition-source`),
> 22 tests serveur.
>
> **La question inter-écoles est tranchée et livrée** (2026-09-14) : déplacer
> le profil. Trois policies lisent `profiles.school_id` — trimestres, années,
> marché — et laisser le profil sur l'ancienne école donnerait un élève à
> moitié cassé. `admin_compose_class` (PR #241) inscrit et déplace dans **une
> même transaction** ; l'écran et l'API (PR #242) annoncent le déplacement,
> exigent une case à cocher, et le serveur refuse en 409 sans le drapeau
> `confirmSchoolChange` — la garde ne repose pas sur l'interface.
>
> **Prêt à l'usage** : créer l'école « Cours particuliers », son année, ses
> groupes, puis `/dashboard/admin/classes/composer`.

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

**Sans objet cette année, à école constante** : les nouveaux élèves de Blaise
Pascal ne viennent pas de Voltaire — c'est un changement d'établissement, pas
une bascule d'année. L'écran servira **l'an prochain**, quand les 2DE 3
deviendront des 1SPE… ou **dès maintenant**, si tu tranches la question
inter-écoles ci-dessus.

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

## 4b. Les fiches dans « Mon cours » — ✅ LIVRÉ

**Le besoin, formulé par David** : « je mets mes ressources dans Mon cours en
avance et je distribue au fur et à mesure ».

`chapter_worksheets` existe (PR #244), et le câblage suit (PR #245) : un onglet
« Fiches » dans l'éditeur de chapitre côté professeur, et la page de chapitre de
l'élève qui lit SES fiches via `?chapter_id=`.

**L'invariant à ne pas casser** : rattacher ne distribue PAS. La policy de
l'élève exige `student_has_worksheet_access` en plus du chapitre visible, donc
une fiche préparée mais pas encore affectée reste invisible, lien compris. C'est
dans la policy et non dans l'API, pour que la jonction ne puisse jamais devenir
un canal de distribution parallèle.

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
- **`HttpError` de SvelteKit n'étend pas `Error`** : `err instanceof Error &&
'status' in err` est toujours faux et convertit tout 4xx délibéré en 500.
  Neuf handlers de l'API fiches étaient touchés. Idiome correct :
  `err && typeof err === 'object' && 'status' in err`.
- **Des dates littérales dans des fixtures vieillissent dans les deux sens** :
  rouge bruyant d'un côté, vert menteur de l'autre. Les rendre relatives à
  `Date.now()` dès qu'une borne temporelle est testée.
- **Un `db:reset` fait AVANT un rebase ne contient pas les migrations que le
  rebase apporte.** Symptôme trompeur : une fonction corrigée répond juste,
  celle qu'elle devait compléter répond faux. Réinitialiser après tout rebase.
- **`joined_at` vaut `now()` par défaut** : une fixture qui laisse le défaut
  date l'arrivée d'aujourd'hui, donc APRÈS toute distribution antérieure. Les
  tests rougissent alors pour une raison sans rapport avec ce qu'ils testent.
- **`check:incremental` refuse de tourner si Supabase local tourne** (12
  conteneurs, ~1,9 Go sur une machine de 8 Go) : `db:stop` d'abord.
- **Le hook pre-commit échoue si prettier a du travail** : formater avant, ou
  le commit est annulé sans message clair.

# Ce qui rapporterait le plus, maintenant

1. Créer l'école « Cours particuliers », son année, ses vacances, ses groupes —
   puis `/dashboard/admin/classes/composer` pour y reprendre d'anciens élèves.
2. **Inscrire des élèves** à Blaise Pascal : 1 sur 4 classes en a un.
3. **Créer des chapitres** dans « Mon cours » : tout y est construit, rien n'y
   est rangé. Le quiz de chapitre attend d'ailleurs ça pour que la question du
   contrat `variation` → vrai/faux ait un sens.
4. Le reste est de la dette, aucune ne bloque l'usage quotidien.

# Corrections que je me suis apportées

Deux fois dans cette série, une recommandation que j'avais donnée s'est révélée
fausse à la vérification. Les deux valent d'être retenues.

- **`worksheet_instances`** : je conseillais de resserrer la policy UPDATE parce
  qu'un élève pouvait réécrire `instance_data`, que les routes PDF lisent. Faux —
  un trigger `prevent_worksheet_instance_tampering` le bloquait déjà. Vérifié en
  retirant ma migration : l'élève reste bloqué. Ce qui manquait était le TEST du
  trigger, qui n'existait pas (PR #243).
- **`futureDateSchema`** : j'ai annoncé qu'un professeur au Qatar serait affecté.
  Faux — le schéma n'a aucun appelant. Le bug était réel (et permanent à l'ouest
  de Greenwich), la correction est préventive.

La leçon commune : avant d'annoncer un impact utilisateur, chercher l'appelant et
chercher le garde qui existe peut-être déjà.
