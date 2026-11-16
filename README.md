# IsetForum

Forum de l’Institut supérieur des études technologiques de Radès. Backend Spring Boot / Java 17 et frontend Angular 21 en français, avec un thème bleu et blanc.

## Lancer le projet

1. Démarrez MySQL avec Laragon sur le port `3306`.
2. Depuis la racine du projet, démarrez Spring Boot avec le profil de développement :

   ```cmd
   mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev
   ```

3. Ouvrez un **nouveau terminal Command Prompt** dans VS Code, puis lancez Angular :

   ```cmd
   cd frontend
   ng serve
   ```

4. Ouvrez **http://localhost:4200**. La page de connexion s’affiche en premier. Le backend écoute sur `8080` et le proxy Angular est déjà configuré.

Les dépendances frontend sont installées sur ce poste. Après un clonage, exécutez `npm ci` dans `frontend/`. Le profil Command Prompt évite le blocage des scripts PowerShell sans changer la politique d’exécution du système.

Si Maven choisit un cache inaccessible dans votre environnement, ajoutez `-Dmaven.repo.local=C:\Users\heymr\.m2\repository` à la commande backend. `mvn` peut remplacer `mvnw.cmd` si Maven est installé.

## Comptes de développement

Le profil `dev` crée uniquement les comptes absents. Il ne modifie jamais le nom, le rôle ou le mot de passe d’un compte existant.

| Rôle | E-mail | Mot de passe initial |
| --- | --- | --- |
| Étudiant | `etudiant@isetforum.test` | `IsetForumDev!2026` |
| Enseignant | `professeur@isetforum.test` | `IsetForumDev!2026` |
| Administrateur | `admin@isetforum.test` | `IsetForumDev!2026` |

`DEV_SEED_PASSWORD` permet de choisir un autre mot de passe avant la première création. Aucun compte de démonstration n’est créé sans le profil `dev`. Les inscriptions publiques créent toujours des étudiants. Les administrateurs possèdent aussi les autorités des enseignants.

## Base de données

Configuration par défaut : `jdbc:mysql://localhost:3306/isetForum?createDatabaseIfNotExist=true`, utilisateur `root`, mot de passe vide, conformément au projet initial. Les variables `DB_URL`, `DB_USERNAME` et `DB_PASSWORD` permettent de remplacer ces valeurs.

Flyway gère le schéma ; Hibernate le valide. La migration V1 crée la table si elle est absente ou élargit le rôle de la table existante sans supprimer les comptes. Une base Sprint 0 existante est enregistrée comme version 0 avant migration. Les valeurs historiques `USER` restent lisibles et sont exposées comme `STUDENT`.

Les tests Java utilisent une base H2 isolée, jamais MySQL. Les tests navigateur utilisent le vrai backend et ajoutent un compte de test à MySQL. Les comptes et les mots de passe hachés persistent après redémarrage ; les sessions HTTP, elles, expirent au redémarrage.

## API d’authentification

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Initialise le cookie CSRF et retourne le jeton |
| POST | `/api/auth/register` | Crée un étudiant, retourne `201` et un DTO utilisateur |
| POST | `/api/auth/login` | Ouvre une session et retourne le DTO utilisateur |
| GET | `/api/auth/me` | Retourne l’utilisateur connecté ou `401` |
| POST | `/api/auth/logout` | Invalide la session, retourne `204` |

DTO utilisateur : `{ id, name, email, role }`. Les erreurs sont en JSON : `{ message, fields }`. Aucun mot de passe ou hachage n’est exposé. L’e-mail est normalisé et les mots de passe sont hachés avec BCrypt. Les requêtes POST nécessitent le cookie `XSRF-TOKEN` et l’en-tête `X-XSRF-TOKEN`, gérés par Angular. Le cookie de session `JSESSIONID` est HttpOnly et SameSite=Lax ; `SESSION_COOKIE_SECURE=true` l’active pour HTTPS.

En production, servir Angular et `/api` sous la même origine conserve cette configuration de cookies. Le proxy `ng serve` est réservé au développement.

## Frontend et limites actuelles

Les comptes, les communautés et les adhésions disposent maintenant d’API Spring Boot et de tables MySQL. Angular utilise réellement les API d’authentification ; ses communautés et adhésions utilisent encore les données de démonstration locales. Leur raccordement aux nouvelles API sera réalisé séparément. Il n’existe plus de sélecteur permettant d’usurper un rôle.

Les données de démonstration du frontend sont séparées par compte dans localStorage et ne sont pas synchronisées entre utilisateurs. Le backend applique les permissions de création, de modification, d’adhésion et de validation. La liste des membres d’une communauté privée est réservée aux membres actifs et aux administrateurs. Les publications, commentaires et ressources seront ajoutés lors des prochains sprints. La réinitialisation de mot de passe par e-mail et les pièces jointes ne sont pas incluses.

Voir [la documentation Angular](frontend/README.md) pour l’organisation des composants et les commandes de tests.

## Sprint 2 : communautés et adhésions

La structure reste `controller → service → repository`, avec les entités dans `model`, les échanges dans `dto` et les valeurs fixes dans `enums`.

La migration V2 ajoute `community` et `community_membership` sans modifier les comptes existants ni la migration V1. Redémarrez `DemoApplication` dans IntelliJ pour charger les nouvelles routes. Avec le profil `dev`, deux exemples sont ajoutés s’ils sont absents : **Informatique** (publique) et **Cercle de recherche IA** (privée). L’enseignant est leur créateur ; l’étudiant est membre de la première et demandeur de la seconde. Les adhésions existantes ne sont pas réinitialisées au redémarrage.

Voir [les routes et exemples du Sprint 2](docs/sprint-2.md).

## Tests

```cmd
mvnw.cmd test
cd frontend
npm test
npm run build
npm run test:browser
```

Le dernier test nécessite Spring Boot démarré avec le profil `dev` et Microsoft Edge installé. Il couvre l’inscription, les trois rôles, les cookies et la restauration de session, la déconnexion, les erreurs réseau, les interactions du forum et les écrans mobiles.
