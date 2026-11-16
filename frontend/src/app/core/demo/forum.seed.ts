import { ForumState, Person } from '../models/forum.models';

export const DEMO_PEOPLE: Person[] = [
  { id: 'student', name: 'Lina Ben Ali', initials: 'LB', role: 'student' },
  { id: 'professor', name: 'Pr. Sami Mansour', initials: 'SM', role: 'professor' },
  { id: 'admin', name: 'Amira Jaziri', initials: 'AJ', role: 'admin' },
];

export function initialState(): ForumState {
  const now = Date.now();
  return {
    version: 1,
    communities: [
      { id: 'dev', name: 'Informatique', description: 'Du premier hello world au prochain grand projet. Construisez, déboguez et apprenez ensemble.', visibility: 'public', icon: 'code', color: 'purple', members: 1248, creatorId: 'professor' },
      { id: 'design', name: 'Design & Créativité', description: 'Un espace pour les esprits curieux, les interfaces bien pensées et les idées à dessiner.', visibility: 'public', icon: 'spark', color: 'orange', members: 846, creatorId: 'student' },
      { id: 'math', name: 'Les maths, simplement', description: 'Donnez du sens aux chiffres. Partagez vos solutions et trouvez votre groupe de révision.', visibility: 'public', icon: 'chart', color: 'green', members: 632, creatorId: 'professor' },
      { id: 'ai', name: 'Cercle de recherche IA', description: 'Explorez les publications en intelligence artificielle et collaborez avec étudiants et enseignants.', visibility: 'private', icon: 'compass', color: 'blue', members: 128, creatorId: 'professor' },
      { id: 'campus', name: 'Vie du campus', description: 'Les échanges entre deux cours. Événements, bons conseils et nouvelles rencontres à Radès.', visibility: 'public', icon: 'cap', color: 'pink', members: 2106, creatorId: 'student' },
      { id: 'lab', name: 'Projets de fin d’études', description: 'Un espace pour les étudiants en fin de cursus : retours, conseils et suivi des projets.', visibility: 'private', icon: 'book', color: 'purple', members: 94, creatorId: 'professor' },
    ],
    memberships: [
      { userId: 'student', communityId: 'dev', status: 'active' },
      { userId: 'student', communityId: 'design', status: 'active' },
      { userId: 'student', communityId: 'ai', status: 'pending' },
      { userId: 'professor', communityId: 'dev', status: 'active' },
      { userId: 'professor', communityId: 'ai', status: 'active' },
      { userId: 'professor', communityId: 'lab', status: 'active' },
    ],
    posts: [
      { id: 'p1', communityId: 'dev', author: 'Youssef Trabelsi', initials: 'YT', role: 'student', title: 'Le parcours Spring Boot que j’aurais aimé avoir en première année', body: 'Après de nombreux essais, voici mon parcours pour apprendre Spring Boot : commencer par REST, maîtriser JPA, puis construire l’authentification. Qu’ajouteriez-vous à cette liste ?', tags: ['springboot', 'backend', 'apprentissage'], createdAt: now - 42 * 60000, likes: 128, likedBy: [], savedBy: [], comments: [{ id: 'c1', author: 'Pr. Sami Mansour', initials: 'SM', body: 'Très bon point de départ. Je conseille les tests d’intégration dès le premier endpoint REST.' }], kind: 'discussion', art: 'code' },
      { id: 'p2', communityId: 'design', author: 'Nour Ben Salem', initials: 'NB', role: 'student', title: 'Un bon design commence par la bonne question.', body: 'Quelques notes de notre atelier design : prenons le temps de comprendre le problème avant d’ouvrir Figma. Voici les exercices qui ont aidé notre équipe à trouver sa direction.', tags: ['design', 'uiux', 'inspiration'], createdAt: now - 2 * 3600000, likes: 86, likedBy: [], savedBy: [], comments: [], kind: 'discussion', art: 'design' },
      { id: 'p3', communityId: 'math', author: 'Pr. Sami Mansour', initials: 'SM', role: 'professor', title: 'L’algèbre linéaire, sans prise de tête. Un guide visuel.', body: 'Vecteurs, matrices et transformations expliqués avec des schémas simples. Ces notes reprennent les notions clés de notre prochaine révision. Posez vos questions en commentaire.', tags: ['mathematiques', 'revision', 'ressources'], createdAt: now - 3 * 3600000, likes: 214, likedBy: [], savedBy: [], comments: [], kind: 'resource', art: 'math' },
      { id: 'p4', communityId: 'dev', author: 'Malek Gharbi', initials: 'MG', role: 'student', title: 'Un petit projet à construire ensemble ce week-end ?', body: 'Je cherche deux ou trois personnes pour un petit projet open source. Un planificateur de révisions, peut-être ? Les débutants sont les bienvenus : le but est d’apprendre en faisant !', tags: ['collaboration', 'opensource'], createdAt: now - 5 * 3600000, likes: 42, likedBy: [], savedBy: [], comments: [], kind: 'discussion', art: '' },
      { id: 'p5', communityId: 'ai', author: 'Pr. Sami Mansour', initials: 'SM', role: 'professor', title: 'Cercle de lecture : comprendre les mécanismes d’attention', body: 'Pour notre discussion de recherche privée, comparons nos notes sur les mécanismes d’attention et préparons chacun trois questions.', tags: ['machineapprentissage', 'research'], createdAt: now - 3600000, likes: 18, likedBy: [], savedBy: [], comments: [], kind: 'discussion', art: 'code' },
      { id: 'p6', communityId: 'dev', author: 'Ines Ayari', initials: 'IA', role: 'student', title: 'L’essentiel du SQL : une fiche pour votre prochain projet', body: 'Un aide-mémoire pour SELECT, JOIN, GROUP BY et les requêtes les plus courantes. À conserver avant votre prochain TP de bases de données.', tags: ['basesdedonnees', 'sql', 'ressources'], createdAt: now - 8 * 3600000, likes: 97, likedBy: [], savedBy: [], comments: [], kind: 'resource', art: 'sql' },
    ]
  };
}
