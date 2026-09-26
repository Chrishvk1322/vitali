import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TestsService, TestResumen } from "./tests.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-seleccionar-test",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./seleccionar-test.component.html",
})
export class SeleccionarTestComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly testsService = inject(TestsService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly tests = signal<TestResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.cargarTests();
  }

  private async cargarTests(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.tests.set(await this.testsService.listarTests());
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el listado de tests");
    } finally {
      this.cargando.set(false);
    }
  }
}
