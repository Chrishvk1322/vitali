import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface AdjuntoResumen {
  id: number;
  nombre_original: string;
  tamano_bytes: number;
  creado_en: string;
}

@Injectable({ providedIn: "root" })
export class AdjuntosService {
  listarAdjuntosSesion(sesionId: number): Promise<AdjuntoResumen[]> {
    return invoke<AdjuntoResumen[]>("listar_adjuntos_sesion", { sesionId });
  }

  agregarAdjuntoSesion(sesionId: number, rutaOrigen: string): Promise<AdjuntoResumen> {
    return invoke<AdjuntoResumen>("agregar_adjunto_sesion", { sesionId, rutaOrigen });
  }

  obtenerRutaAdjunto(id: number): Promise<string> {
    return invoke<string>("obtener_ruta_adjunto", { id });
  }

  eliminarAdjunto(id: number): Promise<void> {
    return invoke<void>("eliminar_adjunto", { id });
  }
}
