# Mathoux : chapeaux et lunettes (lot D des accessoires) — journal

> Branche `feat/mathoux-chapeaux-lunettes`, worktree `../ubumaths-wt-mathoux-chapeaux-lunettes`.
> Démarré le 2026-10-25. Suite de [mathoux-colliers-progress.md](mathoux-colliers-progress.md)
> (lot C) et [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, PR 1 (#1734) en revue._

- **État** : PR 1 #1734 (migration `20261026000100`) ouverte ; revue (Sonnet) et audit (Opus) sans
  bloquant, corrections poussées ; 22/22 rouges sans la migration, verts avec. Comportements
  validés par David : chapeau gardé à la transformation (pas de couronne), lunettes et chapeau en
  fondu au réveil, clés anglaises, une fonction de pose par emplacement.
- **Prochaine action** : CI verte → merge → `db:migrate` (depuis la branche mergée ; refusé la
  dernière fois par le mode auto → David) → PR 2 (`db:types`, dessins, rendu, routes, Chatterie,
  Marché, vue prof, mémoire, nouveautés, **export RGPD `glasses`/`hat` + `export.test.ts`**,
  doc `docs/systeme/mathoux.md`).
- **En attente de David** : peut-être `db:migrate`.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ;
  chapeau à l'échelle bornée (0,92 à 1,35 de la tête du matou), sinon trop petit sur le grand matou.
- **Worktree / branche** : `../ubumaths-wt-mathoux-chapeaux-lunettes`, `feat/mathoux-chapeaux-lunettes`.

## Catalogue (choisi par David le 2026-10-25, planche https://claude.ai/artifact/7iaTAB3MWhm6dCg764kKqb)

| Emplacement | Modèle               | Dessin retenu (id de la planche)       | Prix |
| ----------- | -------------------- | -------------------------------------- | ---- |
| Yeux        | Lunettes rondes      | monture dorée (`rondes-b`)             | 10   |
| Yeux        | Lunettes de soleil   | verres noirs (`soleil-a`)              | 10   |
| Yeux        | Monocle              | d'or à chaînette (`monocle-a`)         | 20   |
| Yeux        | Pince-nez            | doré, cordon noir (`pince-nez-a`)      | 20   |
| Yeux        | Lunettes à gidouille | spirales noires (`gidouille-a`)        | 40   |
| Tête        | Chapeau melon        | noir, ruban rouge (`melon-a`)          | 10   |
| Tête        | Béret                | rouge (`beret-a`)                      | 10   |
| Tête        | Canotier             | ruban rouge (`canotier-a`)             | 10   |
| Tête        | Haut-de-forme        | noir à ruban rouge (`haut-de-forme-a`) | 20   |
| Tête        | Chapeau pointu       | noir à la lune d'or (`pointu-b`)       | 20   |

Bicorne : pas au catalogue.

## Phase 0 — décisions (2026-10-25)

- **Emplacements** : deux nouveaux, **yeux** (lunettes) et **tête** (chapeaux) ; une pièce au plus
  par emplacement, cumulables entre eux et avec panse et cou.
- **Règles** (calquées sur panse et cou, recommandation acceptée) : achetée une fois, orne un seul
  Mathou à la fois ; déplacement et retrait gratuits ; consentement exigé à l'achat ; vitrine du
  Marché sans achat ; vue prof : visible ; silhouette : rien.
- **Grand matou** (choix de David) : le chapeau **remplace la couronne** ; sans chapeau, la
  couronne revient.
- **Sieste** (recommandation acceptée) : le **bonnet de nuit remplace le chapeau** ; le chapeau
  revient au réveil.
- **Lunettes en sieste** (choix de David) : **retirées** pendant la sieste, reviennent au réveil.
- **Stockage** (recommandation acceptée) : comme les colliers — même table d'achats
  (`student_mathou_decorations`), même catalogue, emplacements `eyes` / `head` ; deux colonnes
  nullables neuves sur `student_mathoux` (`glasses`, `hat`). Une migration additive, puis le code.
- **Accès** (question tranchée en phase 0 : rien de nouveau) : l'élève voit les siennes, le prof
  celles de ses élèves, les autres élèves rien ; écriture serveur seule.

## Historique

- 2026-10-25 — phase 0 tranchée (questions posées en fin de session des colliers, #1725).
- 2026-10-25 — planche `scripts/mathoux-planches/chapeaux-lunettes.test.ts` publiée pour le choix.
- 2026-10-25 — catalogue choisi par David (10 pièces, bicorne écarté).
- 2026-10-25 — PR 1 #1734 : migration (catalogue, emplacements `eyes`/`head`, colonnes
  `glasses`/`hat`, `set_mathou_glasses`/`set_mathou_hat`) ; preuve rouge 22/22. Revue (Sonnet) :
  doc du schéma, test d'accès qui essaie de vraies poses et l'achat, commentaire d'index faux
  (recopié des colliers) → corrigés. Audit (Opus) : aucun bloquant ; export RGPD à compléter en PR 2.
- 2026-10-25 — #1734 mergée (CI verte sur ca3118194). Avant `db:migrate` : `20261026000000`
  (autre session) déjà en prod, la nôtre devenue « antérieure » → renommée `20261026000100`
  (pas de `--include-all` sans David).
