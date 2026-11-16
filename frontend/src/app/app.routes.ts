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
    { path: 'ressources', loadComponent: () => import('./features/resources/resources.component').then(m => m.ResourcesComponent) },
    { path: 'favoris', canActivate: [authGuard], loadComponent: () => import('./features/saved/saved.component').then(m => m.SavedComponent) },
    { path: 'administration', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },
  ] },
  { path: '**', redirectTo: 'connexion' },
];
