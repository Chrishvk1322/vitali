import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface ProblemaInput {
  paciente_id: number;
  nombre: string;
}

export interface ProblemaActualizarInput {
  nombre: string;
  ant_situacionales: string | null;
  ant_fisiologicos: string | null;
  ant_cognitivos: string | null;
  conducta_fisiologicos: string | null;
  conducta_cognitivos: string | null;
  conducta_motoras: string | null;
  conducta_medicion: string | null;
  consec_situacionales: string | null;
  consec_fisiologicos: string | null;
  consec_cognitivos: string | null;
  diag_exceso: string | null;
  diag_debilitamiento: string | null;
  diag_deficit: string | null;
}

export interface ProblemaResumen {
  id: number;
  nombre: string;
}

export interface ProblemaDetalle extends ProblemaActualizarInput {
  id: number;
  paciente_id: number;
}

@Injectable({ providedIn: "root" })
export class AnalisisFuncionalService {
  crearProblema(problema: ProblemaInput): Promise<number> {
    return invoke<number>("crear_problema", { problema });
  }

  listarProblemas(pacienteId: number): Promise<ProblemaResumen[]> {
    return invoke<ProblemaResumen[]>("listar_problemas", { pacienteId });
  }

  obtenerProblema(id: number): Promise<ProblemaDetalle> {
    return invoke<ProblemaDetalle>("obtener_problema", { id });
  }

  actualizarProblema(id: number, problema: ProblemaActualizarInput): Promise<void> {
    return invoke<void>("actualizar_problema", { id, problema });
  }

  eliminarProblema(id: number): Promise<void> {
    return invoke<void>("eliminar_problema", { id });
  }

  obtenerNotaSesionConsulta(pacienteId: number): Promise<string | null> {
    return invoke<string | null>("obtener_nota_sesion_consulta", { pacienteId });
  }

  guardarNotaSesionConsulta(pacienteId: number, nota: string | null): Promise<void> {
    return invoke<void>("guardar_nota_sesion_consulta", { pacienteId, nota });
  }
}
