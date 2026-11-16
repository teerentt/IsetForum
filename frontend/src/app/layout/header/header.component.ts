import { Component, ElementRef, HostListener, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ForumUiService } from '../../core/services/forum-ui.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({ selector: 'app-header', standalone: true, imports: [FormsModule, IconComponent], templateUrl: './header.component.html', styleUrl: './header.component.css' })
export class HeaderComponent {
  readonly ui = inject(ForumUiService); readonly forum = this.ui.forum;
  readonly theme = inject(ThemeService);
  readonly search = viewChild.required<ElementRef<HTMLInputElement>>('search');
  @HostListener('document:keydown', ['$event']) onKey(event: KeyboardEvent) {
    if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !this.ui.modal()) {
      event.preventDefault(); this.search().nativeElement.focus();
    }
  }
}
