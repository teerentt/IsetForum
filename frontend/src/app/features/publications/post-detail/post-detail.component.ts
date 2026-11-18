import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { authError } from '../../../core/services/auth.service';
import { Publication, Comment } from '../../../core/models/api.models';
import { PdfAttachmentComponent } from '../../../shared/components/pdf-attachment/pdf-attachment.component';
@Component({selector:'app-post-detail',standalone:true,imports:[FormsModule,DatePipe,RouterLink,PdfAttachmentComponent],templateUrl:'./post-detail.component.html',styleUrl:'./post-detail.component.css'})
export class PostDetailComponent implements OnInit {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  private readonly route = inject(ActivatedRoute); private readonly destroyRef = inject(DestroyRef);
  readonly post = signal<Publication|null>(null); readonly comments = signal<Comment[]>([]);
  readonly loading = signal(true); readonly busy = signal(false); readonly error = signal('');
  editing = false; title = ''; content = ''; commentBody = ''; editCommentId: number|null = null; editCommentBody = '';
  private id = 0; private version = 0;
  ngOnInit() { this.ui.view.set('publication'); this.ui.communityId.set(0); this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => { this.id = Number(params.get('id')); this.commentBody = ''; void this.load(); }); }
  async load() {
    const version = ++this.version;
    this.loading.set(true); this.error.set(''); this.post.set(null); this.comments.set([]);
    try {
      const [post, comments] = await Promise.all([this.forum.publication(this.id), this.forum.comments(this.id)]);
      if (version !== this.version) return;
      this.post.set(post); this.comments.set(comments); this.title = post.title; this.content = post.content; this.editing = false; this.editCommentId = null;
    } catch (error) { if (version === this.version) this.error.set(authError(error)); }
    finally { if (version === this.version) this.loading.set(false); }
  }
  canEditComment(comment: Comment) { return comment.authorId === this.forum.person()?.id && !!this.post() && this.forum.status(this.post()!.communityId) === 'ACTIVE'; }
  async save() {
    this.busy.set(true); this.error.set('');
    try { await this.forum.updatePost(this.id, this.title.trim(), this.content.trim()); await this.load(); await this.forum.load(); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
  async remove() {
    if (!confirm('Supprimer cette publication et tous ses commentaires ?')) return;
    this.busy.set(true);
    try { await this.forum.deletePost(this.id); await this.forum.load(); this.ui.navigate('feed'); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
  async comment() {
    if (this.busy() || !this.commentBody.trim()) return;
    this.busy.set(true); this.error.set('');
    try { await this.forum.addComment(this.id, this.commentBody.trim()); this.commentBody = ''; await this.load(); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
  editComment(comment: Comment) { this.editCommentId = comment.id; this.editCommentBody = comment.content; }
  async saveComment(comment: Comment) {
    this.busy.set(true); this.error.set('');
    try { await this.forum.updateComment(comment.id, this.editCommentBody.trim()); await this.load(); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
  async removeComment(comment: Comment) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    this.busy.set(true); this.error.set('');
    try { await this.forum.deleteComment(comment.id); await this.load(); }
    catch (error) { this.error.set(authError(error)); }
    finally { this.busy.set(false); }
  }
}
