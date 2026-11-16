import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
@Component({selector:'app-post-form',standalone:true,imports:[FormsModule,IconComponent],templateUrl:'./post-form.component.html',styleUrl:'./post-form.component.css'})
export class PostFormComponent { readonly ui = inject(ForumUiService); }
