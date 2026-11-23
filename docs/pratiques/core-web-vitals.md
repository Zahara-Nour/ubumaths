# Core Web Vitals : mesurer, relever, diagnostiquer

> Écrit le 2026-10-11, après le premier diagnostic : FCP p75 de l'accueil à 3,4 s pour un TTFB de
> 0,5 s, que personne n'avait vu (corrigé par #1073).

> **Depuis novembre 2026, le détail par indicateur est payant chez Vercel** (constaté le
> 2026-11-21, offre Hobby : `vercel metrics vercel.speed_insights.*` répond « A subscription to
> Speed Insights Plus is required »). Le relevé du 2026-11-01 (#2094) est le dernier tiré de
> Vercel. Reste gratuit, à l'écran seulement : le « Real Experience Score » des 7 derniers jours,
> par page (`https://vercel.com/zaharanours-projects/chiphre/speed-insights` ; le projet Vercel
> s'appelle `chiphre`). **La source est désormais notre table `web_vital_samples`** (décision du
> 2026-11-21).

## Les vraies mesures : notre table

Le navigateur de chaque visiteur envoie ses mesures (LCP, FCP, TTFB, INP, CLS) à
`/api/web-vitals`, sous l'identifiant de route de la page, sans rien qui désigne le visiteur ;
le serveur les écrit dans `web_vital_samples`, gardées 90 jours (fonctionnement :
[surveillance-des-erreurs.md](../systeme/surveillance-des-erreurs.md)). C'est la source qui fait
foi : un Lighthouse sur le Mac mini mesure une machine rapide sur un bon réseau, pas un élève
sur la Wi-Fi du collège.

À savoir pour lire ces mesures :

- `route` est l'identifiant SvelteKit : l'accueil est `/(public)`, pas `/` ;
- une ligne par visite et par indicateur, envoyée au premier passage de l'onglet en
  arrière-plan ; pas de CLS sous Safari ; le CLS est rattaché à la page affichée à l'envoi ;
- TTFB et CLS suivent la définition de Google (pas celle du journal des erreurs) ;
- les pages d'admin et `/dev` ne sont pas mesurées ; la table n'enregistre pas le navigateur ;
- un p75 sur moins de 10 mesures ne permet pas de conclure.

L'admin peut lire la table en SQL (jamais dans l'ordre d'arrivée des lignes). Le relevé à la
demande, lui, ne demande que le jeton du relevé :

```bash
WEB_VITALS_RELEVE_TOKEN=… npx tsx scripts/releve-web-vitals.ts 28   # 1 à 90 jours
```

## Le relevé mensuel

`.github/workflows/web-vitals.yml`, le 1er du mois : `scripts/releve-web-vitals.ts` relève
28 jours, classe chaque indicateur selon les seuils de Google (🟢 / 🟠 / 🔴) et publie une issue
« Core Web Vitals — relevé AAAA-MM » (la précédente est refermée). Une page est **à regarder**
si un indicateur est au rouge sur au moins 10 mesures de cet indicateur.

Le script ne lit pas la base. Il appelle `GET /api/web-vitals/releve?days=28`
(`src/lib/server/web-vitals/releve.ts`), qui ne rend que des **résultats calculés** : nombre de
mesures par indicateur, pour tout le site et par page, et p75 à partir de 5 mesures (en dessous,
le centile serait presque la mesure elle-même) ; jamais les lignes, ni date, ni type d'appareil.
La période est faite de **jours entiers (UTC), sans la journée en cours** : le résultat ne
change qu'une fois par jour, et appeler la route en boucle ne dit pas quand une mesure est
arrivée. Une mesure du jour n'apparaît donc que le lendemain. Le calcul se fait sur le serveur
(pas de fonction SQL) ; au-delà de 100 000 lignes, il porte sur un échantillon pris au hasard
et le relevé le dit.

**Jeton.** La route exige `Authorization: Bearer <WEB_VITALS_RELEVE_TOKEN>`, un jeton dédié
(32 caractères au moins) qui n'ouvre qu'elle : GitHub n'a aucune clé de la base. Il vit à deux
endroits, avec la même valeur : variable d'environnement de **production** sur Vercel, et secret
du dépôt GitHub. Sans la variable sur Vercel, ou avec une valeur trop courte, la route répond
503 (le reste du site n'est pas touché). Pour le changer :
`openssl rand -hex 32`, le poser aux deux endroits, puis redéployer (une variable Vercel n'est
lue qu'au déploiement suivant). Le script appelle `https://www.chiph.re` et refuse toute
redirection, pour que le jeton ne parte pas ailleurs.

## Diagnostiquer une page au rouge

1. **Lire la répartition** : p50 / p75 / p90, par appareil et navigateur. Un p50 bon et un p75
   mauvais = une queue de distribution (premières visites, réseaux lents), pas un cas général.
2. **Séparer serveur et navigateur** : TTFB élevé → serveur (démarrage à froid, appels Supabase
   en série, redirections — le TTFB de web-vitals les inclut) ; TTFB bas mais FCP haut →
   navigateur (CSS bloquantes, polices, JS préchargé qui vole la bande passante).
3. **Agent `vercel:performance-optimizer`** en lecture seule pour le diagnostic, puis l'agent
   `performance-optimizer` du projet pour le correctif (SvelteKit, Safari TDZ, requêtes).
4. **Mesurer avant/après en labo** : build de production servi localement derrière un proxy
   HTTP/2 + brotli (sans lui, HTTP/1.1 et 6 connexions faussent tout), réseau lent simulé
   (1,5 Mb/s, RTT 150 ms) et moyen (4 Mb/s, RTT 80 ms, CPU ×4), cache vide, 3 passes, médiane.
   Les scripts de #1073 n'ont pas été conservés : les réécrire au besoin (Playwright/CDP).
5. **Confirmer en prod** : une à deux semaines de Speed Insights après le déploiement.

## Ce qui a déjà été fait

- **#1073** : préchargement réservé au CSS, cache des fichiers de `static/`, CSS MathLive chargé
  par Vite dans les seuls composants de maths (cf.
  [architecture-generale.md](../systeme/architecture-generale.md#premier-affichage--préchargement-et-css)).
- **Fluid Compute** est actif ; les fonctions tournent à Paris (`cdg1`, imposé par
  `vite.config.ts`, options de `sveltekit()` — le `iad1` des réglages du projet n'est qu'un défaut remplacé).
- **Restent ouverts** : démarrages à froid de la connexion (plan Hobby, pas de préchauffage),
  layout racine qui importe d'emblée barre latérale, panneaux et skeletons.
