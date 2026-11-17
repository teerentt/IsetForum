import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Publication } from '../../../core/models/forum.models';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../icon/icon.component';
@Component({ selector:'app-post-card', standalone:true, imports:[IconComponent, RouterLink], templateUrl:'./post-card.component.html', styleUrl:'./post-card.component.css' })
export class PostCardComponent { readonly post = input.required<Publication>(); readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
