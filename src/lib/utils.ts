import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAIROBI_TZ = "Africa/Nairobi";

export function formatNairobiTime(date: string | number | Date) {
  return new Date(date).toLocaleTimeString("en-KE", { timeZone: NAIROBI_TZ });
}

export function formatNairobiDate(date: string | number | Date) {
  return new Date(date).toLocaleDateString("en-KE", { timeZone: NAIROBI_TZ, month: "short", day: "numeric" });
}

export function formatNairobiDateTime(date: string | number | Date) {
  return new Date(date).toLocaleString("en-KE", { timeZone: NAIROBI_TZ });
}
