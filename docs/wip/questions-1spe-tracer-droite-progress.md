# Chantier `questions-1spe-tracer-droite` — tracer une droite par un point et sa pente (1SPE-433)

Sous-chantier de `questions-1spe` (clos, journal `docs/archive/wip/questions-1spe-progress.md`, § 3.2 :
433 classé C). Le geste existe : `tracer:` du bloc ` ```courbe `, livré par #2265 (journal
`docs/archive/wip/points-repere-progress.md` § 8-9). Skill `couvrir-niveau` ; pièges `couvrir-un-niveau.md` § 9 ; bornes
`docs/systeme/programmes/bornes/lycee/1spe.md`.

## Reprendre ici

_Mis à jour le 2026-11-03, après #2272._

- **État** : modèle 433 mergé (#2272), brouillon en base locale ; **aperçu admin validé par David
  le 2026-11-03** ; #2265 en prod (0.65.0) : le brouillon peut être créé en prod.
- **Prochaine action** : aucune sur 1SPE-271 : **repris par le chantier `questions-1spe-tangente`**
  (branche `feat/questions-1spe-tangente`, décision de David du 2026-11-03) ; § 6 abandonné, ne pas
  écrire de modèle 271 ici. Il reste la livraison du 433 (ligne suivante).
- **En attente de David** : `pnpm tsx scripts/create-questions.ts --dir scripts/questions/1spe-tracer-droite --publier`
  (brouillon en prod), puis migration nœud + tag, page à cocher, publication.
- **Pièges en cours** : un serveur de dev de la veille bloquait le SSR (connexion sans fin) : le
  relancer a suffi.
- **Worktree / branche** : aucun (retiré après #2272).

---

## 1. Relevé (MCP prod, lecture seule, 2026-11-03)

**Points** (même nœud `d04f8c65`, sous-notion des équations de droites) :

| Point       | Énoncé                                                                | Modèles                                                              |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1SPE-433    | Tracer une droite donnée par un point et son coefficient directeur    | 0                                                                    |
| 1GEN-063    | même énoncé (automatismes de 1re générale)                            | 0                                                                    |
| 1TECHNO-140 | même énoncé (automatismes de 1re techno)                              | 0                                                                    |
| 2-316       | Tracer une droite connaissant son équation réduite                    | 1 : `8d4bd94d` publié, **case choix entre 4 figures** (en attendant) |
| 2-445       | Tracer une droite connaissant son équation cartésienne                | 1 : `2cfae58d` publié, idem                                          |
| 1SPE-271    | Construire la tangente connaissant le nombre dérivé (nœud `e7f414da`) | 0                                                                    |

**Automatismes de 1re déjà couverts** (patron à suivre) : `33dffa7a` (1SPE-432, Fonctions / Généralités /
Signe, niveau 2) et `7d6cf480` (1SPE-434, Géométrie / Droites du plan / Pente et vecteur directeur,
niveau 1) : niveaux scolaires `['1_SPE', '1_GEN', '1_TECHNO']` (+ `2` pour 7d6cf480), tag du seul point
1SPE.

**Catégorie Géométrie / Droites du plan** (tous statuts, tous niveaux scolaires) :

- Équations de droites : niveaux **1 à 7 pris** (7f308eb4, 7c0f1c1a, e6552232, 6e074f0e, d8a958ba,
  8d4bd94d, 2cfae58d), tous publiés, nœud `d04f8c65` → **8 libre**.
- Pente et vecteur directeur : 1 à 6 pris (nœuds `e3f91bf9`, `93d7c87b`).
- Positions relatives : 1 à 3.

Voisin utile : `e6552232` (2de, « Équation d'une droite par un point et sa pente ») — mêmes données
d'énoncé, réponse écrite ; et `f381c646` (lire la pente sur un graphique), dont la correction montre
la droite avec deux points (patron de la correction).

## 2. Phase 0 — proposée le 2026-11-03

Un modèle, **« Tracer une droite donnée par un point et sa pente »**.

- **Point** : 1SPE-433 seul ; sous-notion : nœud `d04f8c65`. Catégorie Géométrie / Droites du plan /
  Équations de droites, **niveau 8**. Niveaux scolaires `['1_SPE', '1_GEN', '1_TECHNO']`.
- **Énoncé** : « Dans un repère, la droite $d$ passe par le point $A(x_A ; y_A)$ et a pour coefficient
  directeur $m$. Trace la droite $d$. », puis ` ```courbe ` x, y : −6 ; 6, grille 1, `tracer:` avec
  l'équation calculée (jamais affichée pendant le geste).
- **Variations** :
  1. pente entière, m ∈ ±1..3, A à coordonnées entières (x_A ∈ −4..4, y_A ∈ −5..5), condition : le point
     A + (1 ; m) reste dans la fenêtre ;
  2. pente fractionnaire m = k/q, q ∈ {2, 3}, k ∈ ±1..3, fraction irréductible (« avancer de q, monter
     de k »), condition : A + (q ; k) dans la fenêtre.
