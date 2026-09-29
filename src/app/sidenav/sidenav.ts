import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGithub, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive, FaIconComponent, MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
})
export class Sidenav {
  readonly close = output<void>();

  protected readonly links = [
    { path: '/summary', label: 'Summary' },
    { path: '/experience', label: 'Experience' },
    { path: '/employment', label: 'Employment' },
    { path: '/experiments', label: 'Experiments' },
    { path: '/interests', label: 'Interests' },
    { path: '/fitness', label: 'Fitness' },
  ];

  protected readonly faGithub = faGithub;
  protected readonly faLinkedinIn = faLinkedinIn;
}
