import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService); const router = inject(Router);
  await auth.initialize();
  return auth.authenticated() || router.createUrlTree(['/connexion']);
};
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService); const router = inject(Router);
  await auth.initialize();
  return auth.user()?.role === 'ADMIN' || router.createUrlTree([auth.authenticated() ? '/forum/accueil' : '/connexion']);
};
export const entryGuard: CanActivateFn = async () => {
  const auth = inject(AuthService); const router = inject(Router);
  await auth.initialize();
  return auth.authenticated() ? router.createUrlTree(['/forum/accueil']) : true;
};
