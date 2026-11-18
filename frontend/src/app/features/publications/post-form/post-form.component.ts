import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { authError } from '../../../core/services/auth.service';
@Component({selector:'app-post-form',standalone:true,imports:[FormsModule],templateUrl:'./post-form.component.html',styleUrl:'./post-form.component.css'})
export class PostFormComponent {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  communityId = this.ui.publishable().find(c => c.id === this.ui.communityId())?.id ?? this.ui.publishable()[0]?.id;
  title = ''; content = ''; error = ''; file: File | null = null;
  pick(event: Event) { this.file = (event.target as HTMLInputElement).files?.[0] ?? null; }
  async submit() {
    if (this.ui.busy()) return;
    this.ui.busy.set(true); this.error = '';
    try {
      const post = await this.forum.createPost(Number(this.communityId), this.title.trim(), this.content.trim());
      let message = 'Publication partagée.';
      if (this.file) try { await this.forum.uploadPdf('publications', post.id, this.file); }
      catch (error) { message = 'Publication créée. PDF non joint : ' + authError(error); }
      this.ui.busy.set(false); this.ui.openPost(post); this.ui.notify(message); await this.forum.load();
    } catch (error) { this.error = authError(error); }
    finally { this.ui.busy.set(false); }
  }
}
