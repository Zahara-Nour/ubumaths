# Publication au fur et à mesure des chapitres

> Chantier ouvert le **2026-09-13**. Décisions prises par David ce jour-là, en
> réponse à une étude : voir la section « Ce qui est tranché ».
>
> Contexte amont : [mon-cours-chapitres-progress.md](mon-cours-chapitres-progress.md).

## Le problème

`class_chapters.is_visible` était le **seul** interrupteur : un chapitre était
entièrement visible ou entièrement caché. Impossible de préparer un chapitre
complet puis d'en libérer les parties au rythme du cours.

Seule exception, déjà en place : les **fiches**, qu'il faut distribuer pour
qu'elles apparaissent.

## Ce qui est tranché — ne pas re-poser ces questions

| Question                       | Décision de David (2026-09-13)                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Granularité de publication     | **Par élément** — chaque document, fiche, question, objectif, exercice a son propre état                                  |
| Publier une fiche              | **Distribue immédiatement**, un clic, sans confirmation, à la classe du chapitre                                          |
| Dépublier une fiche distribuée | Elle **disparaît du chapitre, l'affectation reste** — l'élève la garde dans « Mon travail », jamais de travail interrompu |
| Les fiches dans les modèles    | **Oui**, et la migration de version **n'efface plus rien** (additive seulement)                                           |
| Conséquence d'accès            | Assumée : publier donne accès immédiat à toute la classe, sur des mineurs                                                 |

## Le vocabulaire — piège à trois entrées

« Publier » existe **trois fois** dans le dépôt, avec trois sens :

1. `worksheets.status = 'published'` → la fiche est terminée ;
2. `chapter_templates.status = 'published'` → le modèle est diffusable ;
3. **`<contenu>.published_at`** (nouveau) → mis à disposition des élèves de
   cette classe, dans ce chapitre.

D'où `published_at` et non `status` : un horodatage, parce que « au fur et à
mesure » suppose de savoir **quand**, et parce que `null` dit sans ambiguïté
« préparé, pas encore donné ».

## Les cinq phases

| #   | Contenu                                             | Migration | État              |
| --- | --------------------------------------------------- | --------- | ----------------- |
| 1   | `published_at` sur les 5 tables + policies élève    | **oui**   | ✅ écrite, testée |
| 2   | Côté prof : publier / dépublier chaque élément      | non       | à faire           |
| 3   | Côté élève : ne voir que le publié, sans écran muet | non       | à faire           |
| 4   | Publier une fiche = la distribuer                   | non       | à faire           |
| 5   | Fiches dans le modèle + migration additive          | non       | à faire           |

## Phase 1 — ✅ écrite

`supabase/migrations/20260915140000_chapter_content_publication.sql`

**Question d'accès, posée et tranchée :** cette migration ne donne d'accès à
personne. Elle ne fait que **restreindre** — `published_at <= now()` s'ajoute
à des conditions qui existaient déjà. Et les 5 tables sont à **0 ligne** en
production (mesuré le 2026-09-13), donc le défaut `null` ne retire rien à
personne.

Le vrai changement d'accès viendra du **code** en phase 4, pas d'ici.

### La preuve que le test prouve quelque chose

Séquence vérifiée, dans cet ordre :

1. sans la migration → la suite échoue (colonne absente) ;
2. **avec les colonnes seules, sans la réécriture des policies → 6 tests sur 8
   échouent** : l'élève voit le non publié. C'est ce qui établit que le garde
   vit dans la policy, pas dans la colonne ;
3. avec la migration complète → 8/8.

Les 2 tests déjà verts à l'étape 2 sont les cas « fiche », protégés par
`student_has_worksheet_access` qui existait avant.

### Ce que l'audit de sécurité a rattrapé

**`published_at is not null` ne datait rien.** Une date FUTURE publiait
immédiatement. La colonne s'appelle « date de mise à disposition » et appelle
donc un sélecteur de date : un professeur programmant « demain 8 h » aurait
rendu son contenu lisible le soir même — les questions du contrôle comprises.
Les policies testent désormais **`published_at <= now()`**, qui couvre les deux
cas (`null <= now()` vaut `null`, donc faux). Un test dédié le garde, et il a
bien été vu **rouge** contre l'ancienne règle.

**Le rollback n'est pas neutre en accès**, contrairement à la migration. Le
rétablir expose d'un coup tout ce qui était préparé sans être donné. Le bloc
ROLLBACK porte maintenant une étape 0 (masquer les chapitres concernés) et ne
prétend plus « sans perte » : on perd quel contenu avait été libéré et quand.
Ses instructions échouaient aussi en `42710` — il fallait reprendre les
**paires** `drop` + `create`, pas les seuls `create`.

### Un bug trouvé au passage, sans rapport avec la migration

