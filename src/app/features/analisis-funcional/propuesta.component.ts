import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, FormArray, FormGroup, FormControl } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { PropuestaService } from "./propuesta.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

type SesionGroup = FormGroup<{
  descripcion: FormControl<string | null>;
  contenido: FormControl<string | null>;
}>;

type FaseGroup = FormGroup<{
  nombre: FormControl<string | null>;
  sesiones: FormArray<SesionGroup>;
}>;

@Component({
  selector: "app-propuesta",
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, IconComponent],
  templateUrl: "./propuesta.component.html",
})
export class PropuestaComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly propuestaService = inject(PropuestaService);
  private readonly fb = inject(FormBuilder);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    objetivo_general: this.fb.control<string | null>(null),
    objetivos_especificos: this.fb.array<FormControl<string>>([]),
    modalidad: this.fb.control<string | null>(null),
    frecuencia: this.fb.control<string | null>(null),
    duracion_sesion_minutos: this.fb.control<string | null>(null),
    duracion_estimada_tratamiento: this.fb.control<string | null>(null),
    fases: this.fb.array<FaseGroup>([]),
  });

  constructor() {
    this.cargarPropuesta();
  }

  get objetivosEspecificos(): FormArray<FormControl<string>> {
    return this.form.controls.objetivos_especificos;
  }

  get fases(): FormArray<FaseGroup> {
    return this.form.controls.fases;
  }

  sesionesDe(fase: FaseGroup): FormArray<SesionGroup> {
    return fase.controls.sesiones;
  }

  numeroSesion(indiceFase: number, indiceSesion: number): number {
    let contador = 0;
    for (let i = 0; i < indiceFase; i++) {
      contador += this.fases.at(i).controls.sesiones.length;
    }
    return contador + indiceSesion + 1;
  }

  private async cargarPropuesta(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const propuesta = await this.propuestaService.obtenerPropuesta(this.pacienteId);

      this.form.patchValue({
        objetivo_general: propuesta.objetivo_general,
        modalidad: propuesta.modalidad,
        frecuencia: propuesta.frecuencia,
        duracion_sesion_minutos: propuesta.duracion_sesion_minutos,
        duracion_estimada_tratamiento: propuesta.duracion_estimada_tratamiento,
      });

      this.objetivosEspecificos.clear();
      for (const texto of propuesta.objetivos_especificos) {
        this.objetivosEspecificos.push(this.fb.nonNullable.control(texto));
      }

      this.fases.clear();
      for (const fase of propuesta.fases) {
        const faseGroup = this.crearFaseGroup(fase.nombre);
        for (const sesion of fase.sesiones) {
          faseGroup.controls.sesiones.push(this.crearSesionGroup(sesion.descripcion, sesion.contenido));
        }
        this.fases.push(faseGroup);
      }
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar la propuesta");
    } finally {
      this.cargando.set(false);
    }
  }

  private crearFaseGroup(nombre: string | null = null): FaseGroup {
    return this.fb.nonNullable.group({
      nombre: this.fb.control<string | null>(nombre),
      sesiones: this.fb.array<SesionGroup>([]),
    });
  }

  private crearSesionGroup(descripcion: string | null = null, contenido: string | null = null): SesionGroup {
    return this.fb.nonNullable.group({
      descripcion: this.fb.control<string | null>(descripcion),
      contenido: this.fb.control<string | null>(contenido),
    });
  }

  agregarObjetivo(): void {
    this.objetivosEspecificos.push(this.fb.nonNullable.control(""));
  }

  quitarObjetivo(indice: number): void {
    this.objetivosEspecificos.removeAt(indice);
  }

  agregarFase(): void {
    this.fases.push(this.crearFaseGroup());
  }

  quitarFase(indice: number): void {
    this.fases.removeAt(indice);
  }

  agregarSesion(fase: FaseGroup): void {
    fase.controls.sesiones.push(this.crearSesionGroup());
  }

  quitarSesion(fase: FaseGroup, indice: number): void {
    fase.controls.sesiones.removeAt(indice);
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const valores = this.form.getRawValue();
      await this.propuestaService.guardarPropuesta(this.pacienteId, {
        objetivo_general: valores.objetivo_general,
        objetivos_especificos: valores.objetivos_especificos.filter((texto) => texto.trim().length > 0),
        modalidad: valores.modalidad,
        frecuencia: valores.frecuencia,
        duracion_sesion_minutos: valores.duracion_sesion_minutos,
        duracion_estimada_tratamiento: valores.duracion_estimada_tratamiento,
        fases: valores.fases.map((fase) => ({
          nombre: fase.nombre,
          sesiones: fase.sesiones.map((sesion) => ({
            descripcion: sesion.descripcion,
            contenido: sesion.contenido,
          })),
        })),
      });
      await this.router.navigate(["/pacientes", this.pacienteId, "analisis-funcional"]);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar la propuesta");
    } finally {
      this.guardando.set(false);
    }
  }
}
