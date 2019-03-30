import { Component } from "@angular/core";
import { faCoffee } from "@fortawesome/free-solid-svg-icons";
import {
  faTwitter,
  faGithub,
  faLinkedinIn
} from "@fortawesome/free-brands-svg-icons";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  title = "Sean Reid";
  opened: boolean;
  showMenu: boolean = true;
  faGithub = faGithub;
  faLinkedinIn = faLinkedinIn;

  menuButton = () => {
    this.showMenu = !this.showMenu;
  };
}
