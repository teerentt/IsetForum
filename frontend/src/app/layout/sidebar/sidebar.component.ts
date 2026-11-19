import { CommunityVisualComponent } from '../../shared/components/community-visual/community-visual.component';
import { Component, inject } from '@angular/core';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ForumUiService } from '../../core/services/forum-ui.service';
@Component({ selector: 'app-sidebar', standalone: true, imports: [CommunityVisualComponent,IconComponent], templateUrl: './sidebar.component.html', styleUrl: './sidebar.component.css' })
export class SidebarComponent {
  readonly ui = inject(ForumUiService);
  readonly forum = this.ui.forum;
}
