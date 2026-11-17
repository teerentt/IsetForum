import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({selector:'app-post-detail',standalone:true,imports:[FormsModule,IconComponent,RouterLink],templateUrl:'./post-detail.component.html',styleUrl:'./post-detail.component.css'})
export class PostDetailComponent implements OnInit {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  private readonly route = inject(ActivatedRoute); private readonly destroyRef = inject(DestroyRef);
  ngOnInit() {
    this.ui.view.set('publication'); this.ui.communityId.set('');
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.ui.selectedId.set(params.get('id') ?? ''); this.ui.commentBody = '';
    });
  }
}
