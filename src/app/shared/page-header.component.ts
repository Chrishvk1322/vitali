import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { IconComponent } from "./icon.component";

@Component({
  selector: "app-page-header",
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <header class="bg-clinico-secundario shadow-sm px-8 py-5 flex items-center justify-between">
      <div>
        @if (backLink()) {
          <a
            [routerLink]="backLink()"
            class="inline-flex items-center gap-1.5 rounded-full bg-clinico-fondo
              pl-2.5 pr-3.5 py-1.5 text-sm font-medium text-clinico-secundario-oscuro mb-2
              transition-colors duration-150 hover:bg-white"
          >
            <app-icon name="arrow-left" class="w-4 h-4" />
            Volver
          </a>
        }
        <h1 class="text-xl font-semibold text-white">{{ title() }}</h1>
      </div>
      <div class="flex items-center gap-5">
        <ng-content select="[actions]" />
        <span class="font-display font-semibold text-lg text-white">Vitali</span>
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly backLink = input<string | null>(null);
}
