import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./login.component.html",
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ["", Validators.required],
    password: ["", Validators.required],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.cargando()) return;

    this.cargando.set(true);
    this.error.set(null);

    const { username, password } = this.form.getRawValue();

    try {
      await this.auth.login(username, password);
      await this.router.navigateByUrl("/hub");
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo iniciar sesión");
    } finally {
      this.cargando.set(false);
    }
  }
}
