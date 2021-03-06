import { Component } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "Sean Reid";
  opened: boolean;
  showMenu: boolean = true;

  menuButton = () => {
    this.showMenu = !this.showMenu;
  };
}
