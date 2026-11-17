import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ForumDialogComponent } from '../../shared/components/forum-dialog/forum-dialog.component';
import { NotificationComponent } from '../../shared/components/notification/notification.component';
import { ForumUiService } from '../../core/services/forum-ui.service';

@Component({ selector: 'app-forum-layout', standalone: true, imports: [RouterOutlet, HeaderComponent, SidebarComponent, ForumDialogComponent, NotificationComponent], templateUrl: './forum-layout.component.html', styleUrl: './forum-layout.component.css' })
export class ForumLayoutComponent { readonly ui = inject(ForumUiService); }
