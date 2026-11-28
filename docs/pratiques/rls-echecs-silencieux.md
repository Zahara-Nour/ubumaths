# Les échecs silencieux de la RLS

> Écrit le 2026-09-15, après une session où **une seule cause** a produit une
> dizaine de bugs apparemment sans rapport. À lire avant d'écrire du code qui
> lit ou écrit sous RLS, et avant de retirer une policy.

## La règle en une phrase

**Une opération refusée par la RLS ne rend PAS d'erreur. Elle rend zéro ligne.**

C'est tout. Le reste de cette page en découle.

```ts
// ⛔ Cette garde ne peut PAS se déclencher sur un refus de RLS.
const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
if (error) throw new Error(error.message); // jamais atteint
// `data` vaut [] — et rien ne distingue « interdit » de « vide ».
```

Une absence ressemble à un vide légitime. Un bug qui crie se corrige le jour
même ; un bug qui chuchote survit des mois.

## Les quatre formes, toutes rencontrées le même jour

### 1. La lecture filtrée

Rend `[]`. La garde `if (error)` ne sert à rien.

Vécu : la place de marché lisait `profiles.vip_cards` du vendeur pour traduire
les cartes offertes. Après restriction des profils, 5 annonces sur 13 se
seraient affichées **vides** — et l'élève aurait accepté l'échange sans voir ce
qu'on lui propose. Le commentaire du fichier décrivait exactement le résultat
qu'il croyait éviter.

**Comment s'en protéger** : quand l'absence a un sens métier (une offre, une
liste d'élèves, un nom d'auteur), ne pas se contenter de `if (error)`. Comparer
à ce qu'on attendait — `expect(data).toHaveLength(ids.length)` en test, un
drapeau « incomplet » en production.

### 2. L'écriture refusée

Un `UPDATE` ou un `DELETE` refusé affecte **zéro ligne**, sans erreur.

```ts
// ⛔ Vert que la suppression ait eu lieu ou non.
const { error } = await supabase.from('friendships').delete().eq('id', id);
if (error) return fail(500);
return { success: true }; // MENSONGE possible
```

Vécu : l'écran d'administration annonçait avoir supprimé une amitié signalée
entre deux mineurs. Il en supprimait zéro — la policy testait `role = 'teacher'`
en dur et ne couvrait pas l'admin.

**Comment s'en protéger** : `.select()` sur l'écriture, et vérifier les lignes
rendues.

```ts
const { data, error } = await supabase.from('x').delete().eq('id', id).select('id');
if (error) return fail(500);
if (!data?.length) return fail(403, { error: 'Aucune ligne supprimée' });
```

⚠️ Le même piège en TEST : `expect(error).toBeNull()` après une UPDATE ne
prouve rien. Il faut relire la ligne, ou exiger `.select()`.

### 3. La jointure interne qui efface la ligne entière

`profiles!inner (...)` sous RLS : quand le profil est masqué, **la ligne parente
disparaît**.

Vécu : le classement des succès se réduisait à soi, ses camarades et ses amis —
avec des **rangs et des totaux faux**, sans erreur ni log. Pire encore quand un
rang est calculé en _comptant_ les lignes au-dessus : presque tout le monde
devient premier.

**Comment s'en protéger** : sous RLS, préférer une fonction `SECURITY DEFINER`
qui agrège côté serveur et ne rend que les colonnes nécessaires. Se méfier des
vues en `security_invoker` qui joignent `profiles` : elles ont le même défaut.

### 4. Le client qui n'est pas celui qu'on croit

`locals.supabase` = le JWT de l'utilisateur, **soumis à la RLS**. Le client
service-role la contourne. Un helper qui reçoit `supabase` en paramètre peut
être appelé avec l'un ou l'autre — et le même code se comporte différemment.

**Comment s'en protéger** : dire dans le commentaire de la fonction lequel des
deux elle attend, et pourquoi.

## Le corollaire : une garde centralisée ne protège que ce qui passe par elle

`is_class_member()` était correcte. Trois endroits ne l'appelaient pas — ils
refaisaient `select ... from class_members` à la main, sans filtre de statut.
**Invisibles à `grep is_class_member`**, parce qu'ils ne nomment pas la fonction.

Deux en SQL (`is_kanban_board_member`), un en TypeScript (`fetchBoardMembers`).

**Avant de faire confiance à une garde** : chercher les endroits qui refont sa
requête, pas ceux qui l'appellent. `grep "from('<table>')"` en plus de
`grep <nom_de_la_garde>`.

## Le corollaire n° 2 : un changement de SENS ne se propage pas

Le 2026-09-13, retirer un élève d'une classe est devenu l'**archiver**. Ce
jour-là, « une adhésion existe » a cessé de signifier « cet élève est dans la
classe ». Tous les lecteurs de ce fait sont devenus faux d'un coup, sans que
rien ne change visiblement.

Même mécanique pour une table supprimée : les schémas Zod qui la décrivaient
lui survivent (cf. `worksheets.tags`, 2026-09-09 — 500 sur trois routes).

