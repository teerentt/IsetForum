import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-community-visual',
  standalone: true,
  templateUrl: './community-visual.component.html',
  styleUrl: './community-visual.component.css'
})
export class CommunityVisualComponent {
  readonly name = input.required<string>();
  readonly image = computed(() => {
    const name = this.name().toLowerCase();
    const themes = [
      { words: ['mysql', 'sql', 'données'], image: 'database' },
      { words: ['informatique', 'développement', 'angular', 'java'], image: 'code' },
      { words: ['math', 'révision'], image: 'math' },
      { words: ['robot'], image: 'robotics' },
      { words: ['anglais', 'langue', 'communication'], image: 'language' },
      { words: ['projet', 'études'], image: 'project' },
      { words: ['campus'], image: 'campus' }
    ];
    return 'assets/communities/' + (themes.find(theme => theme.words.some(word => name.includes(word)))?.image ?? 'default') + '.svg';
  });
}
