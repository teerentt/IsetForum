import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && request.url.startsWith('/api/') && !request.url.endsWith('/login')) auth.expire();
    return throwError(() => error);
  }));
};
