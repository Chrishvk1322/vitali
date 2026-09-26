import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface RangoInput {
  puntaje_min: number;
  puntaje_max: number;
  etiqueta: string;
}

export interface TestInput {
  nombre: string;
  descripcion: string | null;
  preguntas: string[];
  rangos: RangoInput[];
}

export interface TestResumen {
  id: number;
  nombre: string;
  descripcion: string | null;
  cantidad_preguntas: number;
}

export interface PreguntaDetalle {
  id: number;
  texto: string;
}

export interface RangoDetalle {
  id: number;
  puntaje_min: number;
  puntaje_max: number;
  etiqueta: string;
}

export interface TestDetalle {
  id: number;
  nombre: string;
  descripcion: string | null;
  preguntas: PreguntaDetalle[];
  rangos: RangoDetalle[];
}

export interface ResultadoInput {
  paciente_id: number;
  test_id: number;
  respuestas: number[];
}

export interface ResultadoResumen {
  id: number;
  test_nombre: string;
  fecha_hora: string;
  puntaje_total: number;
  diagnostico: string | null;
}

export interface RespuestaDetalle {
  pregunta_texto: string;
  valor: number;
}

export interface ResultadoDetalle {
  id: number;
  test_nombre: string;
  fecha_hora: string;
  puntaje_total: number;
  diagnostico: string | null;
  respuestas: RespuestaDetalle[];
}

@Injectable({ providedIn: "root" })
export class TestsService {
  crearTest(test: TestInput): Promise<number> {
    return invoke<number>("crear_test", { test });
  }

  listarTests(): Promise<TestResumen[]> {
    return invoke<TestResumen[]>("listar_tests");
  }

  obtenerTest(id: number): Promise<TestDetalle> {
    return invoke<TestDetalle>("obtener_test", { id });
  }

  actualizarTest(id: number, test: TestInput): Promise<void> {
    return invoke<void>("actualizar_test", { id, test });
  }

  eliminarTest(id: number): Promise<void> {
    return invoke<void>("eliminar_test", { id });
  }

  registrarResultado(resultado: ResultadoInput): Promise<number> {
    return invoke<number>("registrar_resultado", { resultado });
  }

  listarResultadosPaciente(pacienteId: number): Promise<ResultadoResumen[]> {
    return invoke<ResultadoResumen[]>("listar_resultados_paciente", { pacienteId });
  }

  obtenerResultado(id: number): Promise<ResultadoDetalle> {
    return invoke<ResultadoDetalle>("obtener_resultado", { id });
  }

  eliminarResultado(id: number): Promise<void> {
    return invoke<void>("eliminar_resultado", { id });
  }
}
