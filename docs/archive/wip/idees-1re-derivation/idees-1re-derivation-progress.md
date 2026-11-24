# Chantier `idees-1re-derivation` : idées de la rubrique « dérivation » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-24, chantier clos._

- **État** : rubrique **publiée** : les 2 modèles neufs sont publiés et validés par David ; les 13
  variations des 7 publiés aussi (série de relecture `1cea2ab1`) ; journal archivé ·
  **Prochaine action** : aucune · **En attente de David** : rien · **Worktree / branche** : aucun.

## Journal

### 2026-11-23 — réservation, relevé, phase 0

- Rubrique 1AN1 (12 exercices) réservée dans [idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md) (`cc3b3979a`).
- Relevé : 3 ✅, 9 🟡, 0 ❌. Nos 21 modèles de 1re spé couvrent chaque exercice au moins en partie ;
  il manque des cas (inverse dans le taux, autres courbes, tangente à une rationnelle, coefficients
  fractionnaires ou décimaux, produits et quotients plus variés).
- Phase 0 : 2 modèles neufs (F1 nombre dérivé de l'inverse par le taux, 1SPE-260, 1 SPE seul ;
  F2 tangente à une fonction rationnelle, 1SPE-272) et 13 variations sur 7 modèles publiés (F3 à F9).
  F10 : ce qui n'est pas repris, et pourquoi.
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).
- Message reçu de la session `idees-6e-entiers-decimaux` : `migration-contenu.ts` saura bientôt
  écrire les `options` d'un modèle publié (branche `feat/migration-contenu-options`). Rien à faire ici
  tant qu'aucune variation ne demande de changer les options.

### 2026-11-23 — phase 0 validée

- David : « je valide tout » (F1 à F10, comme proposé). Les 7 modèles publiés sont réservés dans le
  tableau de répartition.

### 2026-11-23 — lot écrit

- Scripts `docs/wip/questions/idees-1re-derivation-{neufs,publies}.py`. F1 : a > 0 et fractions
  irréductibles (un a négatif rendait la réponse attendue « forme à améliorer ») ; F2 : variable
  `q` (pas `e`). Erreurs prévues : 2 ou 3 par case, aucune inventée ; coup de pouce partout.
- Formes « à améliorer » (form = warn des modèles) : numérateur factorisé d'un quotient,
  3/2 x² dans le modèle décimal, somme non réduite — specs `unoptimal_form`, comme les publiées.
- Vérifs : `create-questions` simulation verte (2 neufs, 7 publiés) ; `sonde-courbes` 0 problème
  (600 blocs) ; 5 774 formules d'aperçu passées à `validateLatex` + accolades, 0 erreur.
- Base locale : neufs créés et joués (ids locaux retirés) ; migration de contenu jouée par
  `db:a-jour` ; rendu vu dans l'aperçu admin (Chrome, lien du tailnet) : quotient −4x²/(x − 5),
  courbe de degré 3, pente 1/3.
- Rangement : F1 « Fonctions > Dérivation > nombre dérivé », 1SPE-260, niveau 2 ; F2
  « … > tangente », 1SPE-272, niveau 3 (niveaux relevés en prod).

### 2026-11-23 — #3049 mergée, migrations en prod

- Brouillons créés en prod par David (ids commités). Migration de rangement générée ; migration de
  contenu re-horodatée (`165942` → `173052`) : trois migrations d'autres sessions étaient déjà en
  prod après `165942`. `security-auditor` : aucun finding bloquant (notes : texte commun « niveaux »
  de l'en-tête du rangement, sans effet). Tests d'intégration des deux fixtures verts.
- CI verte, merge par `pr:merger`, `migration list --linked` (seules les deux du lot en attente),
  `db:migrate`, état vérifié par le MCP.

### 2026-11-23 — relecture validée

- Série de relecture `1cea2ab1` enregistrée par David ; PR #3051 pour l'id. David : « je valide les
  modèles ». `publier-lot.ts` en simulation : 2 brouillons passent le contrôle.

### 2026-11-24 — #3051 mergée, rubrique publiée

- #3051 mergée (id de la série de relecture). David a lancé `publier-lot.ts --publier` : les 2 neufs
  (`904fb546`, `d1cf9d7c`) sont `published` (vérifié, MCP lecture seule).
- Rubrique « publiée » au tableau de répartition ; journal archivé.
