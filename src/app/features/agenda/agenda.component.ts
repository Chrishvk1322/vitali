import { Component, computed, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AgendaService, CitaConPaciente } from "./agenda.service";
import { GoogleCalendarService, EstadoGoogleCalendar } from "./google-calendar.service";
import { PacientesService, PacienteResumen } from "../pacientes/pacientes.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

interface DiaCalendario {
  fecha: string; // YYYY-MM-DD
  numero: number;
  delMesActual: boolean;
  citas: CitaConPaciente[];
}

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

@Component({
  selector: "app-agenda",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./agenda.component.html",
})
export class AgendaComponent {
  private readonly agendaService = inject(AgendaService);
  private readonly pacientesService = inject(PacientesService);
  private readonly googleCalendarService = inject(GoogleCalendarService);

  readonly diasSemana = DIAS_SEMANA;

  private readonly hoy = new Date();
  readonly anio = signal(this.hoy.getFullYear());
  readonly mes = signal(this.hoy.getMonth()); // 0-11

  readonly citasDelMes = signal<CitaConPaciente[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly fechaSeleccionada = signal<string | null>(null);

  readonly nombreMes = computed(() =>
    new Date(this.anio(), this.mes(), 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    }),
  );

  readonly dias = computed<DiaCalendario[]>(() => {
    const anio = this.anio();
    const mes = this.mes();
    const citas = this.citasDelMes();

    const primerDiaMes = new Date(anio, mes, 1);
    // getDay(): 0=domingo..6=sábado -> convertir a semana que inicia en lunes
    const offset = (primerDiaMes.getDay() + 6) % 7;
    const inicioGrilla = new Date(anio, mes, 1 - offset);

    const citasPorFecha = new Map<string, CitaConPaciente[]>();
    for (const cita of citas) {
      const fecha = cita.fecha_hora_inicio.slice(0, 10);
      const lista = citasPorFecha.get(fecha) ?? [];
      lista.push(cita);
      citasPorFecha.set(fecha, lista);
    }

    return Array.from({ length: 42 }, (_, i) => {
      const fechaDia = new Date(inicioGrilla);
      fechaDia.setDate(inicioGrilla.getDate() + i);
      const iso = fechaDia.toISOString().slice(0, 10);
      return {
        fecha: iso,
        numero: fechaDia.getDate(),
        delMesActual: fechaDia.getMonth() === mes,
        citas: citasPorFecha.get(iso) ?? [],
      };
    });
  });

  readonly citasDelDiaSeleccionado = computed(() => {
    const fecha = this.fechaSeleccionada();
    if (!fecha) return [];
    return this.citasDelMes()
      .filter((c) => c.fecha_hora_inicio.startsWith(fecha))
      .sort((a, b) => a.fecha_hora_inicio.localeCompare(b.fecha_hora_inicio));
  });

  readonly modalNuevaCitaAbierto = signal(false);
  readonly guardandoCita = signal(false);
  readonly busquedaPaciente = signal("");
  readonly resultadosPacientes = signal<PacienteResumen[]>([]);
  readonly pacienteSeleccionado = signal<PacienteResumen | null>(null);
  readonly nuevaFecha = signal("");
  readonly nuevaHora = signal("");
  readonly nuevaNotas = signal("");
  readonly citaEditId = signal<number | null>(null);

  readonly modalEliminarCitaAbierto = signal(false);
  readonly citaAEliminar = signal<number | null>(null);
  readonly eliminandoCita = signal(false);
  readonly errorEliminarCita = signal<string | null>(null);

  readonly modalConfigGoogleAbierto = signal(false);
  readonly estadoGoogle = signal<EstadoGoogleCalendar | null>(null);
  readonly clientIdGoogle = signal("");
  readonly clientSecretGoogle = signal("");
  readonly guardandoCredencialesGoogle = signal(false);
  readonly conectandoGoogle = signal(false);
  readonly desconectandoGoogle = signal(false);
  readonly errorGoogle = signal<string | null>(null);
  readonly mensajeGoogle = signal<string | null>(null);

  constructor() {
    this.cargarMes();
    this.cargarEstadoGoogle();
  }

  private async cargarEstadoGoogle(): Promise<void> {
    try {
      const estado = await this.googleCalendarService.obtenerEstado();
      this.estadoGoogle.set(estado);
      this.clientIdGoogle.set(estado.client_id ?? "");
    } catch {
      // si aún no hay configuración guardada, se mantiene el estado por defecto
    }
  }

  abrirModalConfigGoogle(): void {
    this.errorGoogle.set(null);
    this.mensajeGoogle.set(null);
    this.clientSecretGoogle.set("");
    this.modalConfigGoogleAbierto.set(true);
  }

  cerrarModalConfigGoogle(): void {
    this.modalConfigGoogleAbierto.set(false);
  }

  async guardarCredencialesGoogle(): Promise<void> {
    if (!this.clientIdGoogle().trim() || !this.clientSecretGoogle().trim() || this.guardandoCredencialesGoogle()) return;
    this.guardandoCredencialesGoogle.set(true);
    this.errorGoogle.set(null);
    this.mensajeGoogle.set(null);
    try {
      await this.googleCalendarService.guardarCredenciales({
        client_id: this.clientIdGoogle().trim(),
        client_secret: this.clientSecretGoogle().trim(),
      });
      this.mensajeGoogle.set("Credenciales guardadas. Ahora puedes conectar tu cuenta de Google.");
      await this.cargarEstadoGoogle();
    } catch (err) {
      this.errorGoogle.set(typeof err === "string" ? err : "no se pudieron guardar las credenciales");
    } finally {
      this.guardandoCredencialesGoogle.set(false);
    }
  }

