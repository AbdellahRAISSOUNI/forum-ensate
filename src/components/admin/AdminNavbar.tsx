"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forceLogout } from "@/lib/authUtils";

const navigation = [
  { name: 'Tableau de bord', href: '/admin/dashboard', icon: '📊' },
  { name: 'Utilisateurs', href: '/admin/users', icon: '👥' },
  { name: 'Entreprises', href: '/admin/entreprises', icon: '🏢' },
  { name: 'Salles', href: '/admin/salles', icon: '🏠' },
  { name: 'Comité', href: '/admin/comite', icon: '👨‍💼' },
  { name: 'Entretiens', href: '/admin/interviews', icon: '💼' },
];

interface AdminNavbarProps {
  userName?: string;
}

export default function AdminNavbar({ userName }: AdminNavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-[#0b2b5c] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin/dashboard" className="text-white font-bold text-xl">
                Forum ENSA Admin
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-[#d4af37] text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-300 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              Bonjour, {userName || 'Administrateur'}
            </span>
            <button
              onClick={forceLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0a244e] border-[#d4af37] text-white'
                    : 'border-transparent text-gray-300 hover:bg-[#0a244e] hover:border-gray-300 hover:text-white'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
