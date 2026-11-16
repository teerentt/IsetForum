# IsetForum — frontend Angular

Interface française et thème bleu/blanc pour l’Institut supérieur des études technologiques de Radès.

## Démarrer

Ouvrez un nouveau terminal **Command Prompt** dans VS Code (profil configuré pour cet espace de travail), puis depuis `frontend/` :

```cmd
ng serve
```

Ouvrez http://localhost:4200 : la première page est la connexion. Le lien **Continuer en visiteur** ouvre le contenu public. Une session déjà authentifiée est restaurée après actualisation.

Les dépendances sont installées. Après un nouveau clonage, lancez `npm ci` une première fois. Angular CLI est déjà installé globalement sur ce poste ; sur un autre poste, installez `@angular/cli@21` globalement. Le projet utilise Angular 21 et Node 22.19.

Le proxy de développement transfère `/api/**` vers `http://127.0.0.1:8080`. Spring Boot et MySQL doivent être démarrés séparément ; voir le README à la racine. `ng serve` démarre uniquement Angular.

## Organisation

- `core/models/` : contrats des comptes et du forum.
- `core/services/` : authentification HTTP, état local du forum et interactions de présentation.
- `core/guards/` et `core/interceptors/` : accès aux routes et expiration des sessions.
- `core/demo/` : contenu fictif du forum, séparé des vrais comptes.
- `layout/` : en-tête, navigation latérale, découvertes et structure du forum.
- `features/auth/` : connexion et inscription, avec une mise en page commune.
- `features/feed/`, `communities/`, `resources/`, `saved/`, `admin/`, `publications/` : fonctionnalités du forum.
- `shared/components/` : icônes, cartes, notifications et dialogues réutilisables.
- `shared/styles/` : styles communs du contenu des dialogues.

Chaque composant possède ses propres fichiers TypeScript, HTML et CSS. Les variables du thème et les éléments visuels communs sont dans `src/styles.css`.

## Ce qui utilise MySQL

Connexion, inscription étudiante, lecture du compte courant, rôles et déconnexion utilisent réellement Spring Boot et MySQL. L’authentification repose sur une session HttpOnly et la protection CSRF. Aucun jeton ni mot de passe n’est conservé dans localStorage. La création d’un compte enseignant ou administrateur n’est pas proposée à l’inscription.

## Ce qui reste une démonstration

Le backend du Sprint 2 propose des API réelles pour les communautés et les adhésions, mais cette interface Angular ne les appelle pas encore. Communautés, adhésions, publications, commentaires, ressources texte, favoris, likes et événements restent donc fictifs dans l’interface. Les modifications du forum sont isolées par compte dans le navigateur (`isetforum-demo-v2-account-<id>`), avec un espace séparé pour les visiteurs. Elles ne sont pas synchronisées entre utilisateurs. La liste de validation des administrateurs contient des demandes fictives, indépendantes des demandes MySQL.

Les noms et descriptions des communautés privées sont publics ; leur contenu est masqué aux non-membres dans la démonstration. Pour de vraies données privées, ces règles devront être appliquées côté serveur avant de connecter les API du forum.

Les ressources actuelles sont des notes téléchargeables au format `.txt`. Les événements du calendrier sont fictifs. L’envoi de fichiers et la réinitialisation du mot de passe par e-mail restent à implémenter.

## Vérifier

```cmd
npm test
npm run build
npm run test:browser
```

Le build est généré dans `dist/isetforum/browser/`. Les tests navigateur utilisent Microsoft Edge en mode headless et nécessitent le backend démarré avec le profil `dev`. Ils créent un compte étudiant de test dans MySQL et enregistrent des captures dans `artifacts/` (ignoré par Git).

Pour tester directement le serveur Angular plutôt que le build statique :

```cmd
set ISETFORUM_FRONTEND_URL=http://localhost:4200
npm run test:browser
```

Après redémarrage de Spring Boot, `node scripts/check-persistence.mjs` vérifie que le compte créé par le dernier test navigateur peut encore se connecter.

Les polices Google sont facultatives : des polices de remplacement sont prévues sans connexion externe.
