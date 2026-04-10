import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="ml-[220px] min-h-screen flex flex-col">{children}</div>
    </>
  );
}
