import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TestsService, ResultadoResumen } from "../tests/tests.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-evaluaciones-paciente",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./evaluaciones-paciente.component.html",
})
export class EvaluacionesPacienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly testsService = inject(TestsService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly resultados = signal<ResultadoResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalEliminarResultadoAbierto = signal(false);
  readonly resultadoAEliminar = signal<number | null>(null);
  readonly eliminandoResultado = signal(false);
  readonly errorEliminarResultado = signal<string | null>(null);

  constructor() {
    this.cargarResultados();
  }

  private async cargarResultados(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resultados.set(await this.testsService.listarResultadosPaciente(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudieron cargar las evaluaciones");
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalEliminarResultado(id: number): void {
    this.errorEliminarResultado.set(null);
    this.resultadoAEliminar.set(id);
    this.modalEliminarResultadoAbierto.set(true);
  }

  cerrarModalEliminarResultado(): void {
    this.modalEliminarResultadoAbierto.set(false);
  }

  async confirmarEliminarResultado(): Promise<void> {
    const id = this.resultadoAEliminar();
    if (id === null || this.eliminandoResultado()) return;
    this.eliminandoResultado.set(true);
    this.errorEliminarResultado.set(null);
    try {
      await this.testsService.eliminarResultado(id);
      this.modalEliminarResultadoAbierto.set(false);
      this.resultados.set(await this.testsService.listarResultadosPaciente(this.pacienteId));
    } catch (err) {
      this.errorEliminarResultado.set(typeof err === "string" ? err : "no se pudo eliminar la evaluación");
    } finally {
      this.eliminandoResultado.set(false);
    }
  }
}
