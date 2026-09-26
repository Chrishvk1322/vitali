import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface SesionPlanInput {
  descripcion: string | null;
  contenido: string | null;
}

export interface FasePlanInput {
  nombre: string | null;
  sesiones: SesionPlanInput[];
}

export interface PropuestaInput {
  objetivo_general: string | null;
  objetivos_especificos: string[];
  modalidad: string | null;
  frecuencia: string | null;
  duracion_sesion_minutos: string | null;
  duracion_estimada_tratamiento: string | null;
  fases: FasePlanInput[];
}

export type PropuestaDetalle = PropuestaInput;

@Injectable({ providedIn: "root" })
export class PropuestaService {
  obtenerPropuesta(pacienteId: number): Promise<PropuestaDetalle> {
    return invoke<PropuestaDetalle>("obtener_propuesta", { pacienteId });
  }

  guardarPropuesta(pacienteId: number, propuesta: PropuestaInput): Promise<void> {
    return invoke<void>("guardar_propuesta", { pacienteId, propuesta });
  }
}
