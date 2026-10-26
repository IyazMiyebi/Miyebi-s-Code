"use client";

import { whatsappLink } from "@/lib/store";

// A WhatsApp chat with Nimi, message pre-typed. The page's own address is
// added at the moment of the tap (it isn't known while prerendering), so
// Nimi sees exactly which bag and colour the customer was looking at.
// `withPage={false}` leaves it out, for general questions.
export function WhatsAppLink({
  message,
  withPage = true,
  className,
  children,
}: {
  message: string;
  withPage?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={whatsappLink(message)}
      onClick={(e) => withPage && (e.currentTarget.href = whatsappLink(`${message} ${window.location.href}`))}
      className={className}
    >
      {children}
    </a>
  );
}
