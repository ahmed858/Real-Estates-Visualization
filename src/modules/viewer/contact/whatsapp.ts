// WhatsApp enquiry links: https://wa.me/<digits>?text=<message>, with a
// prefilled message in the viewer's language that names the project and,
// for a unit enquiry, the unit code (and its floor on a typical floor).
import type { ViewerText } from "../layout/viewer-text";

/** Digits only, as wa.me expects ("+20 100-123 4567" → "201001234567"). */
export function whatsappDigits(number: string): string {
  return number.replace(/\D/g, "");
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${whatsappDigits(number)}?text=${encodeURIComponent(message)}`;
}

export interface EnquirySubject {
  projectName: string;
  /** Omitted for a general "contact us" enquiry. */
  unitCode?: string;
  /** The floor, named only for units on a typical floor (the code alone may not say it). */
  floor?: string;
}

export function enquiryMessage(text: ViewerText, subject: EnquirySubject): string {
  const { projectName, unitCode, floor } = subject;
  if (!unitCode) return text.contact.general(projectName);
  return floor === undefined ? text.contact.unit(projectName, unitCode) : text.contact.unitOnFloor(projectName, unitCode, floor);
}
