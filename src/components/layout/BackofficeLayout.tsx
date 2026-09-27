import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';
import { useBackoffice } from '../../context/BackofficeContext';

/**
 * Layout comum a todas as rotas do backoffice com suporte a Light & Dark Mode.
 */
export function BackofficeLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useBackoffice();

  return (
    <div className={`min-h-screen transition-colors duration-200 flex flex-col font-sans ${
      theme === 'dark' ? 'bg-[#0B0E11] text-[#EAECEF]' : 'bg-[#F0F2F5] text-[#1E2329]'
    }`}>
      <TopNavbar
        onToggleMobileMenu={() => setIsMobileMenuOpen(v => !v)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-7 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
export default BackofficeLayout;
