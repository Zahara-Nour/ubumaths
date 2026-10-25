# Mathoux : chapeaux et lunettes (lot D des accessoires) — journal

> Branche `feat/mathoux-chapeaux-lunettes`, worktree `../ubumaths-wt-mathoux-chapeaux-lunettes`.
> Démarré le 2026-10-25. Suite de [mathoux-colliers-progress.md](mathoux-colliers-progress.md)
> (lot C) et [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, après #1747._

- **État** : lot D LIVRÉ sur `main` (pas en prod) : migration en prod (#1734, #1739), code mergé
  (#1747, CI verte sur a805a3409 ; audit sécurité sans finding, revue : 2 mineurs corrigés).
- **Prochaine action** : recette par David (ligne #1747 de `docs/wip/verifications-manuelles.md`),
  puis clôture : journal archivé (le durable est déjà dans `docs/systeme/mathoux.md`).
- **En attente de David** : la recette ; le `deploy:prod` quand il le voudra.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ;
  dessins figés par l'instantané `mathou-chapeaux-lunettes.test.ts` (un dessin changé → revoir,
  puis `-u`).
- **Worktree / branche** : supprimés après le merge.

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
- 2026-10-25 — #1739 mergée ; `db:migrate` (seule migration en attente, `--dry-run` vérifié) ;
  droits relus en prod (MCP lecture seule). Branches mergées supprimées.
- 2026-10-25 — PR 2 (code) : catalogue TS, dessins retenus (`mathou-chapeaux-lunettes.ts`, repris
  de la planche, rendus en `DecorationShape` : `fillOpacity` et `dash` ajoutés), rendu (lunettes
  après les moustaches, chapeau à la place de la couronne, fondu `remis` au réveil), routes,
  mémoire, nouveautés, export, Chatterie, Marché, vue prof, doc.
- 2026-10-25 — PR 2 #1747 ouverte. Audit sécurité (Opus) : rien. Revue (Sonnet) : dessins fidèles
  à la planche, 3 mineurs → accord par `plural` dans le catalogue (plus par le nom), instantané des
  dix dessins ; le cast `null as string` (comme `wearMathouCollar`) laissé.
- 2026-10-25 — #1747 mergée (CI verte sur a805a3409). Worktree et branche supprimés.
