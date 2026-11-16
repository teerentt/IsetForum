import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAppInitializer, inject } from '@angular/core';
import { routes } from './app/app.routes';
import { AuthService } from './app/core/services/auth.service';
import { sessionInterceptor } from './app/core/interceptors/session.interceptor';
import { ThemeService } from './app/core/services/theme.service';

bootstrapApplication(AppComponent, { providers: [
  provideRouter(routes),
  provideAppInitializer(() => inject(ThemeService).initialize()),
  provideHttpClient(withInterceptors([sessionInterceptor])),
  provideAppInitializer(() => inject(AuthService).initialize()),
] }).catch(error => console.error(error));
