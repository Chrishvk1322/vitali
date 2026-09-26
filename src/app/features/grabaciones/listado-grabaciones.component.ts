import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { GrabacionesService, GrabacionResumen } from "./grabaciones.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

interface GrabacionConAudio extends GrabacionResumen {
  src: string;
}

@Component({
  selector: "app-listado-grabaciones",
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, IconComponent],
  templateUrl: "./listado-grabaciones.component.html",
})
export class ListadoGrabacionesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly grabacionesService = inject(GrabacionesService);

  readonly pacienteId = Number(this.route.snapshot.paramMap.get("id"));

  readonly grabaciones = signal<GrabacionConAudio[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly modalNuevaGrabacionAbierto = signal(false);
  readonly nuevoNombre = signal("");
  readonly grabando = signal(false);
  readonly guardandoGrabacion = signal(false);
  readonly segundosTranscurridos = signal(0);
  readonly errorGrabacion = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private temporizador: ReturnType<typeof setInterval> | null = null;

  readonly modalRenombrarAbierto = signal(false);
  readonly grabacionARenombrar = signal<GrabacionResumen | null>(null);
  readonly nombreRenombrar = signal("");
  readonly renombrando = signal(false);
  readonly errorRenombrar = signal<string | null>(null);

  readonly modalEliminarAbierto = signal(false);
  readonly grabacionAEliminar = signal<number | null>(null);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

  constructor() {
    this.cargarGrabaciones();
  }

  private async cargarGrabaciones(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const resumenes = await this.grabacionesService.listarGrabaciones(this.pacienteId);
      const conAudio = await Promise.all(
        resumenes.map(async (g) => ({
          ...g,
          src: convertFileSrc(await this.grabacionesService.obtenerRutaGrabacion(g.id)),
        })),
      );
      this.grabaciones.set(conAudio);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudieron cargar las grabaciones");
    } finally {
      this.cargando.set(false);
    }
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Los WebM de MediaRecorder pueden no traer duración en la cabecera; forzar un seek al final la resuelve. */
  corregirDuracion(evento: Event): void {
    const audio = evento.target as HTMLAudioElement;
    if (audio.duration !== Infinity) return;
    const restaurar = () => {
      audio.removeEventListener("timeupdate", restaurar);
      audio.currentTime = 0;
    };
    audio.addEventListener("timeupdate", restaurar);
    audio.currentTime = 1e101;
  }

  formatearDuracion(segundos: number): string {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}:${seg.toString().padStart(2, "0")}`;
  }

  abrirModalNuevaGrabacion(): void {
    this.nuevoNombre.set("");
    this.errorGrabacion.set(null);
    this.segundosTranscurridos.set(0);
    this.grabando.set(false);
    this.chunks = [];
    this.modalNuevaGrabacionAbierto.set(true);
  }

  cerrarModalNuevaGrabacion(): void {
    if (this.grabando()) {
      this.detenerStream();
    }
    this.modalNuevaGrabacionAbierto.set(false);
  }

  async iniciarGrabacion(): Promise<void> {
    if (!this.nuevoNombre().trim() || this.grabando()) return;
    this.errorGrabacion.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.chunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: "audio/webm;codecs=opus" });
      this.mediaRecorder.ondataavailable = (evento) => {
        if (evento.data.size > 0) this.chunks.push(evento.data);
      };
      this.mediaRecorder.start();
      this.grabando.set(true);
      this.segundosTranscurridos.set(0);
      this.temporizador = setInterval(() => {
        this.segundosTranscurridos.update((s) => s + 1);
      }, 1000);
    } catch (err) {
      this.errorGrabacion.set("no se pudo acceder al micrófono");
    }
  }

  private detenerStream(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.grabando.set(false);
  }

  async detenerYGuardarGrabacion(): Promise<void> {
    if (!this.mediaRecorder || this.guardandoGrabacion()) return;
    const recorder = this.mediaRecorder;

    const blobFinal = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: "audio/webm" }));
      recorder.stop();
    });

    this.detenerStream();
    this.guardandoGrabacion.set(true);
    this.errorGrabacion.set(null);
    try {
      const base64 = await this.blobABase64(blobFinal);
      await this.grabacionesService.crearGrabacion(this.pacienteId, this.nuevoNombre().trim(), base64);
      this.modalNuevaGrabacionAbierto.set(false);
      await this.cargarGrabaciones();
    } catch (err) {
      this.errorGrabacion.set(typeof err === "string" ? err : "no se pudo guardar la grabación");
    } finally {
      this.guardandoGrabacion.set(false);
    }
  }

  private blobABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => {
        const resultado = lector.result as string;
        resolve(resultado.slice(resultado.indexOf(",") + 1));
      };
      lector.onerror = () => reject(lector.error);
      lector.readAsDataURL(blob);
    });
  }

  abrirModalRenombrar(grabacion: GrabacionResumen): void {
    this.grabacionARenombrar.set(grabacion);
    this.nombreRenombrar.set(grabacion.nombre);
    this.errorRenombrar.set(null);
    this.modalRenombrarAbierto.set(true);
  }

  cerrarModalRenombrar(): void {
    this.modalRenombrarAbierto.set(false);
  }

  async confirmarRenombrar(): Promise<void> {
    const grabacion = this.grabacionARenombrar();
    if (!grabacion || !this.nombreRenombrar().trim() || this.renombrando()) return;
    this.renombrando.set(true);
    this.errorRenombrar.set(null);
    try {
      await this.grabacionesService.renombrarGrabacion(grabacion.id, this.nombreRenombrar().trim());
      this.modalRenombrarAbierto.set(false);
      await this.cargarGrabaciones();
    } catch (err) {
      this.errorRenombrar.set(typeof err === "string" ? err : "no se pudo renombrar la grabación");
    } finally {
      this.renombrando.set(false);
    }
  }

  abrirModalEliminar(id: number): void {
    this.errorEliminar.set(null);
    this.grabacionAEliminar.set(id);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    const id = this.grabacionAEliminar();
    if (id === null || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.grabacionesService.eliminarGrabacion(id);
      this.modalEliminarAbierto.set(false);
      await this.cargarGrabaciones();
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar la grabación");
    } finally {
      this.eliminando.set(false);
    }
  }
}
