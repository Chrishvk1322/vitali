import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PacientesService, PacienteResumen } from "./pacientes.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-listado-pacientes",
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./listado-pacientes.component.html",
})
export class ListadoPacientesComponent {
  private readonly pacientesService = inject(PacientesService);

  readonly busqueda = signal("");
  readonly pacientes = signal<PacienteResumen[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.buscar();
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.buscar();
  }

  private async buscar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const resultado = await this.pacientesService.listarPacientes(this.busqueda());
      this.pacientes.set(resultado);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el listado de pacientes");
    } finally {
      this.cargando.set(false);
    }
  }
}
