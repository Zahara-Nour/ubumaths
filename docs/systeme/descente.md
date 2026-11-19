---
couvre:
  - 'src/lib/descente/**'
  - 'src/lib/server/descente/**'
  - 'src/lib/components/descente/**'
  - src/lib/server/validation/descente.ts
  - 'src/routes/(protected)/dashboard/student/descente/**'
  - 'src/routes/api/descente/**'
---

# La Descente de la Vistule — le jeu de combats

> Vérifié contre le code le 2026-11-18 (étape 2 : apparition des Bêtes ; étape 3 : combat de la recrue). Conception et
> décisions de David : [navadra-progress.md](../wip/navadra-progress.md) (§ « Tranché », phases 0
> de la v1 et de l'étape 2). Vocabulaire : [CONTEXT.md](../../CONTEXT.md) (Bête imprévue,
> coup / sort, carnet de voyage).

L'élève combat des **Bêtes imprévues** nées de ses besoins ; chaque coup ou sort se valide par une
question. Le jeu se construit par étapes (une PR par étape) : fondations en base (étape 1),
apparition des Bêtes (étape 2), combat de la recrue (étape 3). **Aucune page n'y mène encore**
(carte et entrée de menu à l'étape 4) : sans appel à l'apparition, aucune Bête n'existe en prod.

## Base (étape 1)

Migration `supabase/migrations/20261118060323_descente_fondations.sql` :

- `student_beasts` : les Bêtes de l'élève (vivantes, reparties, vaincues) ; le carnet = ses Bêtes
  vaincues. `kind` : `ordinary`, `big` (grosse Bête de la semaine), `tutorial`.
- `student_combat_moves` : coups et sorts gagnés en maîtrisant une notion.
- `record_beast_victory` : défaite marquée, gidouilles versées (1 / 3 / 0), 4 au plus sur 24 h.
- Lecture : l'élève ses lignes seulement (ni prof ni admin) ; écriture : serveur seul.
- Export RGPD : `gaming.descente` de `GET /api/account/export` (lecture par pages).

## Apparition des Bêtes (étape 2)

`spawnBeasts(client de l'élève, studentId)` (`src/lib/server/descente/spawn.ts`), à appeler à
l'ouverture de la carte. Pas de tâche planifiée : chaque visite **rattrape** le temps passé.

| Règle          | Valeur                                                                                |
| -------------- | ------------------------------------------------------------------------------------- |
| Rythme         | une Bête ordinaire toutes les 8 h (première visite : 3)                               |
| Plafond        | 5 Bêtes ordinaires vivantes ; au-delà, le dû est perdu                                |
| Reste du temps | gardé : la k-ième Bête due est datée de la dernière apparition + k × 8 h              |
| Départ         | 3 jours ; jamais pour un point à remédier (reste jusqu'à sa défaite)                  |
| Grosse Bête    | une tous les 7 jours, la première 7 jours après l'arrivée ; reste 7 jours, hors des 5 |
| Points de vie  | 120 (ordinaire) / 360 (grosse), réglés à l'étape 3 (voir combat)                      |
| Tutoriel       | ne compte pour rien dans l'apparition                                                 |

**D'où naît une Bête** (`spawn-logic.ts`) : d'un point du parcours de l'élève, par priorité :
à remédier (`needs_remediation`, tout le parcours) → non acquis de **son** niveau → à revoir
(badge FSRS `a_remedier` ou `a_renforcer`). Au hasard dans un même rang, en préférant une Province
absente de la carte ; jamais deux Bêtes vivantes sur le même point. La grosse Bête est servie en
premier (point le plus prioritaire).

**Point jouable** (`combat-templates.ts`) : au moins un modèle publié tagué dont la **première
variation** a une seule case, ou un QCM (`choix`), et aucun bloc hors de `choix`, `courbe`,
`figure`, `python`, `solide`. Filtre préalable : le combat revérifiera la question tirée.
Exclusion manuelle : `COMBAT_EXCLUDED_TEMPLATE_IDS`.

**Province** (`provinces.ts`) : celle de la **branche** du point, par son nom (19 branches → 6
Provinces) ; une branche inconnue ne fait naître aucune Bête et se trace au journal.

**Bestiaire** (`bestiary.ts`) : **provisoire**, trois Bêtes par Province ; les vraies fiches sont à
valider avant l'étape 4. La base ne garde que la clé.

## Combat de la recrue (étape 3)

Page `/dashboard/student/descente/combat/[beastId]` (`CombatArena.svelte`), élève seul. Règles
pures : `combat-rules.ts` ; coups : `moves.ts` ; serveur : `src/lib/server/descente/combat.ts` ;
appels de la page : `combat-client.ts`.

| Règle       | Valeur                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| Tour        | 3 coups de l'élève, puis la riposte : une question d'esquive                       |
| Coups       | un par Province (`STARTING_MOVES`, **noms provisoires**) ; le même plusieurs fois  |
| Dégâts      | coup réussi : 20 sur la Province sensible, 8 ailleurs ; coup raté : rien           |
| Cœurs       | 3 ; une esquive ratée en coûte un ; plus de cœur : défaite, sans aucun coût        |
| Grosse Bête | se replie après 4 tours, garde ses blessures ; ordinaires : pas de limite de tours |
| Ouverture   | une Bête ordinaire blessée repart en pleine forme ; à 0 sans défaite, pas remise   |
| Coup fermé  | Province sans point jouable à **son** niveau (le coup sensible reste ouvert)       |

**Questions** (`drawCombatQuestion`) : esquive ou coup sensible → un modèle du point de la Bête
(à défaut, un autre point de sa Province, à son niveau) ; autre coup → un point de son niveau dans
la Province du coup, non acquis d'abord. Le serveur génère l'instance et la **revérifie**
(`isCombatInstance` : une seule case tapée ou un QCM, sans geste, ni carte de cours) ; sinon il en
tire une autre (8 essais). Les modèles déjà posés dans le combat passent en dernier.

**Réponses** (`recordCombatAnswer`) : comptées comme partout (`recordStudentAttempt` : FSRS, trace
`auto` au lieu `descente` écrite au client service, deck Programme, suivi des points) ; puis le
serveur retire les dégâts (écriture conditionnée aux PV lus, refaite si deux réponses se croisent).
À 0 : `record_beast_victory`. Une trace non écrite n'arrête pas le combat (`recorded: false`) ;
une victoire non enregistrée se renvoie (`claimBeastVictory`, route `…/victory`).

**Routes** (`src/routes/api/descente/combat/[beastId]/`, Zod `validation/descente.ts`) :
`question`, `answer`, `victory` ; refus en 404 / 409 `{ error: <code> }` (`combat-http.ts`).
La page redemande une question ou une victoire sur une panne du serveur (5xx, 429, 408) ;
elle ne renvoie **jamais** une réponse (un 500 peut suivre l'écriture : trace et dégâts en
double). Une question qui n'arrive pas ne coupe pas le combat ; une réponse qui rend la Bête à 0
donne la victoire, même pendant une esquive.

**Triche** : correction côté client (ADR 0001). Le serveur ne vérifie pas que le modèle répondu
est celui qu'il a tiré, ni la Province d'un coup : une réponse forgée ne fait rien de plus qu'une
trace forgée par `api/skill-attempts` ; les gidouilles restent plafonnées.

Preuves : `tests/integration/descente-combat.test.ts` ; `combat-rules`, `combat-client`,
`combat-templates` (unitaires) ; `CombatArena.svelte.test.ts`.

## Droits et pièges

- Lectures au client de l'élève (RLS) ; écriture au client service, après
  `assertSessionStudent` (`program.ts`, partagé par l'apparition et le combat) ; le niveau est lu dans le profil, jamais reçu de l'appelant.
- ⚠️ Un refus RLS sur les Bêtes vivantes ferait croire la carte vide (plus de 5 Bêtes) : prouvé en
  intégration (`tests/integration/descente-apparition.test.ts`, carte pleine et Bête repartie).
- Deux visites simultanées peuvent créer quelques Bêtes de trop, une fois : accepté par David.
