import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { PostCardComponent } from '../../shared/components/post-card/post-card.component';
@Component({selector:'app-profile',standalone:true,imports:[PostCardComponent],templateUrl:'./profile.component.html',styleUrl:'./profile.component.css'})
export class ProfileComponent implements OnInit {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  readonly tab = signal<'posts' | 'saved'>('posts');
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly destroyRef = inject(DestroyRef);
  readonly posts = computed(() => {
    const person = this.forum.person(); const query = this.ui.query().toLowerCase().trim();
    if (!person) return [];
    return this.forum.posts().filter(post =>
      (this.tab() === 'saved' ? post.savedBy.includes(person.id) : post.authorId === person.id || (!post.authorId && post.author === person.name)) &&
      (post.title + ' ' + post.body).toLowerCase().includes(query)
    ).sort((a, b) => b.createdAt - a.createdAt);
  });
  ngOnInit() {
    this.ui.view.set('profile'); this.ui.communityId.set('');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.tab.set(params.get('onglet') === 'favoris' || this.route.snapshot.data['tab'] === 'saved' ? 'saved' : 'posts');
    });
  }
  changeTab(tab: 'posts' | 'saved') {
    void this.router.navigate(['/forum/profil'], {queryParams: tab === 'saved' ? {onglet: 'favoris'} : {}});
  }
}
