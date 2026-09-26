import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface GrabacionResumen {
  id: number;
  nombre: string;
  tamano_bytes: number;
  creado_en: string;
}

@Injectable({ providedIn: "root" })
export class GrabacionesService {
  listarGrabaciones(pacienteId: number): Promise<GrabacionResumen[]> {
    return invoke<GrabacionResumen[]>("listar_grabaciones", { pacienteId });
  }

  crearGrabacion(pacienteId: number, nombre: string, datosBase64: string): Promise<GrabacionResumen> {
    return invoke<GrabacionResumen>("crear_grabacion", { pacienteId, nombre, datosBase64 });
  }

  renombrarGrabacion(id: number, nombre: string): Promise<void> {
    return invoke<void>("renombrar_grabacion", { id, nombre });
  }

  obtenerRutaGrabacion(id: number): Promise<string> {
    return invoke<string>("obtener_ruta_grabacion", { id });
  }

  eliminarGrabacion(id: number): Promise<void> {
    return invoke<void>("eliminar_grabacion", { id });
  }
}