- **Réponse** : la case du geste (deux points, juste si les deux sont sur d) ; phrases d'erreur du geste.
- **Correction** : « On place A, puis on avance de 1 (de q) et on monte de m (de k) » ; repère avec d, A
  et B = A + (1 ; m), comme `f381c646`.
- **testSpecs** : deux points justes (A et B) ; erreurs typiques : pente opposée (B = A + (1 ; −m)),
  pente inversée (A + (m ; 1)), un seul point, deux points confondus.
- **Question d'accès** de la migration (nœud + tag sur un brouillon) : personne ne pourra lire quoi que
  ce soit de neuf (brouillon, visible de l'auteur et de l'admin seulement).

## 3. Questions à David

1. **Point A dessiné dans le repère** (l'élève trace à partir de A) ou **non dessiné** (l'élève place A
   lui-même d'après ses coordonnées) ? Reco : non dessiné en variation 1 et 2 — c'est le geste du BO ;
   à vérifier que `points:` et `tracer:` cohabitent si tu préfères le dessiner.
2. **Pente fractionnaire** (variation 2) : la garder ? Reco : oui, c'est l'intérêt du point (avancer de
   q, monter de k) ; les automatismes de 1re la contiennent.
3. **1SPE-271** (tangente connaissant f′(a)) : même geste (` ```courbe ` avec f et `tracer:`). Le
   traiter dans ce sous-chantier (second modèle, même PR) ou plus tard ? Reco : même lot, après
   validation de ce modèle-ci.
4. **2-316 / 2-445** : leurs modèles publiés (case choix) sont à réécrire au geste ; ce sous-chantier
   ne les touche pas (ils appartiennent à `questions-2de`) — d'accord ?

## 4. Phase 0 : décisions (David, 2026-11-03, « je suis tes recos »)

1. A **non dessiné** : l'élève le place d'après ses coordonnées.
2. Pente fractionnaire **gardée** (variation 2).
3. 1SPE-271 (tangente) : **dans ce sous-chantier**, après ce modèle-ci (phase 0 au § 6).
4. 2-316 / 2-445 : laissés à `questions-2de` (ajoutés au « Contenu restant » de `outils-manquants.md`).

## 5. Modèle 433 : fait (2026-11-03, #2272)

`docs/wip/questions/lot-1spe-tracer-droite.py` → `scripts/questions/1spe-tracer-droite/01-…json`.
Équation de `tracer:` : `y = mx + p` (V1), `y = k/qx + c/q` (V2, `\frac` refusé) ; la phrase d'erreur
la met au propre (`equationLatex` : `y = -1/2x + 2/2` → « y = 1 − x/2 »). 11 specs vertes,
`sonde-courbes` 300 tirages 0 problème, base locale `18bd977d`. Aperçu admin pas joué (Chrome
revenait à un onglet vide sur `localhost:5180`).

## 6. Phase 0 de 1SPE-271 : proposée le 2026-11-03

> ⛔ **Abandonné le 2026-11-03 : repris par le chantier `questions-1spe-tangente`** (journal
> `docs/wip/questions-1spe-tangente-progress.md`, branche `feat/questions-1spe-tangente`), sur décision
> de David. Modèle 271 écrit là-bas (Fonctions › Dérivation › Tangente, niveau 4 ; tags 1SPE-271 +
> 1TECHNO-078 ; 1_SPE + 1_TECHNO). Ne pas écrire de modèle 271 dans ce chantier ; la phase 0
> ci-dessous reste pour l'historique.

Un modèle, **« Tracer la tangente connaissant le nombre dérivé »** (Analyse › Dérivation : catégorie
et niveau à relever en prod avant d'écrire ; niveaux scolaires 1_SPE seul, le point n'est pas un
automatisme).

- **Énoncé** : courbe 𝒞f tracée, point A(a ; f(a)) **dessiné** sur elle (`points:`), « f′(a) = m.
  Trace la tangente à 𝒞f au point A. » ; `tracer:` = y = f(a) + m(x − a).
- **Fonction** : parabole f(x) = α(x − a)² + m(x − a) + b (α = ±1/2 ou ±1), a et b entiers, pour que
  f′(a) = m soit vrai et que la courbe tienne dans la fenêtre −6..6.
- **Variations** : 1. m entier ±1..3 ; 2. m = 0 (tangente horizontale, au sommet) ; 3. m fractionnaire
  ±1/2, ±3/2.
- **Correction** : « La tangente passe par A et a pour coefficient directeur f′(a) = m : depuis A, on
  avance de 1 (de q) et on monte de m (de k) » ; repère avec 𝒞f, la tangente, A et B.
- **Specs** : A et B justes ; erreurs : tangente de pente opposée, droite par A et un autre point de la
  courbe (sécante), pente inversée.
- **Question d'accès** : brouillon, personne ne lit rien de neuf.

Questions : (a) A dessiné sur la courbe (reco : oui, la tangente en un point de la courbe, le point
est donné par la figure) ; (b) les trois variations, dont m = 0 (reco : oui).
