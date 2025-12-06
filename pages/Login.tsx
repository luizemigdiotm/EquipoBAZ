import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Lock, User as UserIcon, MessageCircle } from 'lucide-react';

export const Login = () => {
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        let formattedEmail = email;
        if (!email.includes('@')) {
            formattedEmail = `${email}@baz.com`; 
        }

        await login(formattedEmail, password);
    } catch (err: any) {
        console.error(err);
        // Supabase error handling
        if (err.message === 'Invalid login credentials') {
            setError('Credenciales inválidas. Verifique correo y contraseña.');
        } else {
            setError('Error al iniciar sesión: ' + err.message);
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bank-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-bank-800">Equipo BAZ</h1>
          <p className="text-gray-500">Sistema de Control y Metas (SQL)</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico / Usuario</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-bank-500"
                placeholder="ej. admin@baz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Si usa solo usuario, se asumirá @baz.com</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                className="pl-10 w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-bank-500"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-bank-600 hover:bg-bank-700 text-white font-bold py-2 px-4 rounded transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-3">Contacte al administrador si no tiene acceso.</p>
          
          <a 
            href="https://wa.me/524662606262?text=quiero%20acceso%20al%20sistema%20equipo%20BAZ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold hover:bg-green-100 transition-colors border border-green-200"
          >
            <MessageCircle size={16} className="mr-2" />
            Solicitar acceso por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};