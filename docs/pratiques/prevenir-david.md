---
couvre:
  - 'scripts/prevenir/**'
---

# Prévenir David : `pnpm prevenir`

David travaille presque toujours à distance. Une session qui s'arrête pour l'attendre lui envoie
une notification sur l'iPhone ; sinon il ne le sait qu'en revenant voir.

```bash
pnpm prevenir lien                        # « Session « <sujet> » : un lien est prêt à essayer. »
pnpm prevenir question                    # « Session « <sujet> » : une question attend ta réponse. »
pnpm prevenir geste "page à cocher prête" # « Session « <sujet> » : page à cocher prête. »
pnpm prevenir question --essai            # montre le message, n'envoie rien
pnpm prevenir geste "bilan de la nuit à lire" --session tache-de-nuit   # nom imposé
```

## Quand s'en servir

**Seulement quand la session s'arrête et attend un geste de David**, juste avant son message
final :

| Mot        | Quand                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| `lien`     | un lien de `pnpm lien` est prêt, et la suite attend son essai                                            |
| `question` | une question lui est posée (phase 0, décision, question d'accès d'une migration) et rien n'avance        |
| `geste`    | autre chose à faire par lui : page à cocher à relire, commande à lancer (`db:migrate`, écriture en prod) |

**Jamais** pour dire que quelque chose va bien ou est fini : CI verte, PR ouverte ou mergée, fin
d'une phase, fin de session, « bon moment pour `/clear` ». La session merge seule ; une
notification qui ne demande rien apprend à ne plus les lire.

Les demandes d'autorisation ont déjà leur notification (« Claude attend ton accord », réglage du
poste de David, hors dépôt) : ne pas la doubler.

## Ce que dit le message, et ce qu'il ne dit pas

- Le canal est ntfy.sh, un **service extérieur** : le message porte le nom de la session et une
  formule fixe. **Ni le lien, ni le texte de la question** : David les lit dans la session.
- La phrase de `geste` : une ligne, 80 caractères au plus, **sans chemin ni adresse** (`/`, `@`,
  nom à point comme un fichier ou un domaine, adresse IP, `localhost`, port : refusés). Pas de
  prénom, pas de donnée d'élève.
- Nom de la session : `--session`, sinon son `/rename`, sinon le sujet du worktree
  (`ubumaths-wt-<sujet>`). Un `/rename` qui porte un chemin, une adresse ou le nom du projet est
  ignoré (le sujet du worktree le remplace). Hors d'un worktree et sans `/rename` : « sans nom »,
  jamais le nom d'un dossier.

## Comportements

- **Doublon** : le même message de la même session n'est pas renvoyé avant 10 minutes (« déjà
  envoyé »). État : `~/.local/state/prevenir/envois.json`.
- **Jamais bloquant** : pas de canal (`~/.config/surveillance-machine/ntfy-topic`, créé par
  `pnpm surveillance:installer`), réseau coupé ou envoi refusé → une ligne « ⚠️ notification pas
  partie », code de sortie 0. La session continue, et le dit à David dans son message.
- **Commande mal écrite** (mot inconnu, texte après `lien` ou `question`, phrase refusée) : code 1,
  rien d'envoyé.

## Tests

`scripts/__tests__/prevenir.test.ts` : la logique, et la commande lancée contre un faux serveur
ntfy local (aucun envoi réel).