`student/cours/[chapterId]/+page.server.ts` était le **seul** `load` du dépôt à
appeler `/api/…` sans déstructurer `fetch` de l'événement. Avec le `fetch`
global de Node, une URL relative lève `Failed to parse URL` — hors `try`, donc
**500 sur tout le chapitre**, documents et quiz compris. Et si l'URL passait,
les cookies ne suivraient pas : l'appel serait non authentifié. Corrigé.

Impact nul aujourd'hui (0 chapitre), mais cela veut dire que le chemin
`chapter_worksheets` n'était prouvé que par le test d'intégration, jamais par
l'application.

### Effet de bord assumé sur un test existant

`chapter-worksheets-rls.test.ts` distribuait une fiche sans la publier : sous le
nouveau contrat elle n'est plus visible. Le test a été mis à jour (ensemencement
avec `published_at`), **son invariant est inchangé** — publier ne remplace pas
distribuer, les deux gardes se cumulent.

### Pièges rencontrés à l'ensemencement

- `cleanupAllTestData()` ne purge que les écoles de **`city = 'Testville'`** :
  toute autre ville survit à un run interrompu et fait échouer le suivant.
- `question_templates` **n'est jamais purgé**, et porte un index unique sur
  (thème, domaine, sous-domaine, niveau) `where status = 'published'`. D'où un
  discriminant par exécution (`RUN`) plutôt qu'un pari sur une base vierge.
- Contraintes non devinables : `chapter_documents.source_type` ∈
  {`google_drive`, `upload`} avec URL obligatoire ; `exercises.category` NOT
  NULL et contraint ; `question_templates.type` NOT NULL et `variations` non
  vide.

## Phase 2 — ✅ écrite

`src/lib/server/chapters-publication.ts` — `setContentPublication()`, une seule
fonction pour les cinq types.

**Le point de sécurité :** le type de contenu vient d'un formulaire. C'est
exactement la forme qui invite à écrire `supabase.from(type)` — une injection de
nom de table à un caractère près. La correspondance type → table est donc
**fermée et côté serveur** ; ce que le client envoie n'est jamais un nom de
table, seulement une clé qu'on y cherche. Un type inconnu ne produit aucune
requête (test dédié).

`TABLES` est déclarée `as const satisfies Record<ChapterContentType, string>` :
le `satisfies` casse le typecheck si un sixième type est ajouté sans sa table,
le `as const` garde les littéraux dont le client Supabase typé a besoin.

**Publier pose `now()`, jamais une date choisie.** La policy compare
`published_at <= now()` : une date future ne publierait rien, et le professeur
croirait avoir publié. Programmer une publication est un autre geste, qui
n'existe pas encore.

**Côté interface**, un composant unique `PublicationToggle` sur les cinq
onglets. Pour une fiche, le badge distingue trois états — _préparé_, _publiée
mais pas encore distribuée_, _visible par les élèves_ — et l'écran charge la
distribution réelle de la classe pour ne pas l'inventer. Sans ça, il afficherait
« visible par les élèves » pour une fiche que personne ne peut ouvrir.

⚠️ `ChapterContentType` vit dans `$lib/types/chapters.ts`, **pas** dans le module
serveur : un composant ne peut rien importer de `$lib/server/**`, fût-ce un
type, et seul `vite build` l'aurait vu — pas le typecheck.

## Phase 3 — ✅ écrite

Rien à filtrer côté code : la RLS le fait déjà. Ce que la phase 3 corrige est
**ce que l'élève lit** quand elle a filtré.