  async conectarGoogle(): Promise<void> {
    if (this.conectandoGoogle()) return;
    this.conectandoGoogle.set(true);
    this.errorGoogle.set(null);
    this.mensajeGoogle.set(null);
    try {
      const email = await this.googleCalendarService.conectar();
      this.mensajeGoogle.set(`Cuenta conectada: ${email}`);
      await this.cargarEstadoGoogle();
    } catch (err) {
      this.errorGoogle.set(typeof err === "string" ? err : "no se pudo conectar con Google Calendar");
    } finally {
      this.conectandoGoogle.set(false);
    }
  }

  async desconectarGoogle(): Promise<void> {
    if (this.desconectandoGoogle()) return;
    this.desconectandoGoogle.set(true);
    this.errorGoogle.set(null);
    this.mensajeGoogle.set(null);
    try {
      await this.googleCalendarService.desconectar();
      await this.cargarEstadoGoogle();
    } catch (err) {
      this.errorGoogle.set(typeof err === "string" ? err : "no se pudo desconectar la cuenta");
    } finally {
      this.desconectandoGoogle.set(false);
    }
  }

  private async cargarMes(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    const anioMes = `${this.anio()}-${String(this.mes() + 1).padStart(2, "0")}`;
    try {
      this.citasDelMes.set(await this.agendaService.listarCitasMes(anioMes));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar la agenda");
    } finally {
      this.cargando.set(false);
    }
  }

  mesAnterior(): void {
    const fecha = new Date(this.anio(), this.mes() - 1, 1);
    this.anio.set(fecha.getFullYear());
    this.mes.set(fecha.getMonth());
    this.fechaSeleccionada.set(null);
    this.cargarMes();
  }

  mesSiguiente(): void {
    const fecha = new Date(this.anio(), this.mes() + 1, 1);
    this.anio.set(fecha.getFullYear());
    this.mes.set(fecha.getMonth());
    this.fechaSeleccionada.set(null);
    this.cargarMes();
  }

  seleccionarDia(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
  }

  claseDia(dia: DiaCalendario): Record<string, boolean> {
    const conCitas = dia.citas.length > 0;
    const seleccionado = this.fechaSeleccionada() === dia.fecha;
    return {
      "text-clinico-texto": dia.delMesActual,
      "text-clinico-texto/25": !dia.delMesActual,
      "border-clinico-secundario": seleccionado,
      "border-transparent": !seleccionado,
      "bg-clinico-secundario": conCitas && !seleccionado,
      "text-white": conCitas && !seleccionado,
      "hover:bg-clinico-fondo": !conCitas,
    };
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
      await this.cargarMes();
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
      await this.cargarMes();
    } catch (err) {
      this.errorEliminarCita.set(typeof err === "string" ? err : "no se pudo eliminar la cita");
    } finally {
      this.eliminandoCita.set(false);
    }
  }

  abrirModalNuevaCita(cita?: CitaConPaciente): void {
    this.resultadosPacientes.set([]);
    if (cita) {
      this.citaEditId.set(cita.id);
      this.pacienteSeleccionado.set({
        id: cita.paciente_id,
        apellidos_nombres: cita.paciente_nombre,
        edad: null,
        telefono: null,
        fecha_consulta: "",
      });
      this.busquedaPaciente.set(cita.paciente_nombre);
      this.nuevaFecha.set(cita.fecha_hora_inicio.slice(0, 10));
      this.nuevaHora.set(cita.fecha_hora_inicio.slice(11, 16));
      this.nuevaNotas.set(cita.notas ?? "");
    } else {
      this.citaEditId.set(null);
      this.busquedaPaciente.set("");
      this.pacienteSeleccionado.set(null);
      this.nuevaFecha.set(this.fechaSeleccionada() ?? "");
      this.nuevaHora.set("09:00");
      this.nuevaNotas.set("");
    }
    this.modalNuevaCitaAbierto.set(true);
  }

  cerrarModalNuevaCita(): void {
    this.modalNuevaCitaAbierto.set(false);
  }

  async onBusquedaPacienteChange(valor: string): Promise<void> {
    this.busquedaPaciente.set(valor);
    this.pacienteSeleccionado.set(null);
    if (!valor.trim()) {
      this.resultadosPacientes.set([]);
      return;
    }
    this.resultadosPacientes.set(await this.pacientesService.listarPacientes(valor));
  }

  seleccionarPaciente(paciente: PacienteResumen): void {
    this.pacienteSeleccionado.set(paciente);
    this.resultadosPacientes.set([]);
    this.busquedaPaciente.set(paciente.apellidos_nombres);
  }

  async guardarNuevaCita(): Promise<void> {
    const paciente = this.pacienteSeleccionado();
    if (!paciente || !this.nuevaFecha() || !this.nuevaHora() || this.guardandoCita()) return;

    this.guardandoCita.set(true);
    try {
      const editId = this.citaEditId();
      if (editId !== null) {
        await this.agendaService.actualizarCita(editId, {
          fecha_hora_inicio: `${this.nuevaFecha()}T${this.nuevaHora()}`,
          notas: this.nuevaNotas() || null,
        });
      } else {
        await this.pacientesService.crearCita({
          paciente_id: paciente.id,
          fecha_hora_inicio: `${this.nuevaFecha()}T${this.nuevaHora()}`,
          fecha_hora_fin: null,
          notas: this.nuevaNotas() || null,
        });
      }
      this.modalNuevaCitaAbierto.set(false);
      await this.cargarMes();
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo agendar la cita");
    } finally {
      this.guardandoCita.set(false);
    }
  }
}
