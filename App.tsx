
import React, { useState } from 'react';
import { DataProvider, useData } from './context/DataContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DataEntry } from './pages/DataEntry';
import { AdminConfig } from './pages/AdminConfig';
import { Commitments } from './pages/Commitments';
import { RRHH } from './pages/RRHH';
import { Management } from './pages/Management';
import { Sidebar } from './components/Sidebar';
import { Menu } from 'lucide-react';

const AppContent = () => {
  const { user } = useData();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white">
      {/* Mobile Header */}
      <div className="md:hidden bg-bank-900 text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md print:hidden">
        <h1 className="font-bold text-lg">Equipo BAZ</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <Sidebar 
        currentPage={currentPage} 
        onNavigate={(page) => {
          setCurrentPage(page);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden print:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-6 overflow-y-auto h-[calc(100vh-64px)] md:h-screen md:ml-64 w-full print:ml-0 print:h-auto print:overflow-visible print:w-full">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'management' && <Management />}
        {currentPage === 'commitments' && <Commitments />}
        {currentPage === 'entry' && <DataEntry />}
        {currentPage === 'rrhh' && <RRHH />}
        {currentPage === 'config' && <AdminConfig />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
