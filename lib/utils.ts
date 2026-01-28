import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Global flag: when true, the app runs in completely free mode
// and all subscription/paywall checks are bypassed.
// To re-enable payments in the future, change this to false.
export const IS_FREE_MODE = true;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