**Quand tu changes le sens d'une donnée** : inventorier ses lecteurs le jour
même. Le tri de `class_members` est dans
[docs/archive/wip/tri-adhesions-archivees.md](../archive/wip/tri-adhesions-archivees.md).

## Le corollaire n° 3 : une policy ne borne pas les colonnes

Une policy `UPDATE` dit **quelles lignes** un compte peut modifier, jamais **quelles colonnes**.
« L'élève modifie ses propres messages » lui laissait donc, par l'API de la base, la date
d'envoi, la marque de grossièreté, la conversation et l'auteur. Une policy `INSERT` qui ne
contrôle que l'auteur laisse de même choisir l'état, les dates et tout le reste à la création.
Cinq écarts de ce motif ont été fermés en novembre 2026 (T29 à T33, chantier
`ecarts-moderation`), sur `messages`, `conversation_participants` et `bug_reports`.

- **Question à se poser pour toute policy `UPDATE` ou `INSERT` d'un compte d'élève** : quelles
  colonnes l'écran lui fait-il écrire ? Tout le reste doit être refusé en base.
- **Parade : un trigger de garde en liste blanche** (`BEFORE UPDATE`, colonnes changées lues par
  `to_jsonb(NEW)` contre `to_jsonb(OLD)`), qui refuse par une erreur `42501` toute colonne hors
  liste, d'aujourd'hui ou ajoutée plus tard. Le serveur (`auth.uid()` vide) passe. Modèles :
  `20261125145621_message_chat_non_reecrit.sql`, `20261126060048_rapport_de_bug_non_reecrit.sql`.
- **À la création** : forcer les valeurs (`20261125152013`) ou les refuser (`20261126060048`).
  Une date laissée au `DEFAULT now()` est exactement égale à `now()` dans le trigger.
- **Pourquoi pas un retrait de droits par colonne** (`REVOKE UPDATE` puis `GRANT UPDATE (…)`) :
  il passe avant les triggers et remplace leur message par un « permission denied » muet.
