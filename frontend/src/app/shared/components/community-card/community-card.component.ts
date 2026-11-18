import { Component, inject, input } from '@angular/core';
import { Community } from '../../../core/models/api.models';
import { ForumUiService } from '../../../core/services/forum-ui.service';
@Component({selector:'app-community-card',standalone:true,templateUrl:'./community-card.component.html',styleUrl:'./community-card.component.css'})
export class CommunityCardComponent { readonly community = input.required<Community>(); readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
