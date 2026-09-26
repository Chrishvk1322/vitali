import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { RecursosService, RecursoResumen } from "./recursos.service";
import { PageHeaderComponent } from "../../shared/page-header.component";
import { IconComponent } from "../../shared/icon.component";

const POR_PAGINA = 10;

@Component({
  selector: "app-recursos",
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, IconComponent],
  templateUrl: "./recursos.component.html",
})
export class RecursosComponent {
  private readonly recursosService = inject(RecursosService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly busqueda = signal("");
  readonly recursos = signal<RecursoResumen[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly subiendo = signal(false);

  readonly paginaActual = signal(1);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.recursos().length / POR_PAGINA)));
  readonly paginas = computed(() => Array.from({ length: this.totalPaginas() }, (_, i) => i + 1));
  readonly recursosPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.recursos().slice(inicio, inicio + POR_PAGINA);
  });

  readonly vistaPrevia = signal<{ nombre: string; src: SafeResourceUrl } | null>(null);

  readonly modalEliminarAbierto = signal(false);
  readonly recursoAEliminar = signal<number | null>(null);
  readonly eliminando = signal(false);
  readonly errorEliminar = signal<string | null>(null);

  constructor() {
    this.buscar();
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.paginaActual.set(1);
    this.buscar();
  }

  private async buscar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.recursos.set(await this.recursosService.listarRecursos(this.busqueda()));
      this.paginaActual.set(1);
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo cargar el listado de recursos");
    } finally {
      this.cargando.set(false);
    }
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async agregarRecurso(): Promise<void> {
    if (this.subiendo()) return;
    this.error.set(null);
    try {
      const ruta = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!ruta || Array.isArray(ruta)) return;

      this.subiendo.set(true);
      await this.recursosService.agregarRecurso(ruta);
      await this.buscar();
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo agregar el recurso");
    } finally {
      this.subiendo.set(false);
    }
  }

  async abrirVistaPrevia(recurso: RecursoResumen): Promise<void> {
    this.error.set(null);
    try {
      const ruta = await this.recursosService.obtenerRutaRecurso(recurso.id);
      const src = this.sanitizer.bypassSecurityTrustResourceUrl(convertFileSrc(ruta));
      this.vistaPrevia.set({ nombre: recurso.nombre_original, src });
    } catch (err) {
      this.error.set(typeof err === "string" ? err : "no se pudo abrir el archivo");
    }
  }

  cerrarVistaPrevia(): void {
    this.vistaPrevia.set(null);
  }

  abrirModalEliminar(id: number): void {
    this.errorEliminar.set(null);
    this.recursoAEliminar.set(id);
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto.set(false);
  }

  async confirmarEliminar(): Promise<void> {
    const id = this.recursoAEliminar();
    if (id === null || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorEliminar.set(null);
    try {
      await this.recursosService.eliminarRecurso(id);
      this.modalEliminarAbierto.set(false);
      await this.buscar();
    } catch (err) {
      this.errorEliminar.set(typeof err === "string" ? err : "no se pudo eliminar el recurso");
    } finally {
      this.eliminando.set(false);
    }
  }
}
