'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiHome, FiUser, FiBell, FiLogOut, FiSun, FiMoon, FiHash, FiZap } from 'react-icons/fi';
import { useAuth } from '@/context/AppContext';
import { motion } from 'framer-motion';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, isDarkMode, toggleTheme } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (isAuthPage) {
    return <>{children}</>;
  }

  const sidebarLinks = [
    {
      icon: FiHome,
      label: 'Accueil',
      href: '/',
    },
    {
      icon: FiZap,
      label: 'Recommandations',
      href: '/recommended',
    },
    {
      icon: FiHash,
      label: 'Tendances',
      href: '/trends',
    },
    {
      icon: FiBell,
      label: 'Notifications',
      href: '/notification',
    },
    {
      icon: FiUser,
      label: 'Profil',
      href: `/profile/${user?.username}`,
    },
  ];

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`fixed h-screen w-64 border-r ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-800' 
          : 'bg-white/95 border-gray-200'
        } backdrop-blur-sm`}>
        <div className="flex flex-col h-full p-4">
          <div className="mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-500">Twitter Clone</h1>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:bg-gray-800/80'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
            </motion.button>
          </div>

          <nav className="flex-1">
            <ul className="space-y-2">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <motion.li
                    key={link.href}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-full transition-all ${
                        isActive
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                          : isDarkMode
                            ? 'text-gray-300 hover:bg-gray-800/80'
                            : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <div className={`border-t ${
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          } pt-4`}>
            <div className="flex items-center space-x-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {user?.username}
                </p>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  @{user?.username}
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => logout()}
              className={`w-full mt-2 flex items-center space-x-3 px-4 py-3 rounded-full transition-all ${
                isDarkMode
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-red-500 hover:bg-red-500/10'
              }`}
            >
              <FiLogOut className="w-6 h-6" />
              <span className="font-medium">Déconnexion</span>
            </motion.button>
          </div>
        </div>
      </div>
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}