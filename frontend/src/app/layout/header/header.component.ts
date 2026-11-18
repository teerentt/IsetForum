import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { ThemeService } from '../../core/services/theme.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
@Component({selector:'app-header',standalone:true,imports:[FormsModule,IconComponent],templateUrl:'./header.component.html',styleUrl:'./header.component.css'})
export class HeaderComponent {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum; readonly theme = inject(ThemeService);
  searchFor(query: string) { if (this.ui.view() === 'publication' || this.ui.view() === 'admin') this.ui.navigate('feed'); this.ui.query.set(query); }
}
