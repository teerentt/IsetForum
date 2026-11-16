import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({selector:'app-community-form',standalone:true,imports:[FormsModule,IconComponent],templateUrl:'./community-form.component.html',styleUrl:'./community-form.component.css'})
export class CommunityFormComponent { readonly ui = inject(ForumUiService); }
