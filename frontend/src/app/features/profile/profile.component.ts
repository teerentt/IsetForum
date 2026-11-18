import { Component, computed, inject } from '@angular/core';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
@Component({selector:'app-profile',standalone:true,imports:[PostCardComponent],templateUrl:'./profile.component.html',styleUrl:'./profile.component.css'})
export class ProfileComponent {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  readonly posts = computed(() => this.forum.posts().filter(p => p.authorId === this.forum.person()?.id));
  constructor() { this.ui.view.set('profile'); this.ui.communityId.set(0); }
}
