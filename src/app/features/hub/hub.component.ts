import { Component } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/auth.service";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-hub",
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: "./hub.component.html",
})
export class HubComponent {
  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigateByUrl("/login");
  }
}
