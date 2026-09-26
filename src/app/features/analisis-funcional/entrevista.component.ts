import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { EntrevistaService } from "./entrevista.service";
import { SECCIONES_ENTREVISTA } from "./entrevista-preguntas";
import { PageHeaderComponent } from "../../shared/page-header.component";

@Component({
  selector: "app-entrevista",
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent],
  templateUrl: "./entrevista.component.html",
})
export class EntrevistaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly entrevistaService = inject(EntrevistaService);
  private readonly fb = inject(FormBuilder);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));
  readonly secciones = SECCIONES_ENTREVISTA;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly guardado = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    Object.fromEntries(
      this.secciones.flatMap((seccion) => seccion.preguntas.map((p) => [p.codigo, this.fb.control<string | null>(null)])),
    ),
  );

  constructor() {
    this.cargarEntrevista();
  }

  private async cargarEntrevista(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const respuestas = await this.entrevistaService.obtenerEntrevista(this.pacienteId);
      const valores: Record<string, string | null> = {};
      for (const r of respuestas) {
        valores[r.pregunta_codigo] = r.respuesta;
      }
      this.form.patchValue(valores);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar la entrevista");
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.guardado.set(false);
    this.error.set(null);
    try {
      const valores = this.form.getRawValue();
      const respuestas = Object.entries(valores).map(([pregunta_codigo, respuesta]) => ({
        pregunta_codigo,
        respuesta,
      }));
      await this.entrevistaService.guardarEntrevista(this.pacienteId, respuestas);
      this.guardado.set(true);
      await this.router.navigate(["/pacientes", this.pacienteId, "analisis-funcional"]);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar la entrevista");
    } finally {
      this.guardando.set(false);
    }
  }
}
