import { afterRenderEffect, Component, ElementRef, inject, viewChild } from '@angular/core';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../icon/icon.component';
import { PostFormComponent } from '../../../features/publications/post-form/post-form.component';
import { CommunityFormComponent } from '../../../features/communities/community-form/community-form.component';

@Component({selector:'app-forum-dialog',standalone:true,imports:[IconComponent,PostFormComponent,CommunityFormComponent],templateUrl:'./forum-dialog.component.html',styleUrl:'./forum-dialog.component.css'})
export class ForumDialogComponent {
  readonly ui = inject(ForumUiService);
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.ui.modal() && !dialog.open) dialog.showModal();
      else if (!this.ui.modal() && dialog.open) dialog.close();
    });
  }
  backdrop(event: MouseEvent) { if (event.target === this.dialog().nativeElement) this.ui.closeModal(); }
}
