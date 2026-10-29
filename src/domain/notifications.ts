/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sanitiza el número telefónico para la API de WhatsApp:
 * Remueve espacios, guiones, paréntesis y el prefijo '+' inicial.
 */
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Genera un enlace directo a la API de WhatsApp con el texto codificado según URI.
 * Formato canónico: https://wa.me/[phone]?text=[encoded_message]
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export interface CancellationAlertParams {
  studentName: string;
  instructorName: string;
  sessionDate: string;
  sessionTime: string;
  reason: string;
}

/**
 * Construye la plantilla de mensaje parametrizado para cancelación de emergencia.
 * Notifica la suspensión por enfermedad o contingencia e informa el reembolso automático de la clase.
 */
export function buildEmergencyCancellationAlert(params: {
  studentName: string;
  instructorName: string;
  sessionDate: string;
  sessionTime: string;
  reason: string;
}): string {
  return (
    `¡Hola ${params.studentName}! Te escribimos desde el estudio de Andrea Yoga.\n\n` +
    `Lamentamos informarte que la clase programada para el ${params.sessionDate} a las ${params.sessionTime} hs con ${params.instructorName} debió ser cancelada.\n` +
    `Motivo: ${params.reason}.\n\n` +
    `Tu crédito de clase ya ha sido devuelto automáticamente a tu paquete activo en el sistema. ` +
    `Puedes consultar tu saldo en cualquier momento.\n\n` +
    `¡Esperamos verte pronto en tu mat! Namasté.`
  );
}

/**
 * Construye la plantilla de aviso cuando una alumna en lista de espera obtiene cupo confirmado.
 */
export function buildWaitlistPromotionAlert(params: {
  studentName: string;
  instructorName: string;
  sessionDate: string;
  sessionTime: string;
}): string {
  return (
    `¡Hola ${params.studentName}! Te avisamos desde Andrea Yoga que se liberó un cupo en la clase del ${params.sessionDate} a las ${params.sessionTime} hs con ${params.instructorName}.\n\n` +
    `Has sido promovida de la lista de espera y tu lugar está 100% CONFIRMADO. Se debitó 1 clase de tu paquete activo.\n\n` +
    `¡Te esperamos en el estudio!`
  );
}

/**
 * Construye la plantilla en caso de sustitución de instructora por contingencia.
 */
export function buildSubstitutionAlert(params: {
  studentName: string;
  originalInstructor: string;
  newInstructor: string;
  sessionDate: string;
  sessionTime: string;
}): string {
  return (
    `¡Hola ${params.studentName}! Te informamos un cambio operativo en Andrea Yoga para tu clase del ${params.sessionDate} a las ${params.sessionTime} hs:\n\n` +
    `Por motivos de fuerza mayor, ${params.originalInstructor} será sustituida por ${params.newInstructor}. El horario y tu lugar se mantienen exactamente iguales.\n\n` +
    `¡Nos vemos en clase!`
  );
}
