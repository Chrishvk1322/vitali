import { Injectable } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface CredencialesGoogleInput {
  client_id: string;
  client_secret: string;
}

export interface EstadoGoogleCalendar {
  configurado: boolean;
  conectado: boolean;
  cuenta_email: string | null;
  client_id: string | null;
}

@Injectable({ providedIn: "root" })
export class GoogleCalendarService {
  guardarCredenciales(credenciales: CredencialesGoogleInput): Promise<void> {
    return invoke<void>("guardar_credenciales_google", { credenciales });
  }

  obtenerEstado(): Promise<EstadoGoogleCalendar> {
    return invoke<EstadoGoogleCalendar>("obtener_estado_google_calendar");
  }

  conectar(): Promise<string> {
    return invoke<string>("conectar_google_calendar");
  }

  desconectar(): Promise<void> {
    return invoke<void>("desconectar_google_calendar");
  }
}
