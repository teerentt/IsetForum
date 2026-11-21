import { IconComponent } from '../../shared/components/icon/icon.component';
import { CommunityVisualComponent } from '../../shared/components/community-visual/community-visual.component';
import { Component, DestroyRef, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
import { PdfAttachmentComponent } from '../../shared/components/pdf-attachment/pdf-attachment.component';
@Component({selector:'app-feed',standalone:true,imports:[IconComponent,CommunityVisualComponent,PostCardComponent,PdfAttachmentComponent],templateUrl:'./feed.component.html',styleUrl:'./feed.component.css'})
export class FeedComponent implements OnInit {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  readonly community = computed(() => this.forum.community(this.ui.communityId()));
  private readonly route = inject(ActivatedRoute); private readonly destroyRef = inject(DestroyRef);
  ngOnInit() { this.ui.view.set('feed'); this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => { this.ui.communityId.set(Number(params.get('id')) || 0); this.ui.feedFilter.set('all'); void this.forum.load(); }); }
}