- **Pièges rencontrés** : une clé étrangère `ON DELETE SET NULL` met la ligne à jour au nom du
  compte connecté (prévoir l'exception, sinon une suppression de compte échoue) ; l'ordre des
  triggers `BEFORE` est alphabétique (la garde doit passer avant celui qui recalcule
  `updated_at`) ; message d'erreur sans accent (PostgREST rend sinon un 500 sans code).
- **Preuve** : un test d'intégration par colonne, avec le client de l'élève, rouge sans la
  migration ; asserter l'erreur ET la ligne intacte.

Le motif peut exister sur d'autres tables d'élèves : il n'a été cherché que sur ces trois-là.

## Retirer une policy : la checklist

Retirer un accès est aussi dangereux qu'en ouvrir un, et c'est moins intuitif.
Avant un `drop policy` :

1. **Qui perd quoi ?** Poser la question d'accès EN MIROIR : non pas « qui
   pourra lire ce qu'il ne lisait pas », mais « qui ne pourra plus lire ce
   qu'il lisait ».
2. **Mesurer sur les données réelles**, pas en théorie. Une policy qui semble
   redondante peut être la seule qui fonctionne : `are_classmates` rendait faux
   pour tout le monde parce que 77 adhésions sur 78 sont archivées.
3. **Inventorier les lecteurs**, y compris les jointures `!inner`, les vues
   `security_invoker`, et les helpers qui reçoivent `locals.supabase`.
4. **Chercher les replis qui ne peuvent pas replier** : un code de secours qui
   relit la même table avec le même client ne rattrape rien.
5. **Livrer les compensations AVANT le retrait**, pas dans la même PR si elles
   demandent une RPC — voir la contrainte d'ordre ci-dessous.

⚠️ Les policies permissives se combinent en **OU**. Une seule policy
`using (true)` rend inutiles toutes les autres, qui restent en place, correctes,
et sans effet. Les compter ne suffit pas : il faut les lire.

### Cas vécu : la policy large de `srs_cards` est PORTEUSE (2026-09-28)

Sur `srs_cards`, deux policies INSERT permissives coexistent :

- « Users can create cards in their non-assigned decks » — la stricte : paquets
  de l'utilisateur, non assignés, **non gérés automatiquement** ;
- « Users can create cards in decks » — la large : paquets non assignés de
  l'utilisateur **y compris le paquet Programme** (`is_auto_managed`), OU tout
  paquet si l'utilisateur est prof/admin.

En OU, la stricte est sans effet — ce qui ressemble à un trou. **Ne pas retirer la
large** : elle est la seule qui autorise deux usages légitimes (mesuré) :

1. `ensureProgrammeDeckCard` (`src/lib/server/srs/programme-deck.ts`) ajoute la
   carte au paquet Programme **avec le client de l'élève** — appelé par
   `/api/tests/save`, `/api/skill-attempts` et `/api/srs/review/submit` ;
2. l'assignation de paquets (`/api/srs/decks/[id]/assign`) crée les cartes dans
   les paquets des élèves **avec le client du prof**.

La retirer ferait échouer ces écritures en silence (l'ajout au paquet Programme
avale son erreur : non bloquant). Seul usage non voulu : un élève peut, hors de
l'application, ajouter des cartes à SON paquet Programme — sans effet ailleurs que
sur ses propres révisions (ni prof, ni badges, ni statistiques). Décision de David
(2026-09-28) : garder en l'état. Pour resserrer un jour : faire écrire
`ensureProgrammeDeckCard` avec les droits du serveur, PUIS retirer à l'élève
l'écriture dans un paquet `is_auto_managed` (en gardant la branche prof/admin), avec
tests d'intégration sur les trois chemins d'ajout et l'assignation.

**Résolu le 2026-10-03 (#680, Q130)** : `ensureProgrammeDeckCard` écrit avec le
client service, et la policy large est rattachée à `service_role` seul
(`ALTER POLICY … TO service_role`, migration 20261003100000 — pas de DROP). David a
aussi retiré la branche prof/admin : aucun écran ne l'utilisait (la copie d'un
paquet assigné passe déjà par le client service). La séquence a suivi l'ordre
ci-dessus : code déployé, PUIS migration. Preuve :
`tests/integration/paquet-programme-rempli-par-le-serveur.test.ts`.

## Les types suivent les migrations de la branche, plus la prod

`pnpm db:types` génère `database.ts` depuis une base locale qui porte exactement
les migrations de la branche (la pile de test). Une nouvelle fonction SQL et le
code qui l'appelle tiennent donc dans **une seule PR** : migration, `pnpm db:types`,
code. La CI régénère le fichier et le compare (`pnpm db:types:verifier`).

Jusqu'au 2026-11-22, les types venaient de la production, et il fallait deux PR
(migration, `db:migrate`, `db:types`, puis le code). Les tests d'intégration
écrits alors contournent encore (`const F = 'ma_fonction' as never`, client non
typé) : ce n'est plus nécessaire.

⚠️ Si une migration doit partir AVANT d'autres déjà écrites, `pnpm db:migrate`
(`supabase db push`) les pousse toutes. Les déplacer temporairement hors de `supabase/migrations/`
fonctionne, mais **compter les fichiers avant et après** : un oubli de
restauration ne serait signalé par rien. Et les migrations suivantes hériteront
d'un ordre non chronologique, ce qui exige `--include-all`.

## Ce qui a réellement empêché la récidive

Deux gardes valent plus que les correctifs qu'elles remplacent :

- **`pnpm check:barrels`** — un ré-export de baril est invisible à oxlint,
  eslint et svelte-check. Deux composants morts (694 lignes) y ont survécu des
  mois. Cf. [reference dans CLAUDE.md](../../CLAUDE.md).
- **`cleanupAllTestData` lit désormais son erreur.** Elle purgeait les classes
  par un DELETE massif bloqué par une clé étrangère en `NO ACTION` : 668 classes
  accumulées, l'erreur avalée par un `try/catch` qui ne pouvait rien voir
  (`.delete()` ne lève pas, il REND `{ error }`).

La leçon générale : **ce qui n'a pas de signal ne se corrige jamais tout seul.**

## Nouvelle fonction SECURITY DEFINER : le garde-fou Q145

Une fonction SECURITY DEFINER ignore la RLS : si un élève peut l'appeler, seule une garde dans son corps protège le compte des autres. `tests/integration/garde-fonctions-security-definer.test.ts` échoue donc dès qu'une fonction de `public` exécutable par `authenticated`/`anon` manque à `tests/integration/fixtures/fonctions-definer-verifiees.ts`, qu'une entrée de cette liste est périmée, ou qu'un `search_path` ne finit pas par `pg_temp`.
**Que faire :** lire le corps ; s'il ne contrôle pas l'appelant (`auth.uid() = p_user_id`, `is_teacher_or_admin()`, `assert_*`, jeton…), ajouter la garde ou révoquer EXECUTE — jamais l'inverse. S'il le contrôle, ajouter l'entrée avec une justification VRAIE d'une ligne (et `anon: true` seulement pour une page publique).
Entrée périmée → la retirer. `search_path` → `SET search_path = public, pg_temp`.
Les fonctions laissées hors liste exprès (en attente de décision) sont nommées en tête du fichier de liste.
**Bloquant en CI (Q162 b)** : job `Garde SECURITY DEFINER` de `quality.yml`, sur toutes les PR, compté dans « CI Summary » (check obligatoire) — un rouge empêche le merge.
Il ne démarre que Postgres (`supabase db start`, migrations appliquées), sans la suite d'intégration ; config `vitest.definer-guard.config.ts`.
En local : `pnpm test:definer-guard` (pile de test démarrée et mise à jour par la commande, verrou `supabase-test`, < 1 s une fois la pile à jour).

Vérifié contre le code le 2026-10-10.
