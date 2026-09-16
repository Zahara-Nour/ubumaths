# Atelier — vue Données (lot 4), progression

> Spécification : [`atelier-vue-donnees-phase0.md`](atelier-vue-donnees-phase0.md),
> validée le 2026-09-16. Q1 = virgule refusée avec la correction montrée,
> Q2 = étendue côté atelier, Q3 = un troisième traçable dans le grapheur.

## Étape 1 — statistiques et ajustement affine (fait)

`src/lib/atelier/stats.ts` : `describeList()` et `fitAffine()`.

**Calculés ici, pas repris du moteur.** `.stats` et `.linreg` rendent du
**texte** — « Moyenne (mean): 12 », sans accent et à moitié en anglais — et le
relire est interdit depuis le lot 3, mesures à l'appui. `.stats` ne rend pas non
plus l'étendue, que le §4 N2 promet.

### ⚠️ Le diviseur : `n`, pas `n − 1`

Tranché par David le 2026-09-16 : c'est la **variance descriptive** du programme
français, celle de la touche σₓ d'une calculatrice.

Le moteur, lui, rend l'estimateur d'échantillon (`/(n - 1)`, mesuré
`web-repl-engine.ts:1619`). Pour `12 ; 15 ; 9` :

|                      | variance | écart-type |
| -------------------- | -------- | ---------- |
| Panneau de l'atelier | 6        | ≈ 2,45     |
| `.stats 12,15,9`     | 9        | 3          |

**Les deux sont justes**, ils ne répondent pas à la même question. Mais un élève
qui essaierait les deux verrait deux nombres différents pour la même série.

> 🔜 **Dette notée.** Harmoniser demanderait soit de changer `.stats` (module
> partagé avec le CLI, où l'estimateur non biaisé est légitime), soit de nommer
> les deux dans l'affichage. **Déclencheur : si un élève ou David bute
> réellement dessus** — pas avant, parce que les commandes `.stats`/`.linreg`
> sont marquées « avancées » et que le geste normal est l'action du panneau.

## Étape 2 — le séparateur de liste (fait)

`12, 15, 9` est ce qu'un élève écrit spontanément ; l'atelier le lisait comme
**une seule valeur illisible**, sans rien expliquer.

Il est désormais refusé avec la correction **sur sa propre saisie** :
« Sépare tes valeurs par des points-virgules : 12 ; 15 ; 9 ».

Le test est précis pour ne pas accuser un décimal : un segment n'est fautif que
s'il **ne se lit pas** comme un nombre ET que le découper sur les virgules donne
plusieurs nombres valides. `3,14` passe, `1,5 ; 2,5` passe, `12,15,9` est repris.

## Étape 3a — le nuage comme type traçable (fait)

`ScatterPlottable` rejoint `ExplicitFunction` et `SequencePlottable` dans
`Plottable`, avec sa garde `isScatter` et son schéma de persistance.

Il vit dans le grapheur (Q3) parce que **superposer le nuage et sa droite
d'ajustement est tout l'intérêt** : deux repères séparés rendraient le geste
impossible.

### Deux pièges relevés

**Le `{:else}` de la boucle de rendu.** `GraphSVG` fait
`{#if type === 'explicit'} … {:else} <SequencePlot>` : un troisième type y
tomberait et serait dessiné **comme une suite**. Un test vérifie qu'un nuage
n'est ni une fonction ni une suite ; le rendu devra tester le type
explicitement.

**L'identifiant devait être un UUID.** Mon schéma acceptait
`z.string().min(1)`, alors que les deux autres traçables exigent un UUID — un
nuage se serait rangé ici et nulle part ailleurs. Trouvé parce que mon test de
non-régression sur les fonctions utilisait `id: 'f1'` et échouait : c'est en
cherchant pourquoi que l'incohérence est apparue.

Le plafond des séries est celui de D8 (200), le même que `MAX_LIST_VALUES` :
deux plafonds différents laisseraient passer un état qu'on ne saurait pas
relire.

## Étapes suivantes

- [ ] Étape 3b — le rendu du nuage et son ajout au store
- [ ] Étape 4 — l'ajustement affine crée une fonction traçable (§3)
- [ ] Étape 5 — la vue Données et ses actions
