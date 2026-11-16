import { Component, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Community } from '../../../core/models/forum.models';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../icon/icon.component';

@Component({ selector: 'app-community-card', standalone: true, imports: [DecimalPipe, IconComponent], templateUrl: './community-card.component.html', styleUrl: './community-card.component.css' })
export class CommunityCardComponent { readonly community = input.required<Community>(); readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; }
