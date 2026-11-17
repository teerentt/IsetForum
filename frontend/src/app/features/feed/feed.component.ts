import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
@Component({ selector: 'app-feed', standalone: true, imports: [DecimalPipe, IconComponent, PostCardComponent], templateUrl: './feed.component.html', styleUrl: './feed.component.css' })
export class FeedComponent implements OnInit {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  private readonly route = inject(ActivatedRoute); private readonly destroyRef = inject(DestroyRef);
  ngOnInit() {
    this.ui.view.set('feed');
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.ui.communityId.set(params.get('id') ?? '');
      this.ui.communityTab.set('posts');
    });
  }
}
