import { toast } from "sonner";

/**
 * Muestra un toast de éxito con color verde suave
 * @param message - Mensaje a mostrar
 * @param duration - Duración en milisegundos (por defecto 4000)
 */
export function toastSuccess(message: string, duration: number = 4000) {
  return toast.success(message, {
    duration,
    className: "toast-success",
    style: {
      background: "var(--toast-success-bg)",
      color: "var(--toast-success-text)",
      border: "1px solid var(--toast-success-border)",
    },
  });
}

/**
 * Muestra un toast de error con color rojo suave
 * @param message - Mensaje a mostrar
 * @param duration - Duración en milisegundos (por defecto 4000)
 */
export function toastError(message: string, duration: number = 4000) {
  return toast.error(message, {
    duration,
    className: "toast-error",
    style: {
      background: "var(--toast-error-bg)",
      color: "var(--toast-error-text)",
      border: "1px solid var(--toast-error-border)",
    },
  });
}

/**
 * Muestra un toast de advertencia con color amarillo suave
 * @param message - Mensaje a mostrar
 * @param duration - Duración en milisegundos (por defecto 4000)
 */
export function toastWarning(message: string, duration: number = 4000) {
  return toast.warning(message, {
    duration,
    className: "toast-warning",
    style: {
      background: "var(--toast-warning-bg)",
      color: "var(--toast-warning-text)",
      border: "1px solid var(--toast-warning-border)",
    },
  });
}

/**
 * Muestra un toast de información
 * @param message - Mensaje a mostrar
 * @param duration - Duración en milisegundos (por defecto 4000)
 */
export function toastInfo(message: string, duration: number = 4000) {
  return toast.info(message, {
    duration,
    className: "toast-info",
  });
}

