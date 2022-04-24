import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { EmploymentComponent } from "@app/pubilc/employment/employment.component";
import { ExperienceComponent } from "@app/pubilc/experience/experience.component";
import { ExperimentsComponent } from "@app/pubilc/experiments/experiments.component";
import { InterestsComponent } from "@app/pubilc/interests/interests.component";
import { SummaryComponent } from "@app/pubilc/summary/summary.component";
import { PageNotFoundComponent } from "@app/pubilc/page-not-found/page-not-found.component";

const routes: Routes = [
  { path: "employment", component: EmploymentComponent },
  { path: "experience", component: ExperienceComponent },
  { path: "experiments", component: ExperimentsComponent },
  { path: "interests", component: InterestsComponent },
  { path: "summary", component: SummaryComponent },

  { path: "", redirectTo: "/summary", pathMatch: "full" },
  { path: "**", component: PageNotFoundComponent }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes
// { enableTracing: true }
, { relativeLinkResolution: 'legacy' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
