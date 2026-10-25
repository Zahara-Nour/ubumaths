# Mathoux : colliers (lot C des accessoires) — journal

> Branche `feat/mathoux-colliers`, worktree `../ubumaths-wt-mathoux-colliers`. Démarré le 2026-10-25.
> Suite de [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, après #1714 et son `db:migrate`._

- **État** : PR 1 (migration des colliers) mergée et jouée en prod ; droits relus (5 fonctions
  `service_role` seul, `search_path` en `pg_temp`, colonne `collar` présente).
- **Prochaine action** : PR 2 sur une branche neuve (`feat/mathoux-colliers-code`) : `db:types`,
  catalogue TS + test d'égalité, dessins dans `MathouAvatar` (règle de la fraise, versions
  choisies : grelot A, nœud A, cuir A, Ordre B), mémoire, routes de pose, rangée « Cou » de
  « Décorer », vitrine, vue prof, export RGPD (`collar`), en-tête de `src/lib/mathoux/decorations.ts`.
  Revue : `code-reviewer` + `security-auditor` (routes).
- **En attente de David** : rien.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ; base
  locale sans élève de démo ; un seul compte prof autorisé dans les tests.
- **Worktree / branche** : `../ubumaths-wt-mathoux-colliers` (branche `feat/mathoux-colliers`
  mergée : en partir avec une branche neuve depuis `origin/main`).

## Phase 0 — décisions (2026-10-25)

David a répondu « je te suis » aux recommandations proposées ; ce sont donc des recommandations
acceptées :

- **Fraise du grand matou** : le collier passe sous la fraise, seul ce qui pend dépasse dessous.
- **Stockage** : une seule table de décorations, avec un emplacement (`panse` / `cou`) ; une
  décoration au plus par Mathou ET par emplacement.
- **Accès** : rien de nouveau. L'élève voit les siens, le prof ceux des élèves de ses classes, les
  autres élèves rien ; écriture serveur seule.
- **Comportements** (calqués sur la panse) : acheté une fois, orne un seul Mathou à la fois ;
  déplacement et retrait gratuits ; se cumule avec la décoration de panse. Achat atomique, refus
  « Il te manque N gidouilles », double clic = un débit, consentement exigé à l'achat. Rangée
  « Cou » dans « Décorer » de la Chatterie, colliers dans la vitrine du Marché (sans achat). Sieste :
  le garde ; silhouette : rien ; vue prof : visible. Deux PR : migration, puis code.
- **Catalogue (choix de David sur la planche, 2026-10-25)** : ruban à grelot A (rouge) 10 ·
  nœud papillon A (rouge) 10 · collier de cuir A (médaille d'or) 20 · collier de l'Ordre B
  (plaques rouge et or, médaille de la Grande Passoire) 40. Foulard et perles : pas au catalogue.
  Clés : `bell`, `bow_tie`, `leather`, `order_chain`.

## Historique

- 2026-10-25 — planche des colliers : `scripts/mathoux-planches/colliers.test.ts` (`PLANCHE=1`,
  sauté sinon), rendus tirés du vrai `MathouAvatar` (chaton, matou, grand matou à la fraise, grand
  matou en sieste) + les 19 races en matou avec le collier de cuir. Page publiée.
- 2026-10-25 — PR 1 : migration. Achats dans la même table (contrainte élargie), catalogue et
  emplacement (`mathou_decoration_slot` : belly / neck) ; colonne `student_mathoux.collar` (clé vers
  les achats de l'élève, index unique partiel, CHECK par emplacement, y compris sur `decoration`) ;
  `buy_mathou_decoration` pose à l'emplacement ; `set_mathou_decoration` refuse un collier ;
  `set_mathou_collar` neuve. Preuve rouge : 21/21 échouent sans la migration (le test RGPD
  passait à vide : resserré pour exiger l'achat d'abord).
- 2026-10-25 — revue (Sonnet) et audit (Opus) de #1714 : aucun bloquant. Corrigés : test « achat
  supprimé seul → cou nu », refus explicite du visiteur (`42501`), commentaire de
  `set_mathou_decoration`. Pour la PR 2 : `collar` dans l'export RGPD et la mémoire (`memory.ts`),
  en-tête de `src/lib/mathoux/decorations.ts`, audit des routes de collier.
- 2026-10-25 — #1714 mergée (CI verte sur 47599aced). `db:migrate` refusé par le classifieur du
  mode auto : à lancer par David.
- 2026-10-25 — `db:migrate` lancé par David ; droits relus en prod (MCP lecture seule).
