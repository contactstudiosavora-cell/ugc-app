export default function ShareLayout({ children }: { children: React.ReactNode }) {
  // Completely independent layout - no sidebar, no navigation
  return (
    <html lang="fr">
      <body className="bg-cream">
        {children}
      </body>
    </html>
  );
}