Depuis la publication au fur et à mesure, **un onglet vide est le cas normal**.
« Aucun document pour ce chapitre » se lisait comme un défaut — chapitre cassé,
ou abandonné. `ChapterEmptyState` dit désormais une **attente** (« ton
professeur n'a pas encore mis… »), pour les six cas (5 onglets + chapitre).

⚠️ **Contrainte de confidentialité, testée :** le message ne révèle jamais
COMBIEN de contenus attendent en coulisse. La RLS les cache ; un « 12 questions
à venir » apprendrait à l'élève qu'un contrôle se prépare. Un test interdit tout
chiffre dans ces messages.

Deux autres corrections :

- **la carte d'un chapitre sans rien de publié** n'est plus muette (elle
  n'affichait aucun compteur, donc rien du tout) ;
- **un onglet sans matière est grisé**, pour que l'élève voie d'un coup d'œil où
  chercher sans ouvrir les cinq.

Les compteurs de la liste passent par la RLS de l'élève (`chapter_documents(count)`
et consorts) : ils ne comptent **que le publié**, donc aucune fuite par ce
chemin non plus.

Détail appris : `lore.learning.exercise` vaut **« Corvée »**, pas « exercice ».
Toute tournure qui accorde en genre sur ce mot casse au premier changement de
vocabulaire — les messages l'évitent.

## Phase 4 — ✅ écrite

Publier une fiche depuis un chapitre la **distribue** à la classe de ce
chapitre : affectation `status = 'active'`, ouverte tout de suite, sans échéance
ni consigne. Un clic, sans confirmation — tranché par David.

**L'ordre compte.** La distribution passe AVANT l'écriture de `published_at` :
si elle échoue, la fiche ne doit pas se retrouver marquée « publiée » alors que
personne ne l'a reçue. C'est le mensonge que ce chantier corrige partout
ailleurs.

**Idempotent.** Une classe qui a déjà une affectation active n'en reçoit pas une
seconde ; sinon republier empilerait les affectations et l'élève verrait la même
fiche plusieurs fois dans « Mon travail ».

**Dépublier ne reprend rien.** L'affectation reste, l'élève garde la fiche dans
« Mon travail ». On n'interrompt jamais un travail en cours.

⚠️ `status` a pour défaut `'draft'` : l'omettre ne distribuerait rien.
`student_has_worksheet_access` exige `status = 'active'`, `available_from <=
now()`, une adhésion **active** et une classe **active**.

### Pourquoi un test d'intégration ici

Les tests unitaires prouvent qu'on insère `status: 'active'` et un lien de
classe. Ils ne prouvent **pas** que l'élève voit la fiche : ça dépend de quatre
conditions dans `student_has_worksheet_access`. Une seule ratée, et le
professeur croirait avoir distribué.

`tests/integration/chapter-worksheet-publish-distributes.test.ts` fait donc le
chemin complet avec les droits réels — le professeur publie, l'élève regarde —
et garde aussi les deux autres décisions (idempotence, retrait non destructif).

### Ce que l'audit de sécurité a rattrapé (phase 4)

Rien de bloquant, mais quatre corrections, dont une sérieuse.

**Une fiche pouvait devenir DÉFINITIVEMENT impubliable.** Le garde
d'idempotence utilisait `maybeSingle()`, qui lève `PGRST116` dès la **deuxième**
ligne — et rien en base n'interdit deux affectations actives de la même fiche à
la même classe. Le jour où un doublon serait apparu, publier aurait échoué pour
toujours, avec un message générique et aucune issue depuis l'interface.

**Le badge pouvait mentir.** Le critère d'idempotence ignorait `available_from`,
que `student_has_worksheet_access` exige. Une fiche programmée pour lundi
prochain était dite « déjà distribuée » : rien ne partait, et l'écran affichait
« visible par les élèves » pour une fiche que personne ne peut ouvrir. Les deux
requêtes (module et écran prof) sont désormais **la même fonction**,
`listDistributedWorksheetIds` — elles ne peuvent plus diverger.

**Le rollback était un no-op garanti.** La seule policy DELETE de
`worksheet_assignments` ne vise que les **brouillons** ; une affectation créée
en `active` dont le lien de classe échouerait était donc indélébile par l'API —
et un DELETE à 0 ligne ne renvoie pas d'erreur, donc le « ménage » se croyait
réussi. La création passe maintenant en **trois temps** : brouillon → lien de
classe → activation. Le ménage fonctionne, et tant qu'elle est en brouillon
l'affectation n'atteint personne.

**Message honnête** si la distribution réussit mais que le chapitre ne se met
pas à jour : « la fiche a été distribuée, mais le chapitre n'a pas pu être mis à
jour » — au lieu de laisser croire que rien n'est parti.

### Deux résidus, non traités et assumés

1. **Course entre deux clics simultanés.** Le motif reste un check-then-insert :
   deux onglets peuvent créer deux affectations. Conséquence désormais bornée —
   la fiche reste publiable (correction ci-dessus) — mais l'élève verrait la même
   fiche deux fois dans « Mon travail ». Fermer ça demande un verrou en base
   (RPC `SECURITY DEFINER`), donc une migration : **à trancher par David**.
2. **Les élèves archivés reçoivent les distributions ultérieures.**
   `had_class_access_to_assignment` borne par le bas (`>= joined_at`) mais pas
   par le haut, faute d'un `left_at` sur `class_members` (77 membres archivés en
   prod). Préexistant, mais ce chantier transforme la distribution en geste de
   routine, donc la surface s'élargit. Question d'accès à poser :
   **« un élève qui a quitté la classe doit-il continuer à voir les fiches
   distribuées après son départ ? »**

## Reste ouvert

**La dispersion.** David : « j'ai l'impression que c'est dispersé ». Mesuré, il
a raison — une fiche rattachée ET distribuée apparaît à **trois** endroits :
« Mon travail », l'onglet Fiches du chapitre, et le cahier de textes si elle y
est citée. Plus deux pages hors menu (`/dashboard/student/worksheets`,
`/dashboard/student/exercises`).

Volontairement **non traité** : ce chantier ne ferait que déplacer le problème.
À reprendre quand un vrai chapitre existera — la bonne réponse sera plus
évidente avec du contenu sous les yeux.
