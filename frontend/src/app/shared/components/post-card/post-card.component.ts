import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Publication } from '../../../core/models/api.models';
import { ForumUiService } from '../../../core/services/forum-ui.service';
@Component({selector:'app-post-card',standalone:true,imports:[RouterLink,DatePipe],templateUrl:'./post-card.component.html',styleUrl:'./post-card.component.css'})
export class PostCardComponent { readonly post = input.required<Publication>(); readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
