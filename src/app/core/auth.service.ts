import { Injectable, signal } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";

export interface UsuarioSesion {
  id: number;
  username: string;
  nombres: string;
  rol: string;
}

const SESSION_KEY = "vitali.sesion";

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly usuario = signal<UsuarioSesion | null>(this.leerSesionGuardada());

  async login(username: string, password: string): Promise<void> {
    const usuario = await invoke<UsuarioSesion>("login", { username, password });
    this.usuario.set(usuario);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
  }

  logout(): void {
    this.usuario.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  estaAutenticado(): boolean {
    return this.usuario() !== null;
  }

  private leerSesionGuardada(): UsuarioSesion | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }
}
