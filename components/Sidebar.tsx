
import React from 'react';
import { useData } from '../context/DataContext';
import { LayoutDashboard, FileText, Settings, LogOut, X, User as UserIcon, CalendarDays, HeartHandshake, Briefcase } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, setIsOpen }) => {
  const { user, logout } = useData();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'EDITOR', 'LECTOR'] },
    { id: 'management', label: 'Gestión Gerencial', icon: Briefcase, roles: ['ADMIN', 'EDITOR'] },
    { id: 'commitments', label: 'Compromisos', icon: CalendarDays, roles: ['ADMIN', 'EDITOR', 'LECTOR'] },
    { id: 'entry', label: 'Registro', icon: FileText, roles: ['ADMIN', 'EDITOR'] },
    { id: 'rrhh', label: 'RRHH', icon: HeartHandshake, roles: ['ADMIN'] },
    { id: 'config', label: 'Configuración', icon: Settings, roles: ['ADMIN'] },
  ];

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 w-64 bg-bank-900 text-white transform transition-transform duration-300 ease-in-out print:hidden
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:translate-x-0 md:static md:inset-auto md:flex md:flex-col md:min-h-screen
    `}>
      <div className="p-6 border-b border-bank-800 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipo BAZ</h1>
          <p className="text-bank-500 text-xs mt-1">Gestión y Metas</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 py-6 overflow-y-auto">
        <nav className="space-y-1 px-3">
          {navItems.map(item => {
            if (!user || !item.roles.includes(user.role)) return null;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  currentPage === item.id 
                    ? 'bg-bank-800 text-white' 
                    : 'text-bank-100 hover:bg-bank-800 hover:text-white'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-bank-800">
        <div className="flex items-center mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-bank-600 flex items-center justify-center mr-3 overflow-hidden border border-bank-500">
            {user?.photoUrl ? (
                <img src={user.photoUrl} alt="User" className="w-full h-full object-cover" />
            ) : (
                <span className="font-bold text-lg">{user?.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate w-32" title={user?.username}>{user?.username}</p>
            <p className="text-xs text-bank-400 capitalize">{user?.role.toLowerCase()}</p>
          </div>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-bank-200 bg-bank-800 hover:bg-bank-700 focus:outline-none"
        >
          <LogOut className="mr-2 h-4 w-4" /> Salir
        </button>
      </div>
    </div>
  );
};
