export default function ShareLayout({ children }: { children: React.ReactNode }) {
  // This layout resets the sidebar margin applied by the root layout
  return (
    <div
      style={{ marginLeft: "-220px", width: "100vw", minHeight: "100vh" }}
      className="bg-[#F5F2EB]"
    >
      {children}
    </div>
  );
}
