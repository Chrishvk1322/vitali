import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface RespuestaEntrevistaInput {
  pregunta_codigo: string;
  respuesta: string | null;
}

export interface RespuestaEntrevista {
  pregunta_codigo: string;
  respuesta: string | null;
}

@Injectable({ providedIn: "root" })
export class EntrevistaService {
  obtenerEntrevista(pacienteId: number): Promise<RespuestaEntrevista[]> {
    return invoke<RespuestaEntrevista[]>("obtener_entrevista", { pacienteId });
  }

  guardarEntrevista(pacienteId: number, respuestas: RespuestaEntrevistaInput[]): Promise<void> {
    return invoke<void>("guardar_entrevista", { pacienteId, respuestas });
  }
}
