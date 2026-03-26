import { Providers } from "@widgets/providers";
import { Sidebar } from "@widgets/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen border border-border rounded-xl overflow-hidden m-2">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    </Providers>
  );
}
