import { Component, inject } from '@angular/core';
import { ForumUiService } from '../../../core/services/forum-ui.service';
import { IconComponent } from '../icon/icon.component';
@Component({selector:'app-notification',standalone:true,imports:[IconComponent],templateUrl:'./notification.component.html',styleUrl:'./notification.component.css'})
export class NotificationComponent { readonly ui = inject(ForumUiService); }
