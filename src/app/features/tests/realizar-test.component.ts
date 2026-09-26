import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { TestsService, TestDetalle } from "./tests.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

interface ResultadoObtenido {
  puntaje_total: number;
  diagnostico: string | null;
}

@Component({
  selector: "app-realizar-test",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./realizar-test.component.html",
})
export class RealizarTestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly testsService = inject(TestsService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));
  readonly testId = Number(this.route.snapshot.paramMap.get("testId"));

  readonly opciones = [
    { valor: 0, etiqueta: "Nunca" },
    { valor: 1, etiqueta: "Rara vez" },
    { valor: 2, etiqueta: "A veces" },
    { valor: 3, etiqueta: "Frecuentemente" },
    { valor: 4, etiqueta: "Siempre" },
  ];

  readonly test = signal<TestDetalle | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultado = signal<ResultadoObtenido | null>(null);

  readonly form = this.fb.group({
    respuestas: this.fb.array<ReturnType<typeof this.crearControl>>([]),
  });

  get respuestas(): FormArray {
    return this.form.controls.respuestas;
  }

  constructor() {
    this.cargarTest();
  }

  private crearControl() {
    return this.fb.control<number | null>(null, Validators.required);
  }

  private async cargarTest(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const test = await this.testsService.obtenerTest(this.testId);
      this.test.set(test);
      test.preguntas.forEach(() => this.respuestas.push(this.crearControl()));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el test");
    } finally {
      this.cargando.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);

    try {
      const respuestas = this.respuestas.getRawValue() as number[];
      const resultadoId = await this.testsService.registrarResultado({
        paciente_id: this.pacienteId,
        test_id: this.testId,
        respuestas,
      });
      const detalle = await this.testsService.obtenerResultado(resultadoId);
      this.resultado.set({ puntaje_total: detalle.puntaje_total, diagnostico: detalle.diagnostico });
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo registrar la evaluación");
    } finally {
      this.guardando.set(false);
    }
  }
}
