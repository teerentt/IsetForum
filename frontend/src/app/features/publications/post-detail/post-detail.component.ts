import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({selector:'app-post-detail',standalone:true,imports:[FormsModule,IconComponent],templateUrl:'./post-detail.component.html',styleUrl:'./post-detail.component.css'})
export class PostDetailComponent { readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
