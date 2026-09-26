import { Component, computed, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PacientesService } from "./pacientes.service";
import { PageHeaderComponent } from "../../shared/page-header.component";

@Component({
  selector: "app-nuevo-paciente",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
  templateUrl: "./nuevo-paciente.component.html",
})
export class NuevoPacienteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pacientesService = inject(PacientesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly idParam = this.route.snapshot.paramMap.get("id");
  readonly pacienteId = this.idParam ? Number(this.idParam) : null;
  readonly modoEdicion = this.pacienteId !== null;

  readonly titulo = computed(() => (this.modoEdicion ? "Editar Paciente" : "Nuevo Paciente"));
  readonly backLink = computed(() =>
    this.modoEdicion ? `/pacientes/${this.pacienteId}` : "/hub",
  );
  readonly cancelarLink = computed(() =>
    this.modoEdicion ? `/pacientes/${this.pacienteId}` : "/pacientes/listado",
  );

  readonly cargando = signal(this.modoEdicion);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly gradosInstruccion = ["Primaria", "Secundaria", "Superior", "Técnico", "Ninguno"];
  readonly estadosCiviles = ["Soltero/a", "Casado/a", "Conviviente", "Divorciado/a", "Viudo/a"];

  readonly form = this.fb.nonNullable.group({
    apellidos_nombres: ["", Validators.required],
    edad: this.fb.control<number | null>(null),
    sexo: this.fb.control<string | null>(null),
    fecha_nacimiento: ["", Validators.required],
    lugar_nacimiento: this.fb.control<string | null>(null),
    grado_instruccion: this.fb.control<string | null>(null),
    ocupacion: this.fb.control<string | null>(null),
    estado_civil: this.fb.control<string | null>(null),
    num_hijos: this.fb.control<number | null>(null),
    num_hermanos: this.fb.control<number | null>(null),
    vive_con: this.fb.control<string | null>(null),
    domicilio: this.fb.control<string | null>(null),
    telefono: this.fb.control<string | null>(null),
    email: this.fb.control<string | null>(null),
    nombre_acompanante: this.fb.control<string | null>(null),
    fecha_consulta: ["", Validators.required],
  });

  constructor() {
    if (this.modoEdicion && this.pacienteId !== null) {
      this.cargarPaciente(this.pacienteId);
    }
  }

  private async cargarPaciente(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const paciente = await this.pacientesService.obtenerPaciente(id);
      this.form.patchValue(paciente);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el paciente");
    } finally {
      this.cargando.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);

    try {
      if (this.modoEdicion && this.pacienteId !== null) {
        await this.pacientesService.actualizarPaciente(this.pacienteId, this.form.getRawValue());
        await this.router.navigateByUrl(`/pacientes/${this.pacienteId}`);
      } else {
        await this.pacientesService.crearPaciente(this.form.getRawValue());
        await this.router.navigateByUrl("/pacientes/listado");
      }
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar el paciente");
    } finally {
      this.guardando.set(false);
    }
  }
}
