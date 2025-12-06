
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Lock, User as UserIcon } from 'lucide-react';

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
        formattedEmail = `${email} @baz.com`;
      }

      await login(formattedEmail, password);
    } catch (err: any) {
      // Safe error message extraction
      let errorMessage = 'Error desconocido al iniciar sesión';
      if (err && typeof err === 'object') {
        if (err.message) errorMessage = err.message;
        else if (err.error_description) errorMessage = err.error_description;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      if (errorMessage === 'Invalid login credentials') {
        setError('Credenciales inválidas. Verifique correo y contraseña.');
      } else {
        setError('Error: ' + errorMessage);
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

          <div className="mt-6 text-center">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#2c7a7b] hover:bg-[#285e61] text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline flex justify-center items-center transition-all duration-300"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>

            <p className="mt-4 text-gray-500 text-xs">
              Contacte al administrador si no tiene acceso.
            </p>

            <a
              href={`https://wa.me/?text=${encodeURIComponent('Hola, necesito acceso al sistema Equipo BAZ.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-transparent rounded-full hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              Solicitar acceso por WhatsApp
            </a >
          </div >
        </form >
        ¿Problemas de conexión ? Diagnosticar aquí
      </button >

      <a
        href="https://wa.me/524662606262?text=quiero%20acceso%20al%20sistema%20equipo%20BAZ"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold hover:bg-green-100 transition-colors border border-green-200"
      >
        <MessageCircle size={16} className="mr-2" />
        Solicitar acceso por WhatsApp
      </a>
    </div >
      </div >
    </div >
  );
};