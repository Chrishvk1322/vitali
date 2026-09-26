import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { PacientesService } from "./pacientes.service";
import { AgendaService, CitaConPaciente } from "../agenda/agenda.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-citas-paciente",
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, IconComponent],
  templateUrl: "./citas-paciente.component.html",
})
export class CitasPacienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pacientesService = inject(PacientesService);
  private readonly agendaService = inject(AgendaService);
  private readonly fb = inject(FormBuilder);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly citas = signal<CitaConPaciente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalCitaAbierto = signal(false);
  readonly guardandoCita = signal(false);
  readonly citaEditId = signal<number | null>(null);

  readonly modalEliminarCitaAbierto = signal(false);
  readonly citaAEliminar = signal<number | null>(null);
  readonly eliminandoCita = signal(false);
  readonly errorEliminarCita = signal<string | null>(null);

  readonly formCita = this.fb.nonNullable.group({
    fecha: ["", Validators.required],
    hora: ["", Validators.required],
    notas: this.fb.control<string | null>(null),
  });

  constructor() {
    this.cargarCitas();
  }

  private async cargarCitas(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.citas.set(await this.agendaService.listarCitasPaciente(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudieron cargar las citas");
    } finally {
      this.cargando.set(false);
    }
  }

  abrirModalCita(cita?: CitaConPaciente): void {
    if (cita) {
      this.citaEditId.set(cita.id);
      this.formCita.setValue({
        fecha: cita.fecha_hora_inicio.slice(0, 10),
        hora: cita.fecha_hora_inicio.slice(11, 16),
        notas: cita.notas,
      });
    } else {
      this.citaEditId.set(null);
      this.formCita.reset();
    }
    this.modalCitaAbierto.set(true);
  }

  cerrarModalCita(): void {
    this.modalCitaAbierto.set(false);
  }

  async guardarCita(): Promise<void> {
    if (this.formCita.invalid || this.guardandoCita()) return;
    this.guardandoCita.set(true);
    try {
      const { fecha, hora, notas } = this.formCita.getRawValue();
      const editId = this.citaEditId();
      if (editId !== null) {
        await this.agendaService.actualizarCita(editId, {
          fecha_hora_inicio: `${fecha}T${hora}`,
          notas,
        });
      } else {
        await this.pacientesService.crearCita({
          paciente_id: this.pacienteId,
          fecha_hora_inicio: `${fecha}T${hora}`,
          fecha_hora_fin: null,
          notas,
        });
      }
      this.modalCitaAbierto.set(false);
      this.citas.set(await this.agendaService.listarCitasPaciente(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo agendar la cita");
    } finally {
      this.guardandoCita.set(false);
    }
  }

  claseBadgeEstado(estado: string): string {
    switch (estado) {
      case "Completada":
        return "bg-clinico-primario/15 text-clinico-primario";
      case "Cancelada":
        return "bg-red-50 text-red-500";
      default:
        return "bg-clinico-secundario/10 text-clinico-secundario";
    }
  }

  async cancelarCita(id: number): Promise<void> {
    try {
      await this.agendaService.cancelarCita(id);
      this.citas.set(await this.agendaService.listarCitasPaciente(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cancelar la cita");
    }
  }

  abrirModalEliminarCita(id: number): void {
    this.errorEliminarCita.set(null);
    this.citaAEliminar.set(id);
    this.modalEliminarCitaAbierto.set(true);
  }

  cerrarModalEliminarCita(): void {
    this.modalEliminarCitaAbierto.set(false);
  }

  async confirmarEliminarCita(): Promise<void> {
    const id = this.citaAEliminar();
    if (id === null || this.eliminandoCita()) return;
    this.eliminandoCita.set(true);
    this.errorEliminarCita.set(null);
    try {
      await this.agendaService.eliminarCita(id);
      this.modalEliminarCitaAbierto.set(false);
      this.citas.set(await this.agendaService.listarCitasPaciente(this.pacienteId));
    } catch (err) {
      this.errorEliminarCita.set(typeof err === "string" ? err : "no se pudo eliminar la cita");
    } finally {
      this.eliminandoCita.set(false);
    }
  }
}
