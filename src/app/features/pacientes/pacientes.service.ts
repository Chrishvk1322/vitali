import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface PacienteInput {
  apellidos_nombres: string;
  edad: number | null;
  sexo: string | null;
  fecha_nacimiento: string;
  lugar_nacimiento: string | null;
  grado_instruccion: string | null;
  ocupacion: string | null;
  estado_civil: string | null;
  num_hijos: number | null;
  num_hermanos: number | null;
  vive_con: string | null;
  domicilio: string | null;
  telefono: string | null;
  email: string | null;
  nombre_acompanante: string | null;
  fecha_consulta: string;
}

export interface PacienteResumen {
  id: number;
  apellidos_nombres: string;
  edad: number | null;
  telefono: string | null;
  fecha_consulta: string;
}

export interface PacienteDetalle extends PacienteInput {
  id: number;
}

export interface SesionInput {
  paciente_id: number;
  fecha_hora: string;
  resumen_tratado: string | null;
  observaciones: string | null;
  tareas: string | null;
}

export interface SesionResumen {
  id: number;
  fecha_hora: string;
  resumen_tratado: string | null;
  observaciones: string | null;
  tareas: string | null;
}

export interface SesionActualizarInput {
  fecha_hora: string;
  resumen_tratado: string | null;
  observaciones: string | null;
  tareas: string | null;
}

export interface CitaInput {
  paciente_id: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  notas: string | null;
}

@Injectable({ providedIn: "root" })
export class PacientesService {
  crearPaciente(paciente: PacienteInput): Promise<number> {
    return invoke<number>("crear_paciente", { paciente });
  }

  listarPacientes(busqueda?: string): Promise<PacienteResumen[]> {
    return invoke<PacienteResumen[]>("listar_pacientes", { busqueda: busqueda ?? "" });
  }

  obtenerPaciente(id: number): Promise<PacienteDetalle> {
    return invoke<PacienteDetalle>("obtener_paciente", { id });
  }

  actualizarPaciente(id: number, paciente: PacienteInput): Promise<void> {
    return invoke<void>("actualizar_paciente", { id, paciente });
  }

  eliminarPaciente(id: number): Promise<void> {
    return invoke<void>("eliminar_paciente", { id });
  }

  listarSesiones(pacienteId: number): Promise<SesionResumen[]> {
    return invoke<SesionResumen[]>("listar_sesiones", { pacienteId });
  }

  crearSesion(sesion: SesionInput): Promise<number> {
    return invoke<number>("crear_sesion", { sesion });
  }

  actualizarSesion(id: number, sesion: SesionActualizarInput): Promise<void> {
    return invoke<void>("actualizar_sesion", { id, sesion });
  }

  eliminarSesion(id: number): Promise<void> {
    return invoke<void>("eliminar_sesion", { id });
  }

  crearCita(cita: CitaInput): Promise<number> {
    return invoke<number>("crear_cita", { cita });
  }
}
