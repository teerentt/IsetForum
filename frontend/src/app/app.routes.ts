import { Routes } from '@angular/router';
import { authGuard, adminGuard, entryGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'connexion' },
  { path: 'connexion', canActivate: [entryGuard], loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'inscription', canActivate: [entryGuard], loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'forum', loadComponent: () => import('./layout/forum-layout/forum-layout.component').then(m => m.ForumLayoutComponent), children: [
    { path: '', pathMatch: 'full', redirectTo: 'accueil' },
    { path: 'accueil', loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent) },
    { path: 'communautes', loadComponent: () => import('./features/communities/communities.component').then(m => m.CommunitiesComponent) },
    { path: 'communautes/:id', loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent) },
    { path: 'publications/:id', loadComponent: () => import('./features/publications/post-detail/post-detail.component').then(m => m.PostDetailComponent) },
    { path: 'profil', canActivate: [authGuard], loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
    { path: 'favoris', canActivate: [authGuard], data: { tab: 'saved' }, loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
    { path: 'ressources', redirectTo: 'communautes', pathMatch: 'full' },
    { path: 'administration', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
  ] },
  { path: '**', redirectTo: 'connexion' },
];
