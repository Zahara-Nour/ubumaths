# Mathoux : colliers (lot C des accessoires) — journal

> Branche `feat/mathoux-colliers`, worktree `../ubumaths-wt-mathoux-colliers`. Démarré le 2026-10-25.
> Suite de [mathoux-accessoires-progress.md](mathoux-accessoires-progress.md) (lots A et B).

## Reprendre ici

_Mis à jour le 2026-10-25, avant la première PR._

- **État** : phase 0 en cours. Règles du lot validées (voir ci-dessous) ; planche des colliers
  publiée : https://claude.ai/artifact/NTfGjcg3yE9cC4gq35RWoj (choix lus dans sa base, `choix/david`).
- **Prochaine action** : lire les choix de David sur la planche, les noter ici, puis PR 1
  (migration : emplacement `panse` / `cou` dans le catalogue des décorations + intégration).
- **En attente de David** : choix sur la planche (version A/B ou « pas au catalogue », prix).
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ;
  la base locale n'a pas d'élève de démo.
- **Worktree / branche** : `../ubumaths-wt-mathoux-colliers` · `feat/mathoux-colliers`.

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
- **Catalogue et prix** : pas tranchés, à choisir sur la planche (6 colliers × 2 versions, prix
  proposés 10 / 20 / 40).

## Historique

- 2026-10-25 — planche des colliers : `scripts/mathoux-planches/colliers.test.ts` (`PLANCHE=1`,
  sauté sinon), rendus tirés du vrai `MathouAvatar` (chaton, matou, grand matou à la fraise, grand
  matou en sieste) + les 19 races en matou avec le collier de cuir. Page publiée.
