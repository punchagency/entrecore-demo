import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileMenuButton } from "@/components/mobile-menu-button";
import { DynamicSidebarTrigger } from "@/components/dynamic-sidebar-trigger";
import { SocketIOProvider } from "@/contexts/socketio-context";
import { RouteGuard } from "@/components/route-guard";
import { SupportChrome } from "@/components/support-chrome";
import { EmailVerificationBanner } from "@/components/email-verification-banner";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SocketIOProvider autoConnect={true}>
      <SidebarProvider>
        <MobileMenuButton />

        <AppSidebar />
        <DynamicSidebarTrigger />
        <main className="w-full overflow-x-hidden bg-[#F0F4FF]">
          <br className="md:hidden" />
          <br className="md:hidden" />
          <div className="w-full">
            <SupportChrome />
            <EmailVerificationBanner />
            <RouteGuard>{children}</RouteGuard>
          </div>
        </main>
      </SidebarProvider>
    </SocketIOProvider>
  );
}
