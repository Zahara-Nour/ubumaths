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
- **Qui est derrière** : reprendre ce que disent déjà les pages du panneau « Infos » — « un
  enseignant agrégé de mathématiques et ingénieur en informatique, passionné de littérature et
  d'illusionnisme » (`/a-propos`), sans nom ; contact@chiph.re (mentions légales).
- **Niveau visé : du CM1 à la Terminale** (description SEO de l'accueil corrigée).
- **Argent** (le site deviendra payant pour les élèves hors de ses classes ; suivi personnalisé
  payant, contenu pas entièrement ouvert aux anonymes) : n'écrire que ce qui restera vrai —
  « Sans publicité. » ; « En accès libre, sans compte : » + la liste des outils libres ;
  « Pour les élèves de ses classes, Chiphre est entièrement gratuit. » Jamais « gratuit » seul,
  « tout est accessible », « pour toujours ». Pas d'annonce de l'offre payante avant qu'elle existe.
  ⚠️ Le pacte du Compendium (§ Phynance, « l'argent réel n'achète jamais d'avantage
  pédagogique ») sera à réécrire quand l'offre sera définie.
- **Adresses** : `/eleves`, `/parents`, `/professeurs` (confirmées).
- **Suivi des parents** : dire franchement qu'il n'y a pas de compte parent ; le professeur peut
  donner le lien du cahier de textes.
- **`/royaume`** : Père Ubu reste cliquable vers `/royaume` sur l'accueil ; la vue élève y renvoie
  (« Découvrir le Royaume en détail »).

## Fait (maquette, non poussée)

- `src/lib/kingdom-tour/audiences.ts` (les trois publics), `drift.ts` (géométrie et dérive, pures).
- `src/lib/components/kingdom-tour/AudienceWheel.svelte` (`placement`: `corner` | `orbit`).
- Accueil : roue en orbite, lien retiré ; `+layout.svelte` : pied de page à droite.
- Trois vues vides (`/eleves`, `/parents`, `/professeurs`).

## Reste à faire

- [ ] Contenu des trois vues (plans à valider) ; liens de secours dans chaque vue (sans JS).
- [ ] Mentions légales : éditeur « [A COMPLETER] » (responsable, statut, adresse), en prod —
      à remplir par David avant la mise en ligne des vues.
- [ ] Lien vers `/royaume` depuis la vue élève.
- [x] Mouvement continu et WCAG 2.2.2 (D19) : tout se pose au bout d'une minute (David, 2026-10-11).
- [ ] Tests : `drift.ts` (bornes, flanc vs tour complet), roue (survol, clic, clavier, tactile,
      Échap, anonyme seulement sur l'accueil), accueil (test « Visiter le Royaume » à remplacer).
- [ ] Sitemap, doc (`carte-des-fonctionnalites.md`, CONTEXT.md), revue, PR.
