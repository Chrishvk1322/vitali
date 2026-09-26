import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface RecursoResumen {
  id: number;
  nombre_original: string;
  tamano_bytes: number;
  creado_en: string;
}

@Injectable({ providedIn: "root" })
export class RecursosService {
  listarRecursos(busqueda: string): Promise<RecursoResumen[]> {
    return invoke<RecursoResumen[]>("listar_recursos", { busqueda });
  }

  agregarRecurso(rutaOrigen: string): Promise<RecursoResumen> {
    return invoke<RecursoResumen>("agregar_recurso", { rutaOrigen });
  }

  obtenerRutaRecurso(id: number): Promise<string> {
    return invoke<string>("obtener_ruta_recurso", { id });
  }

  eliminarRecurso(id: number): Promise<void> {
    return invoke<void>("eliminar_recurso", { id });
  }
}
