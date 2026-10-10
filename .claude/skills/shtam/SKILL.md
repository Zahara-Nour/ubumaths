---
name: shtam
description: Écrire, réécrire ou relire un article du Shtam, la gazette parodique du Royaume (src/lib/server/shtam/articles/). Utiliser dès qu'on parle d'un article du Shtam, de son titre, de son chapô, de sa chute, de son encadré « Le vrai du faux », d'une illustration d'article, ou de la relecture des articles avec David.
---

# Le Shtam

Deux sources font foi, à lire avant d'écrire une ligne :

- **Charte** (voix, rédaction, qui parodier, rien du Collège) : Compendium §IX « Le Shtam »,
  `docs/Chiphres/lore-pataphysique.md`.
- **Format** (en-tête YAML, slug, formules ubumark, vérifications) : `docs/pratiques/shtam-articles.md`.

Ce skill ajoute ce qu'aucune des deux ne dit : ce que David aime, ce qu'il refuse, et comment se
déroule une relecture.

## Ce qui ne se négocie pas

- **Le vrai du faux** : obligatoire, unique, voix de l'Académie, avec un exemple chiffré. Le lecteur a
  11 à 18 ans : un faux fait affirmé avec aplomb peut rester ; l'encadré en fait un mini-cours.
- **Jamais une personne vivante ni une institution réelle nommée.** Mathématiciens morts : oui.
- **Le Czar Alexis n'est jamais russe** : « l'Empire du Czar », « le palais d'Hiver ». Ni Russie, ni
  Moscou, ni « russe » (David ne veut pas présenter un pays réel en ennemi). Un article ancien qui en
  parle se corrige à la relecture.
- **Lore** : le Compendium fait foi ; le Lexique n'est qu'une inspiration ; **rien du Collège de
  'Pataphysique**.
- **Père Ubu est cité**, jamais narrateur. Rédaction : `cotice` (rédacteur en chef), `giron`, `pile`,
  `merdranpo`.

## Le ton que David a validé

Modèle : les cinq premiers articles (« j'aime énormément ») — dépêche imperturbable, personnages du
lore cités (Mère Ubu, Achras, le Czar, le Capitaine Bordure, le Cheval à Phynances), **chute
absurde**, vrai du faux en liste.

**L'humour qu'il adore : un mot à deux sens**, retourné contre celui qui parle, idéalement un mot du
vocabulaire mathématique qui a aussi un sens courant (compter, multiplier, additionner, diviser, se
courber, limite, puissance, intérêt, rang, mesure…). Exemples validés :

- « les Polonais **comptaient** sur la gratuité, Mère Ubu **comptait** mieux »
- le triangle « devrait **se courber** pour pouvoir négocier »
- « au lieu d'**additionner leurs forces**, ils les ont multipliées »
- Thalès « **prend la mesure** de la situation » ; le capitaine qui ne fait pas « **rentrer dans le
  rang** » ses 97 Palotins

**Dans chaque lot de propositions (titre, chapô, chute, réplique), au moins une piste sur un mot à
deux sens, placée en tête et recommandée si elle se comprend sans explication.**

### Titres

Forme qui marche : **deux propositions parallèles qui se répondent**, même verbe ou verbe en écho —
« Le Capitaine Bordure découvre la géométrie, Mère Ubu découvre la facture ». Refusés en série : les
titres longs, explicatifs, ou qui donnent la réponse.

### Chapôs

Compréhensibles **sans avoir lu l'article**, sans calcul, ni trop explicatifs ni énigmatiques. Ce qui a
marché : un résumé simple, ou une maxime détournée + une conséquence absurde (« La logique a ses
raisons que le bon sens ne connaît pas. Au point de rendre fous les éleveurs de poules. »).
**Après deux refus, demander la direction** (résumer ? faire rire ? quel personnage ?) au lieu
d'enchaîner les séries.

### Ce qu'il rejette

- l'absurde qui n'a pas de sens (« par prudence logique ») ;
- les répliques confuses ou trop elliptiques, les allusions qu'il faut expliquer ;
- la personnification d'un objet mathématique (l'asymptote « patiente » a été réécrite en soupe qui
  refroidit) ;
- un sujet trop difficile à comprendre : la duplication du cube « à la règle et au compas » a été
  abandonnée. Une situation concrète du Royaume (rails, puits, soupe, rangs de Palotins) plutôt qu'un
  énoncé abstrait.

## Écrire un article

1. Partir d'une **situation concrète** du Royaume où l'idée mathématique se voit, pas de l'idée seule.
2. Corps en voix de la Rédaction ; une chute absurde ; puis `## Le vrai du faux`.
3. Formules en ubumark (pièges : `docs/pratiques/notation-unites.md`) ; titre en texte brut (π, ², √ en
   Unicode) ; titre ou chapô contenant « : » ou « # » entre guillemets simples.
4. Illustration éventuelle : SVG dans `static/shtam/`, insérée par
   `![texte](/shtam/fichier.svg){size=large}`.
5. **Ne jamais lancer prettier sur les articles** (il casse `~q*2~`) : ils sont dans `.prettierignore`.
6. Vérifier : `pnpm test:server src/lib/server/shtam` et
   `pnpm check:ubumark src/lib/server/shtam/articles`.

Un nouvel article suit le circuit ordinaire (branche → PR → CI), sauf pendant la relecture ci-dessous.

## Relire avec David

Dans l'ordre de parution, un article à la fois. Worktree `ubumaths-wt-relecture`, branche
`relecture/shtam`, journal `shtam-relecture-progress.md` (une ligne par article : ✅ validé — ce qui
a changé, ou ❌ abandonné — pourquoi).

- **Pendant les allers-retours** sur un article : pas de commit. Proposer en suivant les goûts
  ci-dessus, chaque proposition avec ma recommandation ; c'est David qui tranche le texte.
- **Quand David VALIDE** — dérogation qu'il a choisie (2026-10-05/06), valable **pour la relecture du
  Shtam seulement** : commit + push **direct sur `main`**, sans PR.
  1. mettre à jour la ligne du journal ;
  2. commit `docs(shtam): relecture de l'article N, <sujet>` ;
  3. `git rebase origin/main` ;
  4. vérifs locales, qui remplacent la CI : `pnpm check:incremental`, `pnpm lint:fast`,
     `pnpm test:server src/lib/server/shtam`, les tests seo et markdown si l'article les touche,
     `pnpm check:ubumark src/lib/server/shtam/articles` ;
  5. `git push origin HEAD:main`.
- Un push sur `main` ne met rien en ligne (ADR 0021) : la mise en prod reste `pnpm deploy:prod`, sur
  demande de David.
- Un article abandonné : fichier supprimé, créneau signalé libre dans le journal.
- Un bug d'affichage trouvé en relisant : le noter dans le journal et le traiter **à part** (PR dédiée),
  jamais dans le commit de relecture.
