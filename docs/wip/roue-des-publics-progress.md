# La roue des publics — journal du chantier

> Branche `feat/roue-des-publics` (worktree `../ubumaths-wt-royaume`), ouverte le 2026-10-11.
> Suite du [Tour du Royaume](../systeme/carte-des-fonctionnalites.md#le-tour-du-royaume-royaume) (#1104).

## Décisions de David (2026-10-11)

- La page doit parler à **quatre publics** : élèves, parents, professeur (pas mis de côté),
  visiteur anonyme. Peu de texte : des images, des phrases directes.
- **Accueil très simple** (l'univers, le but) et **aiguillage par une roue** : Élève, Parent,
  Professeur. Chacun mène à **sa vue** (provisoire : `/eleves`, `/parents`, `/professeurs`).
- La roue est présente sur l'accueil **et** sur chacune des trois vues :
  - accueil : **visiteur anonyme seulement** ; elle **dérive autour de Père Ubu** comme sur l'eau
    (lente, fluide, irrégulière), et **se pose de temps en temps** ;
  - vues : fixée en bas à droite, pour tout le monde.
- **Sur ordinateur, le survol ouvre la roue** (le clic est inutile) ; au doigt et au clavier, on clique.
- **Apparence retenue** : la **chandelle verte à flamme verte**, sans fond ni bord (essais
  `?roue=nu&icone=flamme-verte`, paramètres retirés depuis). Bougeoir de laiton noirci cerné
  d'encre comme le dessin de Père Ubu ; lumière propre à la flamme (indépendante du halo du mois),
  halo visible au repos, plus vif au survol, **au-dessus** du halo de Père Ubu.
- **`/royaume` reste** la présentation détaillée du lore ; le lien « Visiter le Royaume » est
  **retiré de l'accueil** (Père Ubu y mène encore : à confirmer).
- « Infos et confidentialité » passe dans le **coin inférieur droit** de l'accueil.
- Pas d'effet quand elle se pose ; **une seule fois**, elle **se dérobe** quand la souris
  approche pour l'attraper (glissement adouci, retour lent), puis se laisse prendre.
- ✅ **Bouton chandelle validé par David** (2026-10-11).
- **Niveau visé : du CM1 à la Terminale** (la description SEO de l'accueil dit « de la 6ᵉ » : à corriger).

## Fait (maquette, non poussée)

- `src/lib/kingdom-tour/audiences.ts` (les trois publics), `drift.ts` (géométrie et dérive, pures).
- `src/lib/components/kingdom-tour/AudienceWheel.svelte` (`placement`: `corner` | `orbit`).
- Accueil : roue en orbite, lien retiré ; `+layout.svelte` : pied de page à droite.
- Trois vues vides (`/eleves`, `/parents`, `/professeurs`).

## Reste à faire

- [ ] Contenu des trois vues (questions ouvertes : « gratuit », qui est derrière, suivi des
      parents, enseignants extérieurs, images) ; liens de secours dans chaque vue (sans JS).
- [ ] Père Ubu reste-t-il la porte de `/royaume` ? Lien vers `/royaume` depuis la vue élève.
- [ ] Mouvement continu (dérive, flamme) et critère WCAG 2.2.2 : arbitrage de David en attente.
- [ ] Tests : `drift.ts` (bornes, flanc vs tour complet), roue (survol, clic, clavier, tactile,
      Échap, anonyme seulement sur l'accueil), accueil (test « Visiter le Royaume » à remplacer).
- [ ] Sitemap, doc (`carte-des-fonctionnalites.md`, CONTEXT.md), revue, PR.
