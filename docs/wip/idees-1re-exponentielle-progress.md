# Chantier `idees-1re-exponentielle` : idées de la rubrique « fonction exponentielle » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-24, après #3089 (migrations en prod)._

- **État** : `20261124134647` et `20261124134708` **en prod** (poussées par la session `idees-tle-ln`) ;
  vérifié : 6 brouillons sur leur nœud avec leur point, 4 publiés à 4/4/5/6 variations ; série
  `scripts/series/1_SPE-relecture-exponentielle-publies.json` (4 modèles, 1 × 60 s, 4 min), simulation
  verte en prod · **Prochaine action** : David publie la série (commande `!` ci-dessous), puis commit de
  l'id + PR `chore/idees-1re-exponentielle-relecture`, puis relecture dans `/dev/modeles` (brouillons
  par `?noeud=`, publiés par la série) · **En attente de David** : `! cd ../ubumaths-wt-idees-1re-exponentielle-relecture && pnpm tsx scripts/series/creer-serie.ts --fichier scripts/series/1_SPE-relecture-exponentielle-publies.json --publier`
  · **Pièges en cours** : aucun · **Worktree / branche** : `ubumaths-wt-idees-1re-exponentielle-relecture`
  / `chore/idees-1re-exponentielle-relecture`.

## Journal

### 2026-11-24 — réservation, relevé, phase 0

- Rubrique 1AN3 (11 exercices) réservée dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md)
  (`0212f8817`).
- Relevé : 1 ✅, 8 🟡, 2 ❌ (équation produit nul, inéquation produit). Aucun brouillon de 1re sur
  l'exponentielle en prod.
- Phase 0 : il y a 6 modèles neufs.
  - F1 : développer (1SPE-294).
  - F2 : équation produit nul (1SPE-405).
  - F3 : inéquation produit (1SPE-405).
  - F4 : dériver un produit avec e^{kx} (1SPE-394).
  - F5 : dériver un quotient (1SPE-396).
  - F6 : tableau de variations à remplir (1SPE-283).

  À côté, 6 variations sur 4 modèles publiés : F7 6a5e58da, F8 68166a11, F9 227f2c9c, F10 15d3aaa0. F11
  dit ce qui n'est pas repris, et pourquoi.

- Bornes de 1re appliquées : pas de ln, donc pas de zéro de a + beˣ hors a = −b ; pas de limite dans
  les tableaux ; seule composée e^{ax+b}.
- Nœuds et points vérifiés en base (règle « point sur le nœud du modèle ou sa notion ») : 1SPE-405 sur
  « Fonction exponentielle > variations », 1SPE-292 sur la notion, 1SPE-394/396 sur « Dérivation >
  opérations sur les dérivées », 1SPE-283 sur « Dérivation > variations et extremums ».
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).

### 2026-11-24 — modèles neufs validés, lot écrit

- David : « je valide les modèles ». La page à cocher n'a aucun verdict : je le lis comme un oui à
  F1–F6 (modèles neufs). F7–F10 (variations de publiés) ne sont pas tranchés : la question lui est
  reposée.
- 6 modèles, 22 variations, 108 specs : chaque case a deux ou trois erreurs prévues, et chaque
  variation un coup de pouce. Les tableaux (F6) n'ont ni limite ni ln.
- F5 : forme en avertissement (`form: warn`) : (1 − 2x)e^{−x} est une « forme à améliorer » de
  (−2x + 1)/eˣ, pas une erreur.
- Vérifs : `question:specs` 108/108, 1 100 tirages réussis ; `create-questions` en simulation vert ;
  2 522 formules d'aperçu passées à `validateLatex` + accolades, 0 problème.
- Base locale : 6 brouillons créés (ids locaux retirés des fichiers). Rendu vu par `pnpm voir` :
  tableau à compléter de F6 (ordinateur) et ensemble S de F2 (iPhone).

### 2026-11-24 — variations validées, brouillons en prod, migrations

- David : « je valide les variations et les modeles » (F7 à F10 compris). 4 modèles publiés réservés
  dans le tableau (`7e6f0ddd8`).
- Brouillons créés en prod par David (13 h 44) : a540eb67 (F1), a90f018e (F2), b72f757b (F3),
  2f0add65 (F4), 4c5c5839 (F5), f61ddbbb (F6).
- Publiés exportés de prod, variations ajoutées à la fin (script
  `docs/wip/questions/idees-1re-exponentielle-publies.py`) : 6a5e58da +2 (≤ 1, > 1/e), 68166a11 +2
  (> 0 → ℝ, ≤ 0 → ∅, case « intervalles »), 227f2c9c +1 (ae^{kx} + bx + c), 15d3aaa0 +1 (tangente
  en 0 à (ax + b)e^{kx}). Specs 94/94 (anciennes comprises), 950 tirages, 1 525 formules : 0
  problème.
- Niveaux relevés en prod dans les 4 sous-notions : ceux du lot s'y insèrent (pas de renumérotation).
- Migrations générées ; tests d'intégration des deux fixtures verts (165 tests).

### 2026-11-24 — #3089 mergée

- `security-auditor` : aucun finding bloquant (notes : garde de présence modèle par modèle dans la
  migration de contenu, en-tête « niveaux » du gabarit de rangement). CI verte, merge par `pr:merger`.
- `db:migrate` **pas lancé** : `migration list --linked` montre aussi `20261124134110`
  (`idees-tle-ln`, contenu de publiés), qui serait poussée avec les nôtres.
