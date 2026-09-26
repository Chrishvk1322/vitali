import { Component, input } from "@angular/core";

export type IconName =
  | "pacientes"
  | "agenda"
  | "tests"
  | "plantillas"
  | "plus"
  | "search"
  | "arrow-left"
  | "close"
  | "check"
  | "logout"
  | "phone"
  | "calendar-days"
  | "edit"
  | "trash"
  | "alert-triangle"
  | "paperclip"
  | "settings"
  | "mic";

@Component({
  selector: "app-icon",
  standalone: true,
  host: { class: "inline-flex shrink-0" },
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="w-full h-full"
    >
      @switch (name()) {
        @case ("pacientes") {
          <path
            d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 19v-1a3.5 3.5 0 0 0-2.5-3.36M15 4.16a3 3 0 0 1 0 5.68"
          />
        }
        @case ("agenda") {
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" />
        }
        @case ("tests") {
          <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
          <path d="M8 6H6.5A1.5 1.5 0 0 0 5 7.5v12A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17.5 6H16" />
          <path d="m9 13 2 2 4-4" />
        }
        @case ("plantillas") {
          <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
          <path d="M14 3.5V8h4.5M9 12.5h6M9 16h6" />
        }
        @case ("plus") {
          <path d="M12 5v14M5 12h14" />
        }
        @case ("search") {
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m20 20-4.35-4.35" />
        }
        @case ("arrow-left") {
          <path d="M19 12H5M11 6l-6 6 6 6" />
        }
        @case ("close") {
          <path d="M18 6 6 18M6 6l12 12" />
        }
        @case ("check") {
          <path d="m5 13 4 4L19 7" />
        }
        @case ("logout") {
          <path d="M15 17v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M9 12h11m0 0-3-3m3 3-3 3" />
        }
        @case ("phone") {
          <path
            d="M6.5 3.5h2.2l1.3 4-1.9 1.4a11 11 0 0 0 5 5l1.4-1.9 4 1.3v2.2a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 5.1a1.5 1.5 0 0 1 1.5-1.6Z"
          />
        }
        @case ("calendar-days") {
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
        }
        @case ("edit") {
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        }
        @case ("trash") {
          <path d="M4 7h16M9.5 7V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4A1.3 1.3 0 0 1 14.5 4.8V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
        }
        @case ("alert-triangle") {
          <path d="M10.3 4 2.9 17a1.5 1.5 0 0 0 1.3 2.3h15.6a1.5 1.5 0 0 0 1.3-2.3L13.7 4a1.5 1.5 0 0 0-2.6 0Z" />
          <path d="M12 10v4M12 17h.01" />
        }
        @case ("paperclip") {
          <path
            d="M17.5 8.5 9.9 16.1a3 3 0 0 1-4.24-4.24l8.2-8.2a2 2 0 0 1 2.83 2.83l-7.9 7.9a1 1 0 0 1-1.42-1.41l7.09-7.09"
          />
        }
        @case ("settings") {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
          />
        }
        @case ("mic") {
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
        }
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
