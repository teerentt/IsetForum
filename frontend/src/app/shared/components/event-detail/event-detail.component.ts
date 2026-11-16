import { Component, inject } from '@angular/core';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../icon/icon.component';
@Component({selector:'app-event-detail',standalone:true,imports:[IconComponent],templateUrl:'./event-detail.component.html',styleUrl:'./event-detail.component.css'})
export class EventDetailComponent { readonly ui = inject(ForumUiService); }
