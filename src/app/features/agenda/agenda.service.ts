import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface CitaActualizarInput {
  fecha_hora_inicio: string;
  notas: string | null;
}

export interface CitaConPaciente {
  id: number;
  paciente_id: number;
  paciente_nombre: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  estado: string;
  notas: string | null;
}

@Injectable({ providedIn: "root" })
export class AgendaService {
  listarCitasMes(anioMes: string): Promise<CitaConPaciente[]> {
    return invoke<CitaConPaciente[]>("listar_citas_mes", { anioMes });
  }

  listarCitasPaciente(pacienteId: number): Promise<CitaConPaciente[]> {
    return invoke<CitaConPaciente[]>("listar_citas_paciente", { pacienteId });
  }

  actualizarCita(id: number, cita: CitaActualizarInput): Promise<void> {
    return invoke<void>("actualizar_cita", { id, cita });
  }

  cancelarCita(id: number): Promise<void> {
    return invoke<void>("cancelar_cita", { id });
  }

  eliminarCita(id: number): Promise<void> {
    return invoke<void>("eliminar_cita", { id });
  }
}
