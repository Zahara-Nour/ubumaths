# Base de staging pour les previews Vercel, progression

> Projet ouvert le 2026-09-29 à la demande de David. **Rien n'est décidé, rien
> n'est commencé.** Ce document pose le constat et les questions ; les choix
> d'architecture reviennent à David.

## Le constat (2026-09-29, chantier pnpm 12, PR #512)

1. **Aucune preview de PR n'est construite.** `vercel.json` → `ignoreCommand`
   sort en `exit 0` dès que `VERCEL_ENV` n'est pas `production`. Le check
   « Vercel » d'une PR passe en 0 s avec « Canceled by Ignored Build Step » :
   il ne prouve rien.
2. **Même forcée, une preview échoue.** Un « Redeploy » sans Ignore Build Step
   (commit `d9f3444`) a installé correctement, puis `vite build` a cassé :
   `"PUBLIC_SUPABASE_URL" is not exported by virtual:env/static/public`.
   Dans Vercel, `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_ANON_KEY` n'existent
   que pour **Production** et **Development**, pas pour **Preview**.
3. **Il n'existe que deux bases** : la production (Supabase EU,
   `cnevnzsvixxpnurautls`, vraies données d'élèves mineurs) et la base locale
   de chaque poste (Docker, injoignable depuis Vercel).

Conséquence : on ne peut pas tester une PR en ligne. Le premier vrai build
d'un changement d'outillage (ex. pnpm 12) est celui de la production, au merge.

## Pourquoi pas simplement pointer les previews sur la prod

Une preview est une vraie copie du site, en ligne, à une adresse temporaire.
Branchée sur la prod, elle ferait tourner du code **non validé** sur les
**données réelles de mineurs** (RGPD), pour quiconque a le lien. Écarté
d'office, sauf décision contraire explicite de David.

## Ce qu'une base de staging changerait

Un deuxième projet Supabase, même schéma que la prod (migrations, RLS,
fonctions), **uniquement des données fictives**. Les variables Preview de
Vercel pointeraient dessus → chaque PR aurait une preview fonctionnelle, et
l'`ignoreCommand` pourrait laisser passer les previews.

## Questions pour David (à trancher avant tout code)

- **La question d'accès** : qui pourra lire quoi sur une preview ? Le lien
  d'une preview est-il protégé (Vercel Authentication / Deployment Protection),
  ou public ? Qui doit pouvoir s'y connecter, avec quels comptes de test ?
- **Où vit la base** : un second projet Supabase (région EU, comme la prod) ?
  Coût à vérifier sur la grille Supabase au moment de décider (non vérifié ici).
- **Quelles données** : seed fictif à écrire (prof, admin, élèves, classes),
  ou dérivé du seed local existant (`db:dev-accounts`) ? **Jamais** de copie de
  la prod.
- **Migrations** : appliquer chaque migration à staging avant la prod ?
  Automatiquement (CI) ou à la main ? Qui garantit que les deux schémas ne
  divergent pas ?
- **Previews systématiques ou à la demande** : construire toutes les PR (coût
  et quota Vercel) ou seulement sur étiquette / à la main ?
- **Auth et e-mails** : URL de redirection d'auth pour les domaines de
  preview ; les e-mails de staging ne doivent partir vers personne de réel.
- **Services externes** (Brevo, Google, etc.) : désactivés ou en mode test sur
  staging ?

## Points de vigilance déjà connus

- `pnpm db:types` génère depuis la **prod** : staging ne doit pas devenir une
  source de types.
- Les tests d'intégration tournent sur la base **locale** (et sur
  `nightly-integration.yml`) : staging n'a pas vocation à les remplacer.
- Une policy RLS testée sur staging ne dit rien des **données** de prod :
  les mesures sur données réelles restent nécessaires.

## Journal

- 2026-09-29 — Projet ouvert. Constat fait pendant la PR #512 (pnpm 12).
  David a accepté, pour cette PR, les preuves sans preview : installation sous
  pnpm 12.6.0 sur Vercel réussie, build local et CI verts.
