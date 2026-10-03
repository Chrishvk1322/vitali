import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { AnalisisFuncionalService, ProblemaResumen } from "./analisis-funcional.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-listado-problemas",
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./listado-problemas.component.html",
})
export class ListadoProblemasComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly analisisFuncionalService = inject(AnalisisFuncionalService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly problemas = signal<ProblemaResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalNuevoProblemaAbierto = signal(false);
  readonly nuevoNombre = signal("");
  readonly guardando = signal(false);

  readonly modalEliminarAbierto = signal(false);
  readonly problemaAEliminar = signal<number | null>(null);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

  readonly nota = signal("");
  readonly guardandoNota = signal(false);
  readonly notaGuardada = signal(false);
  readonly errorNota = signal<string | null>(null);

  constructor() {
    this.cargarProblemas();
    this.cargarNota();
  }

  private async cargarNota(): Promise<void> {
    try {
      this.nota.set((await this.analisisFuncionalService.obtenerNotaSesionConsulta(this.pacienteId)) ?? "");
    } catch (err) {
      this.errorNota.set(typeof err === "string" ? err : "no se pudo cargar la nota");
    }
  }

  onNotaChange(valor: string): void {
    this.nota.set(valor);
    this.notaGuardada.set(false);
  }

  async guardarNota(): Promise<void> {
    if (this.guardandoNota()) return;
    this.guardandoNota.set(true);
    this.errorNota.set(null);
    try {
      await this.analisisFuncionalService.guardarNotaSesionConsulta(this.pacienteId, this.nota().trim() || null);
      this.notaGuardada.set(true);
    } catch (err) {
      this.errorNota.set(typeof err === "string" ? err : "no se pudo guardar la nota");
    } finally {
      this.guardandoNota.set(false);
    }
  }

  private async cargarProblemas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.problemas.set(await this.analisisFuncionalService.listarProblemas(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudieron cargar los problemas");
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalNuevoProblema(): void {
    this.nuevoNombre.set("");
    this.modalNuevoProblemaAbierto.set(true);
  }

  cerrarModalNuevoProblema(): void {
    this.modalNuevoProblemaAbierto.set(false);
  }

  async guardarNuevoProblema(): Promise<void> {
    const nombre = this.nuevoNombre().trim();
    if (!nombre || this.guardando()) return;

    this.guardando.set(true);
    try {
      await this.analisisFuncionalService.crearProblema({ paciente_id: this.pacienteId, nombre });
      this.modalNuevoProblemaAbierto.set(false);
      await this.cargarProblemas();
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo agregar el problema");
    } finally {
      this.guardando.set(false);
    }
  }

  abrirModalEliminar(id: number): void {
    this.errorEliminar.set(null);
    this.problemaAEliminar.set(id);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    const id = this.problemaAEliminar();
    if (id === null || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.analisisFuncionalService.eliminarProblema(id);
      this.modalEliminarAbierto.set(false);
      await this.cargarProblemas();
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar el problema");
    } finally {
      this.eliminando.set(false);
    }
  }
}
