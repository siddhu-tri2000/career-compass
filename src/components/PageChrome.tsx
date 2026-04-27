"use client";

import NavBar from "@/components/NavBar";
import MiniFooter from "@/components/MiniFooter";

interface PageChromeProps {
  children: React.ReactNode;
  /** Extra controls injected between nav links and UserMenu (e.g. map's Share button) */
  navExtra?: React.ReactNode;
  hideNav?: boolean;
  hideFooter?: boolean;
}

export default function PageChrome({
  children,
  navExtra,
  hideNav = false,
  hideFooter = false,
}: PageChromeProps) {
  return (
    <div className="min-h-screen bg-[#08090A] text-white">
      {!hideNav && <NavBar extra={navExtra} />}
      {children}
      {!hideFooter && <MiniFooter />}
    </div>
  );
}
