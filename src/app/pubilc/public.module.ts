import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EmploymentComponent } from "@app/pubilc/employment/employment.component";
import { ExperienceComponent } from "@app/pubilc/experience/experience.component";
import { ExperimentsComponent } from "@app/pubilc/experiments/experiments.component";
import { InterestsComponent } from "@app/pubilc/interests/interests.component";
import { SummaryComponent } from "@app/pubilc/summary/summary.component";
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

@NgModule({
  declarations: [
    EmploymentComponent,
    ExperienceComponent,
    ExperimentsComponent,
    InterestsComponent,
    SummaryComponent,
    PageNotFoundComponent
  ],
  imports: [CommonModule],
  exports: [
    EmploymentComponent,
    ExperienceComponent,
    ExperimentsComponent,
    InterestsComponent,
    SummaryComponent
  ]
})
export class PublicModule {}
