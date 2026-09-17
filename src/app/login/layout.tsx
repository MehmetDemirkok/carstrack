// Metadata bu segmentte `page.tsx` içinde tanımlı; burada ikinci bir metadata
// bloğu tutmak Next tarafından ezildiği için çelişkili başlık üretiyordu.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
