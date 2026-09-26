import { Routes } from "@angular/router";
import { authGuard } from "./core/auth.guard";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "login" },
  {
    path: "login",
    loadComponent: () =>
      import("./features/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "hub",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/hub/hub.component").then((m) => m.HubComponent),
  },
  { path: "pacientes", pathMatch: "full", redirectTo: "pacientes/listado" },
  {
    path: "pacientes/nuevo",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/nuevo-paciente.component").then((m) => m.NuevoPacienteComponent),
  },
  {
    path: "pacientes/listado",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/listado-pacientes.component").then((m) => m.ListadoPacientesComponent),
  },
  {
    path: "pacientes/:id/editar",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/nuevo-paciente.component").then((m) => m.NuevoPacienteComponent),
  },
  {
    path: "pacientes/:id/evaluar",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tests/seleccionar-test.component").then((m) => m.SeleccionarTestComponent),
  },
  {
    path: "pacientes/:id/evaluar/:testId",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tests/realizar-test.component").then((m) => m.RealizarTestComponent),
  },
  {
    path: "pacientes/:id/analisis-funcional",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analisis-funcional/listado-problemas.component").then(
        (m) => m.ListadoProblemasComponent,
      ),
  },
  {
    path: "pacientes/:id/sesiones",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/sesiones-paciente.component").then((m) => m.SesionesPacienteComponent),
  },
  {
    path: "pacientes/:id/citas",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/citas-paciente.component").then((m) => m.CitasPacienteComponent),
  },
  {
    path: "pacientes/:id/evaluaciones",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/evaluaciones-paciente.component").then(
        (m) => m.EvaluacionesPacienteComponent,
      ),
  },
  {
    path: "pacientes/:id/grabaciones",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/grabaciones/listado-grabaciones.component").then(
        (m) => m.ListadoGrabacionesComponent,
      ),
  },
  {
    path: "pacientes/:id/entrevista",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analisis-funcional/entrevista.component").then((m) => m.EntrevistaComponent),
  },
  {
    path: "pacientes/:id/propuesta",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analisis-funcional/propuesta.component").then((m) => m.PropuestaComponent),
  },
  {
    path: "pacientes/:id/analisis-funcional/:problemaId",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/analisis-funcional/problema-detalle.component").then(
        (m) => m.ProblemaDetalleComponent,
      ),
  },
  {
    path: "pacientes/:id",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/pacientes/detalle-paciente.component").then((m) => m.DetallePacienteComponent),
  },
  {
    path: "agenda",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/agenda/agenda.component").then((m) => m.AgendaComponent),
  },
  {
    path: "tests",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tests/tests.component").then((m) => m.TestsComponent),
  },
  {
    path: "tests/nuevo",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tests/nuevo-test.component").then((m) => m.NuevoTestComponent),
  },
  {
    path: "tests/:id/editar",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/tests/nuevo-test.component").then((m) => m.NuevoTestComponent),
  },
  {
    path: "recursos",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/recursos/recursos.component").then((m) => m.RecursosComponent),
  },
  {
    path: "plantillas",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./features/plantillas/plantillas.component").then((m) => m.PlantillasComponent),
  },
  { path: "**", redirectTo: "login" },
];
