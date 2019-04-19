import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { MaterialModule } from "./material/material.module";

import { FlexLayoutModule } from "@angular/flex-layout";
import { SidenavComponent } from "@app/sidenav/sidenav.component";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PublicModule } from "@app/pubilc/public.module";

@NgModule({
  declarations: [AppComponent, SidenavComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    MaterialModule,
    FontAwesomeModule,
    PublicModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
