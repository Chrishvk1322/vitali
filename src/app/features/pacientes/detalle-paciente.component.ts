import { Component, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PacientesService, PacienteDetalle } from "./pacientes.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-detalle-paciente",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./detalle-paciente.component.html",
})
export class DetallePacienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pacientesService = inject(PacientesService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly paciente = signal<PacienteDetalle | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalEliminarAbierto = signal(false);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

  constructor() {
    this.cargarPaciente();
  }

  private async cargarPaciente(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.paciente.set(await this.pacientesService.obtenerPaciente(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el paciente");
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalEliminar(): void {
    this.errorEliminar.set(null);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    if (this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.pacientesService.eliminarPaciente(this.pacienteId);
      await this.router.navigateByUrl("/pacientes/listado");
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar el paciente");
    } finally {
      this.eliminando.set(false);
    }
  }
}
