import { Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { PacientesService, SesionResumen } from "./pacientes.service";
import { AdjuntosService, AdjuntoResumen } from "./adjuntos.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

@Component({
  selector: "app-sesiones-paciente",
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, IconComponent],
  templateUrl: "./sesiones-paciente.component.html",
})
export class SesionesPacienteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly pacientesService = inject(PacientesService);
  private readonly adjuntosService = inject(AdjuntosService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly sesiones = signal<SesionResumen[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalSesionAbierto = signal(false);
  readonly guardandoSesion = signal(false);
  readonly sesionEditId = signal<number | null>(null);

  readonly modalEliminarSesionAbierto = signal(false);
  readonly sesionAEliminar = signal<number | null>(null);
  readonly eliminandoSesion = signal(false);
  readonly errorEliminarSesion = signal<string | null>(null);

  readonly adjuntosPorSesion = signal<Record<number, AdjuntoResumen[]>>({});
  readonly subiendoAdjuntoSesionId = signal<number | null>(null);
  readonly errorAdjunto = signal<string | null>(null);

  readonly adjuntoVista = signal<{
    nombre: string;
    tipo: "imagen" | "pdf";
    url: string;
    urlSegura: SafeResourceUrl;
  } | null>(null);

  readonly formSesion = this.fb.nonNullable.group({
    fecha: ["", Validators.required],
    resumen_tratado: this.fb.control<string | null>(null),
    observaciones: this.fb.control<string | null>(null),
    tareas: this.fb.control<string | null>(null),
  });

  constructor() {
    this.cargarSesiones();
  }

  private async cargarSesiones(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const sesiones = await this.pacientesService.listarSesiones(this.pacienteId);
      this.sesiones.set(sesiones);
      await this.cargarAdjuntosDeSesiones(sesiones.map((s) => s.id));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudieron cargar las sesiones");
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarAdjuntosDeSesiones(sesionIds: number[]): Promise<void> {
    const entradas = await Promise.all(
      sesionIds.map(async (id) => [id, await this.adjuntosService.listarAdjuntosSesion(id)] as const),
    );
    this.adjuntosPorSesion.set(Object.fromEntries(entradas));
  }

  adjuntosDe(sesionId: number): AdjuntoResumen[] {
    return this.adjuntosPorSesion()[sesionId] ?? [];
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async adjuntarArchivo(sesionId: number): Promise<void> {
    if (this.subiendoAdjuntoSesionId() !== null) return;
    this.errorAdjunto.set(null);
    try {
      const ruta = await open({
        multiple: false,
        filters: [{ name: "PDF e imágenes", extensions: ["pdf", "jpg", "jpeg", "png"] }],
      });
      if (!ruta || Array.isArray(ruta)) return;

      this.subiendoAdjuntoSesionId.set(sesionId);
      await this.adjuntosService.agregarAdjuntoSesion(sesionId, ruta);
      const adjuntos = await this.adjuntosService.listarAdjuntosSesion(sesionId);
      this.adjuntosPorSesion.update((mapa) => ({ ...mapa, [sesionId]: adjuntos }));
    } catch (err) {
      this.errorAdjunto.set(typeof err === "string" ? err : "no se pudo adjuntar el archivo");
    } finally {
      this.subiendoAdjuntoSesionId.set(null);
    }
  }

  async abrirAdjunto(adjunto: AdjuntoResumen): Promise<void> {
    this.errorAdjunto.set(null);
    try {
      const ruta = await this.adjuntosService.obtenerRutaAdjunto(adjunto.id);
      const esImagen = /\.(jpg|jpeg|png)$/i.test(adjunto.nombre_original);
      const url = convertFileSrc(ruta);
      // <img> acepta la URL como texto; solo <iframe> exige un SafeResourceUrl.
      this.adjuntoVista.set({
        nombre: adjunto.nombre_original,
        tipo: esImagen ? "imagen" : "pdf",
        url,
        urlSegura: this.sanitizer.bypassSecurityTrustResourceUrl(url),
      });
    } catch (err) {
      this.errorAdjunto.set(typeof err === "string" ? err : "no se pudo abrir el archivo");
    }
  }

  cerrarAdjuntoVista(): void {
    this.adjuntoVista.set(null);
  }

  async eliminarAdjunto(id: number, sesionId: number): Promise<void> {
    this.errorAdjunto.set(null);
    try {
      await this.adjuntosService.eliminarAdjunto(id);
      const adjuntos = await this.adjuntosService.listarAdjuntosSesion(sesionId);
      this.adjuntosPorSesion.update((mapa) => ({ ...mapa, [sesionId]: adjuntos }));
    } catch (err) {
      this.errorAdjunto.set(typeof err === "string" ? err : "no se pudo eliminar el adjunto");
    }
  }

  tareasComoLista(tareas: string | null): string[] {
    if (!tareas) return [];
    return tareas
      .split("\n")
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0);
  }

  abrirModalSesion(sesion?: SesionResumen): void {
    if (sesion) {
      this.sesionEditId.set(sesion.id);
      this.formSesion.setValue({
        fecha: sesion.fecha_hora.slice(0, 10),
        resumen_tratado: sesion.resumen_tratado,
        observaciones: sesion.observaciones,
        tareas: sesion.tareas,
      });
    } else {
      this.sesionEditId.set(null);
      this.formSesion.reset({ fecha: this.fechaActual() });
    }
    this.modalSesionAbierto.set(true);
  }

  cerrarModalSesion(): void {
    this.modalSesionAbierto.set(false);
  }

  private fechaActual(): string {
    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
  }

  async guardarSesion(): Promise<void> {
    if (this.formSesion.invalid || this.guardandoSesion()) return;
    this.guardandoSesion.set(true);
    try {
      const editId = this.sesionEditId();
      const { fecha, resumen_tratado, observaciones, tareas } = this.formSesion.getRawValue();
      if (editId !== null) {
        await this.pacientesService.actualizarSesion(editId, {
          fecha_hora: fecha,
          resumen_tratado,
          observaciones,
          tareas,
        });
      } else {
        await this.pacientesService.crearSesion({
          paciente_id: this.pacienteId,
          fecha_hora: fecha,
          resumen_tratado,
          observaciones,
          tareas,
        });
      }
      this.modalSesionAbierto.set(false);
      this.sesiones.set(await this.pacientesService.listarSesiones(this.pacienteId));
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo guardar la sesión");
    } finally {
      this.guardandoSesion.set(false);
    }
  }

  abrirModalEliminarSesion(id: number): void {
    this.errorEliminarSesion.set(null);
    this.sesionAEliminar.set(id);
    this.modalEliminarSesionAbierto.set(true);
  }

  cerrarModalEliminarSesion(): void {
    this.modalEliminarSesionAbierto.set(false);
  }

  async confirmarEliminarSesion(): Promise<void> {
    const id = this.sesionAEliminar();
    if (id === null || this.eliminandoSesion()) return;
    this.eliminandoSesion.set(true);
    this.errorEliminarSesion.set(null);
    try {
      await this.pacientesService.eliminarSesion(id);
      this.modalEliminarSesionAbierto.set(false);
      this.sesiones.set(await this.pacientesService.listarSesiones(this.pacienteId));
    } catch (err) {
      this.errorEliminarSesion.set(typeof err === "string" ? err : "no se pudo eliminar la sesión");
    } finally {
      this.eliminandoSesion.set(false);
    }
  }
}
