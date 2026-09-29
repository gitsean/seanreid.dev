import { Routes } from '@angular/router';
import { Employment } from './pubilc/employment/employment';
import { Experience } from './pubilc/experience/experience';
import { Experiments } from './pubilc/experiments/experiments';
import { Interests } from './pubilc/interests/interests';
import { PageNotFound } from './pubilc/page-not-found/page-not-found';
import { Summary } from './pubilc/summary/summary';

export const routes: Routes = [
  { path: 'employment', component: Employment },
  { path: 'experience', component: Experience },
  { path: 'experiments', component: Experiments },
  { path: 'interests', component: Interests },
  { path: 'summary', component: Summary },
  { path: 'fitness', loadComponent: () => import('./pubilc/fitness/fitness').then((m) => m.Fitness) },

  { path: '', redirectTo: '/summary', pathMatch: 'full' },
  { path: '**', component: PageNotFound },
];
