"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

/** Empties the bag once the order is paid. */
export function ClearCart() {
  useEffect(() => clearCart(), []);
  return null;
}
