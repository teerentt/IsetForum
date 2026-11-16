import { Component, inject } from '@angular/core';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
@Component({selector:'app-admin',standalone:true,imports:[IconComponent],templateUrl:'./admin.component.html',styleUrl:'./admin.component.css'})
export class AdminComponent { readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; constructor() { this.ui.view.set('admin'); this.ui.communityId.set(''); } }
