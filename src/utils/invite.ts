/** After opening an invite link, peer id is stored until chat opens. */
export const INVITE_PENDING_PEER_KEY = "uchat_invite_peer_id";

export function generateWhatsAppLink(inviteLink: string): string {
  const message = `Hey — we can chat in different languages and it auto-translates.

Try it:
${inviteLink}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp with a prefilled message. Uses full navigation on mobile to avoid popup issues. */
export function openWhatsAppShare(whatsappUrl: string): void {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = whatsappUrl;
  } else {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }
}
