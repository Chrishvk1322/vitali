import { Component } from "@angular/core";
import { PageHeaderComponent } from "../../shared/page-header.component";

@Component({
  selector: "app-plantillas",
  standalone: true,
  imports: [PageHeaderComponent],
  template: `<div class="min-h-screen bg-clinico-fondo">
    <app-page-header title="Plantillas" backLink="/hub" />
    <main class="flex items-center justify-center py-20">
      <p class="text-clinico-texto/60">Módulo de Plantillas — pendiente (Fase 5)</p>
    </main>
  </div>`,
})
export class PlantillasComponent {}
