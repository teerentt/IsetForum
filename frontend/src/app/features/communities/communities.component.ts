import { Component, inject } from '@angular/core';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CommunityCardComponent } from '../../shared/components/community-card/community-card.component';

@Component({ selector: 'app-communities', standalone: true, imports: [IconComponent, CommunityCardComponent], templateUrl: './communities.component.html', styleUrl: './communities.component.css' })
export class CommunitiesComponent {
  readonly ui = inject(ForumUiService);
  constructor() { this.ui.view.set('communities'); this.ui.communityId.set(''); }
}
