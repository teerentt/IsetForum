import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ForumUiService } from '../../core/services/forum-ui.service';

@Component({ selector: 'app-discovery-sidebar', standalone: true, imports: [DecimalPipe, IconComponent], templateUrl: './discovery-sidebar.component.html', styleUrl: './discovery-sidebar.component.css' })
export class DiscoverySidebarComponent { readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
