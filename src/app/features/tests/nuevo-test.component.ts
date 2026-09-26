import { Component, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { TestsService } from "./tests.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-nuevo-test",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./nuevo-test.component.html",
})
export class NuevoTestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly testsService = inject(TestsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly idParam = this.route.snapshot.paramMap.get("id");
  readonly testId = this.idParam ? Number(this.idParam) : null;
  readonly modoEdicion = this.testId !== null;

  readonly titulo = computed(() => (this.modoEdicion ? "Editar Test" : "Nuevo Test"));

  readonly cargando = signal(this.modoEdicion);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ["", Validators.required],
    descripcion: this.fb.control<string | null>(null),
    preguntas: this.fb.array<ReturnType<typeof this.crearPregunta>>([]),
    rangos: this.fb.array<ReturnType<typeof this.crearRango>>([]),
  });

  get preguntas(): FormArray {
    return this.form.controls.preguntas;
  }

  get rangos(): FormArray {
    return this.form.controls.rangos;
  }

  constructor() {
    if (this.modoEdicion && this.testId !== null) {
      this.cargarTest(this.testId);
    } else {
      this.agregarPregunta();
      this.agregarRango();
    }
  }

  private crearPregunta(texto = "") {
    return this.fb.nonNullable.group({
      texto: [texto, Validators.required],
    });
  }

  private crearRango(puntaje_min: number | null = null, puntaje_max: number | null = null, etiqueta = "") {
    return this.fb.nonNullable.group({
      puntaje_min: [puntaje_min, Validators.required],
      puntaje_max: [puntaje_max, Validators.required],
      etiqueta: [etiqueta, Validators.required],
    });
  }

  agregarPregunta(): void {
    this.preguntas.push(this.crearPregunta());
  }

  quitarPregunta(indice: number): void {
    if (this.preguntas.length > 1) {
      this.preguntas.removeAt(indice);
    }
  }

  agregarRango(): void {
    this.rangos.push(this.crearRango());
  }

  quitarRango(indice: number): void {
    if (this.rangos.length > 1) {
      this.rangos.removeAt(indice);
    }
  }

  private async cargarTest(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const test = await this.testsService.obtenerTest(id);
      this.form.patchValue({ nombre: test.nombre, descripcion: test.descripcion });
      test.preguntas.forEach((p) => this.preguntas.push(this.crearPregunta(p.texto)));
      test.rangos.forEach((r) =>
        this.rangos.push(this.crearRango(r.puntaje_min, r.puntaje_max, r.etiqueta)),
      );
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
      const raw = this.form.getRawValue();
      const payload = {
        nombre: raw.nombre,
        descripcion: raw.descripcion,
        preguntas: raw.preguntas.map((p) => p.texto),
        rangos: raw.rangos.map((r) => ({
          puntaje_min: r.puntaje_min as number,
          puntaje_max: r.puntaje_max as number,
          etiqueta: r.etiqueta,
        })),
      };

      if (this.modoEdicion && this.testId !== null) {
        await this.testsService.actualizarTest(this.testId, payload);
      } else {
        await this.testsService.crearTest(payload);
      }
      await this.router.navigateByUrl("/tests");
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar el test");
    } finally {
      this.guardando.set(false);
    }
  }
}
