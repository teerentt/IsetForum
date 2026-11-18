import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { authError } from '../../../core/services/auth.service';
@Component({selector:'app-community-form',standalone:true,imports:[FormsModule],templateUrl:'./community-form.component.html',styleUrl:'./community-form.component.css'})
export class CommunityFormComponent {
  readonly ui = inject(ForumUiService); name = ''; description = ''; visibility: 'PUBLIC'|'PRIVATE' = 'PUBLIC'; error = '';
  async submit() {
    if (this.ui.busy()) return;
    this.ui.busy.set(true); this.error = '';
    try { const community = await this.ui.forum.createCommunity(this.name.trim(), this.description.trim(), this.visibility); await this.ui.forum.load(); this.ui.busy.set(false); this.ui.closeModal(); this.ui.openCommunity(community); }
    catch (error) { this.error = authError(error); }
    finally { this.ui.busy.set(false); }
  }
}
