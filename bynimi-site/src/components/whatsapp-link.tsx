"use client";

import { whatsappLink } from "@/lib/store";

// A WhatsApp chat with Nimi, message pre-typed. The page's own address is
// added at the moment of the tap (it isn't known while prerendering), so
// Nimi sees exactly which bag and colour the customer was looking at.
export function WhatsAppLink({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={whatsappLink(message)}
      onClick={(e) => (e.currentTarget.href = whatsappLink(`${message} ${window.location.href}`))}
      className={className}
    >
      {children}
    </a>
  );
}
