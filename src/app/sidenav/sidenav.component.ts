import { Component, OnInit, Output, EventEmitter } from "@angular/core";
import {
  faTwitter,
  faGithub,
  faLinkedinIn
} from "@fortawesome/free-brands-svg-icons";
@Component({
  selector: "app-sidenav",
  templateUrl: "./sidenav.component.html",
  styleUrls: ["./sidenav.component.scss"]
})
export class SidenavComponent implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter();

  ngOnInit() {}

  faGithub = faGithub;
  faLinkedinIn = faLinkedinIn;
}
