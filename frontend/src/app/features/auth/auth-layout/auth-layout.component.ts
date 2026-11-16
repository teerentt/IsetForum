import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({ selector: 'app-auth-layout', standalone: true, imports: [RouterLink, IconComponent], templateUrl: './auth-layout.component.html', styleUrl: './auth-layout.component.css' })
export class AuthLayoutComponent { readonly theme = inject(ThemeService); }
