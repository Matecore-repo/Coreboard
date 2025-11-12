import { toast, type ExternalToast } from "sonner";

/**
 * Muestra un toast de éxito con color verde suave
 * @param message - Mensaje a mostrar
 * @param duration - Duración en milisegundos (por defecto 4000)
 */
export function toastSuccess(message: string, duration: number = 4000) {
  return toast.success(message, {
    duration,
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
  });
}

export function toastLoading(message: string) {
  return toast.loading(message);
}

export function toastDismiss(toastId?: number | string) {
  return toast.dismiss(toastId);
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
  options?: ExternalToast,
) {
  return toast.promise(promise, messages, options);
}

