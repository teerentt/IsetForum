import { Component, inject } from '@angular/core';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { CommunityCardComponent } from '../../shared/components/community-card/community-card.component';
@Component({selector:'app-communities',standalone:true,imports:[CommunityCardComponent],templateUrl:'./communities.component.html',styleUrl:'./communities.component.css'})
export class CommunitiesComponent { readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; constructor(){this.ui.view.set('communities');this.ui.communityId.set(0);void this.forum.load();} }
