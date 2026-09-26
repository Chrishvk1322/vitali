import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { AnalisisFuncionalService } from "./analisis-funcional.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-problema-detalle",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, IconComponent],
  templateUrl: "./problema-detalle.component.html",
})
export class ProblemaDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analisisFuncionalService = inject(AnalisisFuncionalService);
  private readonly fb = inject(FormBuilder);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));
  readonly problemaId = Number(this.route.snapshot.paramMap.get("problemaId"));

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly editandoNombre = signal(false);

  readonly modalEliminarAbierto = signal(false);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ["", Validators.required],
    ant_situacionales: this.fb.control<string | null>(null),
    ant_fisiologicos: this.fb.control<string | null>(null),
    ant_cognitivos: this.fb.control<string | null>(null),
    conducta_fisiologicos: this.fb.control<string | null>(null),
    conducta_cognitivos: this.fb.control<string | null>(null),
    conducta_motoras: this.fb.control<string | null>(null),
    conducta_medicion: this.fb.control<string | null>(null),
    consec_situacionales: this.fb.control<string | null>(null),
    consec_fisiologicos: this.fb.control<string | null>(null),
    consec_cognitivos: this.fb.control<string | null>(null),
    diag_exceso: this.fb.control<string | null>(null),
    diag_debilitamiento: this.fb.control<string | null>(null),
    diag_deficit: this.fb.control<string | null>(null),
  });

  constructor() {
    this.cargarProblema();
  }

  private async cargarProblema(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const problema = await this.analisisFuncionalService.obtenerProblema(this.problemaId);
      this.form.setValue({
        nombre: problema.nombre,
        ant_situacionales: problema.ant_situacionales,
        ant_fisiologicos: problema.ant_fisiologicos,
        ant_cognitivos: problema.ant_cognitivos,
        conducta_fisiologicos: problema.conducta_fisiologicos,
        conducta_cognitivos: problema.conducta_cognitivos,
        conducta_motoras: problema.conducta_motoras,
        conducta_medicion: problema.conducta_medicion,
        consec_situacionales: problema.consec_situacionales,
        consec_fisiologicos: problema.consec_fisiologicos,
        consec_cognitivos: problema.consec_cognitivos,
        diag_exceso: problema.diag_exceso,
        diag_debilitamiento: problema.diag_debilitamiento,
        diag_deficit: problema.diag_deficit,
      });
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el problema");
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.analisisFuncionalService.actualizarProblema(this.problemaId, this.form.getRawValue());
      this.editandoNombre.set(false);
      await this.router.navigate(["/pacientes", this.pacienteId, "analisis-funcional"]);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar el problema");
    } finally {
      this.guardando.set(false);
    }
  }

  habilitarEdicionNombre(): void {
    this.editandoNombre.set(true);
  }

  abrirModalEliminar(): void {
    this.errorEliminar.set(null);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    if (this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.analisisFuncionalService.eliminarProblema(this.problemaId);
      await this.router.navigate(["/pacientes", this.pacienteId, "analisis-funcional"]);
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar el problema");
    } finally {
      this.eliminando.set(false);
    }
  }
}
