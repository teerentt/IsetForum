import { Component, Input } from '@angular/core';

const paths: Record<string, string> = {
  mail: 'M3 5h18v14H3V5m0 0 9 7 9-7',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  'eye-off': 'm3 3 18 18M10 5q7-2 12 7l-3 4M6 6q-3 3-4 6s4 7 10 7q2 0 4-1m-7-9q-2 3 2 5',
  cap: 'm2 9 10-5 10 5-10 5L2 9m4 2v7q6 4 12 0v-7m4-2v7',
  home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3V10',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-5-4-3 5-5 3 3-5 5-3',
  book: 'M12 5v16M3 4q5-1 9 2 4-3 9-2v15q-5-1-9 2-4-3-9-2V4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  search: 'M20 20l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12q2 2 4 0',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm6 9 6 6 6-6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  message: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2-5a8.5 8.5 0 1 1 16-3.5Z',
  bookmark: 'M6 3h12v18l-6-4-6 4V3',
  fire: 'M12 3c1 6-5 5-3 11-3-1-3-4-3-4-5 7 0 12 6 12 8 0 11-10 0-19Z',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-9-5v6l4 2',
  lock: 'M6 10h12v11H6V10m2 0V6a4 4 0 0 1 8 0v4m-4 5v2',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  file: 'M14 2H4v20h16V8l-6-6v6h6M8 13h8m-8 4h6',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',
  calendar: 'M4 5h16v16H4V5m3-3v6m10-6v6M4 11h16',
  shield: 'm12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4m-4 10 3 3 5-6',
  logout: 'M9 4H3v16h6m5-13 5 5-5 5m-6-5h13',
  menu: 'M4 6h16M4 12h16M4 18h16',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  chart: 'M4 20h16M7 16v-5m5 5V5m5 11V8',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css'
})
export class IconComponent {
  @Input() name = 'home';
  get path() { return paths[this.name] ?? paths['spark']; }
}
