---
couvre:
  - 'src/lib/descente/**'
  - 'src/lib/server/descente/**'
---

# La Descente de la Vistule — le jeu de combats

> Vérifié contre le code le 2026-11-18 (étape 2 : apparition des Bêtes). Conception et
> décisions de David : [navadra-progress.md](../wip/navadra-progress.md) (§ « Tranché », phases 0
> de la v1 et de l'étape 2). Vocabulaire : [CONTEXT.md](../../CONTEXT.md) (Bête imprévue,
> coup / sort, carnet de voyage).

L'élève combat des **Bêtes imprévues** nées de ses besoins ; chaque coup ou sort se valide par une
question. Le jeu se construit par étapes (une PR par étape) : seules les fondations en base
(étape 1) et l'apparition des Bêtes (étape 2) existent ; **aucune page ne les appelle encore**
(carte et entrée de menu à l'étape 4).

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

| Règle          | Valeur                                                                   |
| -------------- | ------------------------------------------------------------------------ |
| Rythme         | une Bête ordinaire toutes les 8 h (première visite : 3)                  |
| Plafond        | 5 Bêtes ordinaires vivantes ; au-delà, le dû est perdu                   |
| Reste du temps | gardé : la k-ième Bête due est datée de la dernière apparition + k × 8 h |
| Départ         | 3 jours ; jamais pour un point à remédier (reste jusqu'à sa défaite)     |
| Grosse Bête    | une tous les 7 jours (dès la première visite), reste 7 jours, hors des 5 |
| Points de vie  | 100 / 300, **provisoires** (réglés à l'étape 3)                          |
| Tutoriel       | ne compte pour rien dans l'apparition                                    |

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

## Droits et pièges

- Lectures au client de l'élève (RLS) ; écriture au client service, après
  `assertSessionStudent` ; le niveau est lu dans le profil, jamais reçu de l'appelant.
- ⚠️ Un refus RLS sur les Bêtes vivantes ferait croire la carte vide (plus de 5 Bêtes) : prouvé en
  intégration (`tests/integration/descente-apparition.test.ts`, carte pleine et Bête repartie).
- Deux visites simultanées peuvent créer quelques Bêtes de trop, une fois : accepté par David.
