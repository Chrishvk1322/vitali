import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { TestsService, TestResumen } from "./tests.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-tests",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./tests.component.html",
})
export class TestsComponent {
  private readonly testsService = inject(TestsService);

  readonly tests = signal<TestResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalEliminarAbierto = signal(false);
  readonly testAEliminar = signal<TestResumen | null>(null);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

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

  abrirModalEliminar(test: TestResumen): void {
    this.errorEliminar.set(null);
    this.testAEliminar.set(test);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    const test = this.testAEliminar();
    if (!test || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.testsService.eliminarTest(test.id);
      this.modalEliminarAbierto.set(false);
      await this.cargarTests();
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar el test");
    } finally {
      this.eliminando.set(false);
    }
  }
}
