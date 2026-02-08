import { AuthGuard } from "@/lib/auth/guard";
import Shell from "@/components/layout/Shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Shell>{children}</Shell>
    </AuthGuard>
  );
}
