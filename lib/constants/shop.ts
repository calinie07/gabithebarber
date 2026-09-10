/**
 * Placeholder shop info used until shop_settings is loaded from the DB.
 * Prefer reading from `shop_settings` at runtime.
 */
export const SHOP_PLACEHOLDER = {
  name: "Gabi Barber",
  phone: "+40721234567",
  phoneDisplay: "+40 721 234 567",
  address: "Strada Exemplu 12, București",
  mapsQuery: "Strada Exemplu 12, București",
  email: "contact@gabibarber.ro",
} as const;

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

export function smsHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `sms:${digits}`;
}

export function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
