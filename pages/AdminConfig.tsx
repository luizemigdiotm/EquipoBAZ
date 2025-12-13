
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Position, AppliesTo, Advisor, Indicator, User, IndicatorGroup } from '../types';
import { Trash2, Edit2, Plus, Users, Target, DollarSign, Shield, History, Clock, Save, X, User as UserIcon, Briefcase, Hash, Percent, Search, Lock, AlertTriangle, Camera, Upload, Award, ToggleRight, CheckSquare, Layers, Calendar, Copy, Divide } from 'lucide-react';

export const AdminConfig = () => {
  const [activeTab, setActiveTab] = useState<'advisors' | 'indicators' | 'budgets' | 'users' | 'history' | 'profile' | 'branch'>('advisors');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-bank-900">Configuración</h1>
          <p className="text-gray-500 mt-1">Administra los parámetros globales del sistema</p>
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-8 overflow-x-auto">
        <div className="flex space-x-1 min-w-max">
          <TabButton active={activeTab === 'advisors'} onClick={() => setActiveTab('advisors')} icon={Users} label="Asesores" />
          <TabButton active={activeTab === 'indicators'} onClick={() => setActiveTab('indicators')} icon={Target} label="Indicadores" />
          <TabButton active={activeTab === 'budgets'} onClick={() => setActiveTab('budgets')} icon={DollarSign} label="Presupuestos" />
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Shield} label="Usuarios" />
          <TabButton active={activeTab === 'branch'} onClick={() => setActiveTab('branch')} icon={Briefcase} label="Sucursal" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={UserIcon} label="Mi Perfil" />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="Historial" />
        </div>
      </div>

      <div className="animate-fade-in-up">
        {activeTab === 'advisors' && <AdvisorsManager />}
        {activeTab === 'indicators' && <IndicatorsManager />}
        {activeTab === 'budgets' && <BudgetManager />}
        {activeTab === 'users' && <UserManager />}
        {activeTab === 'branch' && <BranchManager />}
        {activeTab === 'profile' && <UserProfile />}
        {activeTab === 'history' && <AuditLogViewer />}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`
      flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200
      ${active ? 'bg-bank-50 text-bank-700 shadow-sm ring-1 ring-bank-200' : 'text-gray-500 hover:text-gray-900 hover:text-gray-900 hover:bg-gray-50'}
    `}
  >
    <Icon className={`w-4 h-4 mr-2 ${active ? 'text-bank-600' : 'text-gray-400'}`} />
    {label}
  </button>
);

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const UserProfile = () => {
  const { user, updateProfile } = useData();
  const [name, setName] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(user?.photoUrl);
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500000) { alert('La imagen es muy pesada. Por favor suba una imagen menor a 500KB.'); return; }
      const base64 = await convertToBase64(file);
      setPhoto(base64);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('¿Está seguro de actualizar sus datos?')) return;
    setLoading(true);
    try {
      await updateProfile({ username: name, password: password || undefined, photoUrl: photo });
      alert('Perfil actualizado correctamente');
      setPassword('');
    } catch (e: any) { alert('Error al actualizar: ' + e.message); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Editar Mi Perfil</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-3 overflow-hidden border-4 border-white shadow-md relative group">
            {photo ? <img src={photo} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><UserIcon size={40} /></div>}
            <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="text-white" size={24} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>
          <p className="text-xs text-gray-500">Click en la imagen para cambiar</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre para mostrar</label>
          <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Opcional)</label>
          <input type="password" placeholder="Dejar en blanco para mantener la actual" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Si cambia la contraseña, podría tener que volver a iniciar sesión.</p>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-bank-600 text-white font-bold py-3 rounded-lg hover:bg-bank-700 transition-colors shadow-md">
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
};

const AuditLogViewer = () => {
  const { auditLogs } = useData();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-800">Historial de Movimientos</h3>
        <p className="text-sm text-gray-500">Registro de actividades recientes en la plataforma</p>
      </div>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
            <tr><th className="p-4">Fecha</th><th className="p-4">Usuario</th><th className="p-4">Acción</th><th className="p-4">Detalle</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {auditLogs.length > 0 ? auditLogs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 whitespace-nowrap text-gray-500"><div className="flex items-center gap-2"><Clock size={14} className="text-bank-400" />{new Date(log.timestamp).toLocaleString()}</div></td>
                <td className="p-4"><span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-xs">{log.username}</span></td>
                <td className="p-4 font-medium text-bank-700">{log.action}</td>
                <td className="p-4 text-gray-600 max-w-md truncate" title={log.details}>{log.details}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">No hay movimientos registrados aún.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BranchManager = () => {
  const { branchConfig, updateBranchConfig, indicators } = useData();
  const [form, setForm] = useState({
    ceco: '', name: '', region: '', territory: '', leaderName: '', keyIndicatorIds: [] as string[]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (branchConfig) {
      setForm({
        ceco: branchConfig.ceco || '',
        name: branchConfig.name || '',
        region: branchConfig.region || '',
        territory: branchConfig.territory || '',
        leaderName: branchConfig.leaderName || '',
        keyIndicatorIds: branchConfig.keyIndicatorIds || []
      });
    }
  }, [branchConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBranchConfig({ ...branchConfig, ...form });
      alert('Configuración de Sucursal actualizada');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyIndicator = (id: string) => {
    const current = form.keyIndicatorIds;
    if (current.includes(id)) {
      setForm({ ...form, keyIndicatorIds: current.filter(i => i !== id) });
    } else {
      if (current.length >= 4) {
        alert('Máximo 4 indicadores foco permitidos');
        return;
      }
      setForm({ ...form, keyIndicatorIds: [...current, id] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-bank-600"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-bank-600" /> Datos de la Sucursal
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">CECO (Centro de Costos)</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.ceco} onChange={e => setForm({ ...form, ceco: e.target.value })} placeholder="ej. 6978" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Nombre Sucursal</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ej. Salvatierra" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Región</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="ej. Región 5" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Territorio</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.territory} onChange={e => setForm({ ...form, territory: e.target.value })} placeholder="ej. Bajío" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Líder de Sucursal</label>
            <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.leaderName} onChange={e => setForm({ ...form, leaderName: e.target.value })} placeholder="ej. Pedro Páramo" />
          </div>

          <div className="md:col-span-2 mt-4 pt-4 border-t">
            <h4 className="font-bold text-gray-700 mb-2">Indicadores Foco (Máx 4)</h4>
            <p className="text-xs text-gray-400 mb-4">Estos indicadores aparecerán en la Pizarra Gerencial y Reporte WhatsApp.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {indicators.map(ind => (
                <div key={ind.id} onClick={() => toggleKeyIndicator(ind.id)}
                  className={`cursor-pointer border rounded-lg p-3 text-sm transition-all flex items-center justify-between ${form.keyIndicatorIds.includes(ind.id) ? 'bg-bank-50 border-bank-500 text-bank-700 font-bold' : 'bg-white text-gray-500 hover:border-gray-300'}`}>
                  <span>{ind.name}</span>
                  {form.keyIndicatorIds.includes(ind.id) && <CheckSquare size={16} />}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={loading} className="bg-bank-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-bank-700 transition-colors shadow-md">
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManager = () => {
  const { allUsers, addUser, updateUser, deleteUser, user: currentUser } = useData();
  const [form, setForm] = useState<Partial<User>>({ username: '', password: '', role: 'LECTOR' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.username) {
      setLoading(true);
      try {
        if (isEditing && form.id) {
          await updateUser(form as User);
        } else {
          await addUser({ ...form, id: crypto.randomUUID() } as User);
          alert('Usuario registrado en base de datos. \n\nIMPORTANTE: Debe crear el usuario en "Authentication" de Firebase con el mismo correo y contraseña para que pueda ingresar.');
        }
        setForm({ username: '', password: '', role: 'LECTOR' });
        setIsEditing(false);
      } catch (error: any) {
        alert('Error al guardar usuario: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (u: User) => { setForm(u); setIsEditing(true); };
  const roleColors = { ADMIN: 'bg-red-100 text-red-700 ring-red-200', EDITOR: 'bg-blue-100 text-blue-700 ring-blue-200', LECTOR: 'bg-emerald-100 text-emerald-700 ring-emerald-200' };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-bank-500"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          {isEditing ? <Edit2 className="w-5 h-5 mr-2 text-bank-500" /> : <Plus className="w-5 h-5 mr-2 text-bank-500" />}
          {isEditing ? 'Editar Rol de Usuario' : 'Nuevo Rol de Usuario'}
        </h3>
        <div className="mb-4 bg-blue-50 text-blue-800 p-3 rounded text-xs border border-blue-100 flex items-start">
          <Shield className="w-4 h-4 mr-2 mt-0.5" />
          <p>Aquí se definen los <strong>permisos</strong>. Para permitir el acceso, asegúrese de registrar también el correo en la consola de Firebase Authentication.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Correo (Usuario)</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="ej. admin@baz.com" className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 focus:bg-white transition-all outline-none" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Rol</label>
            <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}>
              <option value="ADMIN">Admin</option><option value="EDITOR">Editor</option><option value="LECTOR">Lector</option>
            </select>
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-bank-600 text-white py-2 rounded-lg hover:bg-bank-700 transition-colors shadow-sm font-medium flex justify-center items-center">
              {loading ? 'Guardando...' : <><Save size={18} className="mr-1" /> Guardar Permisos</>}
            </button>
            {isEditing && (<button type="button" onClick={() => { setIsEditing(false); setForm({ username: '', password: '', role: 'LECTOR' }); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X size={18} /></button>)}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allUsers.map(u => (
          <div key={u.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bank-500 to-bank-700 text-white flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden">
                  {u.photoUrl ? <img src={u.photoUrl} alt={u.username} className="w-full h-full object-cover" /> : u.username.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-gray-900 truncate w-40" title={u.username}>{u.username}</h4>
                  <div className="text-xs text-gray-400 flex items-center mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span> Activo</div>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ring-1 ring-inset ${roleColors[u.role]}`}>{u.role}</span>
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-mono truncate w-24">ID: {u.id}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={16} /></button>
                {u.id !== currentUser?.id && (<button onClick={() => deleteUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={16} /></button>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdvisorsManager = () => {
  const { advisors, addAdvisor, updateAdvisor, deleteAdvisor } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAdvisor, setCurrentAdvisor] = useState<Partial<Advisor>>({ name: '', position: Position.LOAN_ADVISOR, employeeNumber: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAdvisor.name && currentAdvisor.position) {
      setLoading(true);
      try {
        if (isEditing && currentAdvisor.id) {
          await updateAdvisor(currentAdvisor as Advisor);
        } else {
          await addAdvisor({ ...currentAdvisor, id: crypto.randomUUID() } as Advisor);
        }
        setCurrentAdvisor({ name: '', position: Position.LOAN_ADVISOR, employeeNumber: '', photoUrl: undefined, birthDate: '', hireDate: '' });
        setIsEditing(false);
        alert('Asesor guardado correctamente');
      } catch (error: any) {
        console.error(error);
        alert('Error al guardar asesor: ' + error.message + '\n\nRevise si la tabla "advisors" existe en Supabase y tiene las políticas RLS correctas.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (adv: Advisor) => { setCurrentAdvisor(adv); setIsEditing(true); };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 300000) { alert('La imagen es muy pesada. Máximo 300KB.'); return; }
      const base64 = await convertToBase64(file);
      setCurrentAdvisor({ ...currentAdvisor, photoUrl: base64 });
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          {isEditing ? <Edit2 className="w-5 h-5 mr-2 text-yellow-600" /> : <Plus className="w-5 h-5 mr-2 text-yellow-600" />}
          {isEditing ? 'Editar Asesor' : 'Nuevo Asesor'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-2 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mb-2 overflow-hidden border border-gray-200 flex items-center justify-center">
              {currentAdvisor.photoUrl ? <img src={currentAdvisor.photoUrl} alt="Preview" className="w-full h-full object-cover" /> : <Camera className="text-gray-400" />}
            </div>
            <label className="text-xs text-blue-600 font-bold cursor-pointer hover:underline">Subir Foto <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} /></label>
          </div>
          <div className="md:col-span-10 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">No. Empleado</label>
              <input type="text" placeholder="ej. 123456" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" value={currentAdvisor.employeeNumber || ''} onChange={e => setCurrentAdvisor({ ...currentAdvisor, employeeNumber: e.target.value })} />
            </div>
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Nombre Completo</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="ej. Juan Pérez" className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:bg-white transition-all outline-none" value={currentAdvisor.name} onChange={e => setCurrentAdvisor({ ...currentAdvisor, name: e.target.value })} required />
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Puesto</label>
              <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" value={currentAdvisor.position} onChange={e => setCurrentAdvisor({ ...currentAdvisor, position: e.target.value as Position })}>
                {Object.values(Position).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Fecha de Nacimiento</label>
              <input type="date" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" value={currentAdvisor.birthDate || ''} onChange={e => setCurrentAdvisor({ ...currentAdvisor, birthDate: e.target.value })} />
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Fecha de Ingreso (Aniversario)</label>
              <input type="date" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" value={currentAdvisor.hireDate || ''} onChange={e => setCurrentAdvisor({ ...currentAdvisor, hireDate: e.target.value })} />
            </div>
            <div className="md:col-span-12 flex gap-2 mt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm font-medium flex justify-center items-center">
                {loading ? 'Guardando...' : <><Save size={18} className="mr-1" /> Guardar</>}
              </button>
              {isEditing && (<button type="button" onClick={() => { setIsEditing(false); setCurrentAdvisor({ name: '', position: Position.LOAN_ADVISOR, employeeNumber: '', photoUrl: undefined, birthDate: '', hireDate: '' }); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X size={18} /></button>)}
            </div>
          </div>
        </form>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {advisors.map(adv => (
          <div key={adv.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2 ${adv.position === Position.LOAN_ADVISOR ? 'border-blue-100' : 'border-emerald-100'}`}>
                {adv.photoUrl ? <img src={adv.photoUrl} alt={adv.name} className="w-full h-full object-cover" /> : <Briefcase size={24} className="text-gray-400" />}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 leading-tight mb-1">{adv.name}</h4>
                <p className="text-xs text-gray-500 font-medium">{adv.position}</p>
                {adv.employeeNumber && <p className="text-[10px] text-gray-400 font-mono mt-1">ID: {adv.employeeNumber}</p>}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(adv)} className="flex items-center text-xs font-medium text-gray-600 hover:text-blue-600 px-2 py-1 hover:bg-blue-50 rounded transition-colors"><Edit2 size={14} className="mr-1" /> Editar</button>
              <button onClick={() => deleteAdvisor(adv.id)} className="flex items-center text-xs font-medium text-gray-600 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} className="mr-1" /> Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const IndicatorsManager = () => {
  const { indicators, addIndicator, updateIndicator, deleteIndicator } = useData();
  const [form, setForm] = useState<Partial<Indicator>>({ name: '', appliesTo: AppliesTo.ALL, unit: '$', weightLoan: 0, weightAffiliation: 0, isCumulative: true, isAverage: false, roles: [], group: 'COLOCACION' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Checkboxes state
  const [applyLoan, setApplyLoan] = useState(true);
  const [applyAff, setApplyAff] = useState(true);
  const [applyBranch, setApplyBranch] = useState(true);

  // Group indicators by name
  const uniqueIndicators = useMemo(() => {
    const map = new Map();
    indicators.forEach(ind => {
      if (!map.has(ind.name)) {
        map.set(ind.name, { ...ind, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [indicators]);

  // Sync checkboxes
  useEffect(() => {
    if (isEditing) {
      if (form.roles && form.roles.length > 0) {
        setApplyLoan(form.roles.includes(Position.LOAN_ADVISOR));
        setApplyAff(form.roles.includes(Position.AFFILIATION_ADVISOR));
        setApplyBranch(form.roles.includes('BRANCH'));
      } else if (form.appliesTo) {
        setApplyLoan(form.appliesTo === AppliesTo.ALL || form.appliesTo === AppliesTo.LOAN);
        setApplyAff(form.appliesTo === AppliesTo.ALL || form.appliesTo === AppliesTo.AFFILIATION);
        setApplyBranch(form.appliesTo === AppliesTo.ALL || form.appliesTo === AppliesTo.BRANCH);
      }
    } else {
      setApplyLoan(true); setApplyAff(true); setApplyBranch(true);
    }
  }, [form.appliesTo, form.roles, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name) {
      let finalAppliesTo = AppliesTo.ALL;
      const roles: string[] = [];

      if (applyLoan) roles.push(Position.LOAN_ADVISOR);
      if (applyAff) roles.push(Position.AFFILIATION_ADVISOR);
      if (applyBranch) roles.push('BRANCH');

      if (roles.length === 0) { alert('Seleccione al menos un puesto'); return; }

      // Legacy fallback logic
      if (applyLoan && applyAff && applyBranch) finalAppliesTo = AppliesTo.ALL;
      else if (applyLoan && applyAff) finalAppliesTo = AppliesTo.ALL;
      else if (applyLoan && applyBranch) finalAppliesTo = AppliesTo.ALL;
      else if (applyAff && applyBranch) finalAppliesTo = AppliesTo.ALL;
      else if (applyLoan) finalAppliesTo = AppliesTo.LOAN;
      else if (applyAff) finalAppliesTo = AppliesTo.AFFILIATION;
      else if (applyBranch) finalAppliesTo = AppliesTo.BRANCH;

      const payload = { ...form, appliesTo: finalAppliesTo, roles };

      setLoading(true);
      try {
        if (isEditing && form.id) await updateIndicator(payload as Indicator);
        else await addIndicator({ ...payload, id: crypto.randomUUID() } as Indicator);

        setForm({ name: '', appliesTo: AppliesTo.ALL, unit: '$', weightLoan: 0, weightAffiliation: 0, isCumulative: true, isAverage: false, roles: [], group: 'COLOCACION' });
        setIsEditing(false);
        setApplyLoan(true); setApplyAff(true); setApplyBranch(true);
        alert('Indicador guardado');
      } catch (error: any) {
        alert('Error al guardar indicador: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = (ind: Indicator) => {
    setForm({
      ...ind,
      isCumulative: ind.isCumulative !== undefined ? ind.isCumulative : true,
      isAverage: ind.isAverage !== undefined ? ind.isAverage : false,
      group: ind.group || 'COLOCACION'
    });
    setIsEditing(true);
  };

  const getUnitIcon = (unit: string) => { return unit === '$' ? <DollarSign size={18} /> : unit === '%' ? <Percent size={18} /> : <Hash size={18} />; };

  const showLoanWeight = applyLoan;
  const showAffiliationWeight = applyAff;

  const isRoleActive = (ind: Indicator, role: string) => {
    if (ind.roles && ind.roles.length > 0) return ind.roles.includes(role);
    if (role === Position.LOAN_ADVISOR) return ind.appliesTo === AppliesTo.ALL || ind.appliesTo === AppliesTo.LOAN;
    if (role === Position.AFFILIATION_ADVISOR) return ind.appliesTo === AppliesTo.ALL || ind.appliesTo === AppliesTo.AFFILIATION;
    if (role === 'BRANCH') return ind.appliesTo === AppliesTo.ALL || ind.appliesTo === AppliesTo.BRANCH;
    return false;
  };

  const getGroupStyles = (group?: IndicatorGroup) => {
    switch (group) {
      case 'COLOCACION': return 'border-red-500 shadow-red-100';
      case 'CAPTACION': return 'border-sky-500 shadow-sky-100';
      case 'TOTAL_SAN': return 'border-fuchsia-500 shadow-fuchsia-100';
      default: return 'border-gray-200';
    }
  };

  const getGroupLabel = (group?: IndicatorGroup) => {
    switch (group) {
      case 'COLOCACION': return 'Colocación';
      case 'CAPTACION': return 'Captación';
      case 'TOTAL_SAN': return 'Total SAN';
      default: return 'Sin Grupo';
    }
  };

  const getGroupBadgeColor = (group?: IndicatorGroup) => {
    switch (group) {
      case 'COLOCACION': return 'bg-red-100 text-red-700';
      case 'CAPTACION': return 'bg-sky-100 text-sky-700';
      case 'TOTAL_SAN': return 'bg-fuchsia-100 text-fuchsia-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          {isEditing ? <Edit2 className="w-5 h-5 mr-2 text-purple-600" /> : <Plus className="w-5 h-5 mr-2 text-purple-600" />}
          {isEditing ? 'Editar Indicador' : 'Nuevo Indicador'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Nombre del Indicador</label>
            <input type="text" placeholder="ej. Colocación Neta" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Grupo Visual</label>
            <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={form.group} onChange={e => setForm({ ...form, group: e.target.value as IndicatorGroup })}>
              <option value="COLOCACION">Colocación (Rojo)</option>
              <option value="CAPTACION">Captación (Azul Cielo)</option>
              <option value="TOTAL_SAN">Total SAN (Magenta)</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1">Aplica A:</label>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={applyLoan} onChange={e => setApplyLoan(e.target.checked)} className="mr-2 text-purple-600 rounded focus:ring-purple-500" /> Asesor Préstamos
              </label>
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={applyAff} onChange={e => setApplyAff(e.target.checked)} className="mr-2 text-purple-600 rounded focus:ring-purple-500" /> Asesor Afiliación
              </label>
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={applyBranch} onChange={e => setApplyBranch(e.target.checked)} className="mr-2 text-purple-600 rounded focus:ring-purple-500" /> Sucursal
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Unidad</label>
            <select className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-mono" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value as any })}>
              <option value="$">Moneda ($)</option><option value="#">Conteo (#)</option><option value="%">Porcentaje (%)</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center justify-start pb-2 gap-4">
            <div className="flex items-center cursor-pointer" onClick={() => setForm({ ...form, isCumulative: !form.isCumulative })}>
              <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${form.isCumulative ? 'bg-green-400' : ''}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${form.isCumulative ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-2 text-xs font-semibold text-gray-600">Es acumulable?</span>
            </div>

            <div className="flex items-center cursor-pointer" onClick={() => setForm({ ...form, isAverage: !form.isAverage })}>
              <div className={`w-10 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${form.isAverage ? 'bg-blue-400' : ''}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${form.isAverage ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-2 text-xs font-semibold text-gray-600">Es Promedio? (No sumar)</span>
            </div>
          </div>

          <div className="md:col-span-8 flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium flex justify-center items-center">
              {loading ? 'Guardando...' : <><Save size={18} className="mr-1" /> Guardar</>}
            </button>
            {isEditing && (<button type="button" onClick={() => { setIsEditing(false); setForm({ name: '', appliesTo: AppliesTo.ALL, unit: '$', weightLoan: 0, weightAffiliation: 0, isCumulative: true, isAverage: false, roles: [], group: 'COLOCACION' }); setApplyLoan(true); setApplyAff(true); setApplyBranch(true); }} className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"><X size={18} /></button>)}
          </div>

          {(showLoanWeight || showAffiliationWeight) && (
            <div className="md:col-span-12 mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><Award className="w-4 h-4 mr-2 text-yellow-500" />Configuración de Pesos (Ranking)<span className="ml-2 text-xs font-normal text-gray-400">0 - 100 Puntos. Dejar en 0 para cálculo automático equitativo.</span></h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {showLoanWeight && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 mb-1">Puntos Asesor Préstamos</label>
                    <div className="flex items-center"><input type="number" min="0" max="100" className="w-full border border-blue-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500" value={form.weightLoan || 0} onChange={e => setForm({ ...form, weightLoan: Number(e.target.value) })} /> <span className="ml-2 text-xs text-blue-600 font-bold">pts</span></div>
                  </div>
                )}
                {showAffiliationWeight && (
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">Puntos Asesor Afiliación</label>
                    <div className="flex items-center"><input type="number" min="0" max="100" className="w-full border border-emerald-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500" value={form.weightAffiliation || 0} onChange={e => setForm({ ...form, weightAffiliation: Number(e.target.value) })} /> <span className="ml-2 text-xs text-emerald-600 font-bold">pts</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uniqueIndicators.map(ind => (
          <div key={ind.id} className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-all group hover:-translate-y-1 ${getGroupStyles(ind.group)}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center">{getUnitIcon(ind.unit)}</div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(ind)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                <button onClick={() => deleteIndicator(ind.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-bold text-gray-800 truncate" title={ind.name}>{ind.name}</h4>
              {ind.group && <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${getGroupBadgeColor(ind.group)}`}>{getGroupLabel(ind.group)}</span>}
            </div>

            {/* ROLE BADGES */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {isRoleActive(ind, Position.LOAN_ADVISOR) && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Préstamos</span>}
              {isRoleActive(ind, Position.AFFILIATION_ADVISOR) && <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Afiliación</span>}
              {isRoleActive(ind, 'BRANCH') && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">Sucursal</span>}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${ind.isCumulative !== false ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {ind.isCumulative !== false ? 'Acumulable' : 'No Acumulable'}
              </span>
              {ind.isAverage && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  <Divide size={10} className="mr-1" /> Promedio
                </span>
              )}
            </div>
            <div className="border-t border-gray-50 pt-2 flex justify-between text-[10px] text-gray-400">
              {isRoleActive(ind, Position.LOAN_ADVISOR) && (<div className="text-blue-600 font-medium"><span className="block text-gray-400 font-normal text-[9px]">Préstamos</span>{ind.weightLoan || 'Auto'} pts</div>)}
              {isRoleActive(ind, Position.AFFILIATION_ADVISOR) && (<div className="text-emerald-600 font-medium text-right"><span className="block text-gray-400 font-normal text-[9px]">Afiliación</span>{ind.weightAffiliation || 'Auto'} pts</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BudgetManager = () => {
  const { advisors, indicators, budgets, saveBudget } = useData();
  const [targetType, setTargetType] = useState<'BRANCH' | 'ADVISOR' | 'POSITION'>('BRANCH');
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<Position>(Position.LOAN_ADVISOR);
  const [periodType, setPeriodType] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number>(getWeekNumber(new Date()));

  // Propagation State
  const [propagationMode, setPropagationMode] = useState<'WEEK' | 'YEAR' | 'TRIMESTER'>('WEEK');

  // FILTERED INDICATORS BASED ON NEW ROLES LOGIC
  const relevantIndicators = useMemo(() => {
    return indicators.filter(ind => {
      // Priority check: Roles array
      if (ind.roles && ind.roles.length > 0) {
        if (targetType === 'BRANCH') return ind.roles.includes('BRANCH');
        if (targetType === 'POSITION') return ind.roles.includes(selectedPosition);
        if (targetType === 'ADVISOR') {
          const advisor = advisors.find(a => a.id === selectedAdvisor);
          if (advisor) return ind.roles.includes(advisor.position);
        }
        return false;
      }

      // Fallback Legacy Logic
      if (targetType === 'BRANCH') return ind.appliesTo === AppliesTo.BRANCH || ind.appliesTo === AppliesTo.ALL;
      let position: Position | undefined;
      if (targetType === 'ADVISOR') { const advisor = advisors.find(a => a.id === selectedAdvisor); if (advisor) position = advisor.position; } else { position = selectedPosition; }
      if (!position) return false;
      if (position === Position.LOAN_ADVISOR) return ind.appliesTo === AppliesTo.LOAN || ind.appliesTo === AppliesTo.ALL;
      return ind.appliesTo === AppliesTo.AFFILIATION || ind.appliesTo === AppliesTo.ALL;
    });
  }, [indicators, targetType, selectedPosition, selectedAdvisor, advisors]);

  // Group Indicators for display
  const groupedIndicators = useMemo(() => {
    const groups: { [key: string]: Indicator[] } = {
      'COLOCACION': [],
      'CAPTACION': [],
      'TOTAL_SAN': [],
      'OTHER': []
    };

    relevantIndicators.forEach(ind => {
      if (ind.group && groups[ind.group]) {
        groups[ind.group].push(ind);
      } else {
        groups['OTHER'].push(ind);
      }
    });
    return groups;
  }, [relevantIndicators]);

  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
  const getTargetId = () => { if (targetType === 'BRANCH') return 'BRANCH_GLOBAL'; if (targetType === 'POSITION') return `POS_${selectedPosition}`; return selectedAdvisor; };
  const getTargetName = () => { if (targetType === 'BRANCH') return 'Sucursal Global'; if (targetType === 'POSITION') return `Todos: ${selectedPosition}`; const adv = advisors.find(a => a.id === selectedAdvisor); return adv ? `${adv.name} (${adv.position})` : 'Desconocido'; }

  // Auto Calc Logic
  const cashInd = indicators.find(i => i.name.toLowerCase().trim().includes('efectivo') && !i.name.toLowerCase().includes('app'));
  const newInd = indicators.find(i => i.name.toLowerCase().trim().includes('nuevos'));
  const cashIndId = cashInd?.id;

  const branchCashBudgets = budgets.filter(b => b.targetId === 'BRANCH_GLOBAL' && b.indicatorId === cashIndId && b.year === selectedYear && b.week === selectedWeek);
  let totalBranchCash = 0;
  const weeklyBranch = branchCashBudgets.find(b => b.periodType === 'WEEKLY');
  if (weeklyBranch) totalBranchCash = weeklyBranch.amount;
  else { const dailies = branchCashBudgets.filter(b => b.periodType === 'DAILY'); totalBranchCash = dailies.reduce((sum, b) => sum + b.amount, 0); }
  const isBranchBudgetSet = totalBranchCash > 0;
  const showMissingBranchAlert = targetType !== 'BRANCH' && !isBranchBudgetSet;

  const getAutoValue = (ind: Indicator): number | null => {
    const isLoanAdvisorPos = selectedPosition === Position.LOAN_ADVISOR;
    const loanAdvisorsCount = advisors.filter(a => a.position === Position.LOAN_ADVISOR).length || 1;

    // 1. EFECTIVO POR PUESTO (Existing Logic)
    if (targetType === 'POSITION' && isLoanAdvisorPos && cashInd && ind.id === cashInd.id) {
      const share = Math.ceil(totalBranchCash / loanAdvisorsCount);
      if (periodType === 'DAILY') return Math.ceil(share / 7);
      return share;
    }

    // 2. CLIENTES NUEVOS (BRANCH OR POSITION) - 20% OF CASH
    if (newInd && ind.id === newInd.id && cashInd) {
      let baseAmount = 0;

      if (targetType === 'BRANCH') {
        baseAmount = totalBranchCash;
      } else if (targetType === 'POSITION' && isLoanAdvisorPos) {
        const positionCash = Math.ceil(totalBranchCash / loanAdvisorsCount);
        baseAmount = positionCash;
      }

      if (baseAmount > 0) {
        const newVal = Math.ceil(baseAmount * 0.20);
        if (periodType === 'DAILY') return Math.ceil(newVal / 7);
        return newVal;
      }
    }

    return null;
  };

  const handleBudgetSave = async (configs: any[], year: number, week: number) => {
    try {
      if (propagationMode === 'WEEK') {
        await saveBudget(configs, year, week);
      } else if (propagationMode === 'YEAR') {
        if (confirm(`¿Está seguro de replicar este presupuesto a las 52 semanas del año ${year}?`)) {
          // OPTIMIZATION: Build massive array and save ONCE to avoid 52 re-renders/fetches
          const allConfigs: any[] = [];

          for (let w = 1; w <= 52; w++) {
            const weekConfigs = configs.map(c => {
              // Must find existing ID to allow Upsert/Update logic in saveBudget
              // This relies on the current 'budgets' state having data for all weeks. 
              // Since we forced 0-9999 fetch, it should be fine.
              const existing = budgets.find(b =>
                b.year === year &&
                b.week === w &&
                b.targetId === c.targetId &&
                b.indicatorId === c.indicatorId &&
                b.periodType === c.periodType &&
                (c.periodType === 'WEEKLY' || b.dayOfWeek === c.dayOfWeek)
              );
              return { ...c, id: existing ? existing.id : '', week: w };
            });
            allConfigs.push(...weekConfigs);
          }
          await saveBudget(allConfigs, year, -1); // -1 or 0 as 'week' generic marker
        }
      } else if (propagationMode === 'TRIMESTER') {
        const currentQuarter = week <= 13 ? 1 : week <= 26 ? 2 : week <= 39 ? 3 : 4;
        const startWeek = (currentQuarter - 1) * 13 + 1;
        const endWeek = currentQuarter * 13;

        if (confirm(`¿Está seguro de replicar este presupuesto al Trimestre Q${currentQuarter} (Semanas ${startWeek}-${endWeek})?`)) {
          // OPTIMIZATION: Batch save
          const allConfigs: any[] = [];
          for (let w = startWeek; w <= endWeek; w++) {
            const weekConfigs = configs.map(c => {
              const existing = budgets.find(b =>
                b.year === year &&
                b.week === w &&
                b.targetId === c.targetId &&
                b.indicatorId === c.indicatorId &&
                b.periodType === c.periodType &&
                (c.periodType === 'WEEKLY' || b.dayOfWeek === c.dayOfWeek)
              );
              return { ...c, id: existing ? existing.id : '', week: w };
            });
            allConfigs.push(...weekConfigs);
          }
          await saveBudget(allConfigs, year, -1);
        }
      }
    } catch (error: any) {
      console.error('Error saving budget:', error);
      alert('Error al guardar presupuesto: ' + error.message);
    }
  };

  const renderGroup = (groupKey: string, title: string, colorClass: string, indicatorsList: Indicator[]) => {
    if (indicatorsList.length === 0) return null;
    return (
      <div className="mb-8 border-t pt-4">
        <h4 className={`text-lg font-bold mb-4 px-3 py-1 inline-block rounded-md ${colorClass}`}>{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {indicatorsList.map(ind => {
            const autoVal = getAutoValue(ind);
            const isLocked = autoVal !== null;
            return (
              <div key={ind.id} className={isLocked && showMissingBranchAlert ? 'opacity-50 pointer-events-none' : ''}>
                <BudgetCard
                  indicator={ind}
                  targetId={getTargetId()}
                  periodType={periodType}
                  budgets={budgets}
                  year={selectedYear}
                  week={selectedWeek}
                  onSave={handleBudgetSave}
                  forcedValue={autoVal}
                  isLocked={isLocked}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Configuración de Metas</h3>
            <p className="text-sm text-gray-500">Define los objetivos semanales o diarios.</p>
          </div>
          <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-lg text-sm flex items-center border border-orange-100"><Clock className="w-4 h-4 mr-2" /> Editando: <strong>Año {selectedYear} - Semana {selectedWeek}</strong></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-500">Año</label><input type="number" className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-500">Semana</label><select className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))}>{weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}</select></div>
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-500">Tipo de Objetivo</label><select className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={targetType} onChange={e => setTargetType(e.target.value as any)}><option value="BRANCH">Sucursal Global</option><option value="POSITION">Por Puesto (Masivo)</option><option value="ADVISOR">Por Colaborador (Individual)</option></select></div>
          {targetType === 'ADVISOR' && (<div className="space-y-1"><label className="text-xs font-semibold text-gray-500">Colaborador</label><select className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={selectedAdvisor} onChange={e => setSelectedAdvisor(e.target.value)}><option value="">-- Seleccionar --</option>{advisors.map(a => <option key={a.id} value={a.id}>{a.name} ({a.position})</option>)}</select></div>)}
          {targetType === 'POSITION' && (<div className="space-y-1"><label className="text-xs font-semibold text-gray-500">Puesto</label><select className="w-full border border-gray-200 bg-gray-50 p-2 rounded-lg focus:ring-2 focus:ring-bank-500 outline-none" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value as Position)}>{Object.values(Position).filter(p => p !== Position.BRANCH_MANAGER).map(p => (<option key={p} value={p}>{p}</option>))}</select></div>)}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col md:flex-row gap-8">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Frecuencia de Captura</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer"><input type="radio" name="freq" className="mr-2" checked={periodType === 'WEEKLY'} onChange={() => setPeriodType('WEEKLY')} /><span className="text-sm text-gray-700">Semanal (Meta Total)</span></label>
              <label className="flex items-center cursor-pointer"><input type="radio" name="freq" className="mr-2" checked={periodType === 'DAILY'} onChange={() => setPeriodType('DAILY')} /><span className="text-sm text-gray-700">Diaria (Lun - Dom)</span></label>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <label className="text-xs font-bold text-purple-700 mb-2 block flex items-center"><Copy size={12} className="mr-1" /> Propagar Presupuesto</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer" title="Solo guarda para la semana seleccionada"><input type="radio" name="prop" className="mr-2 text-purple-600 focus:ring-purple-500" checked={propagationMode === 'WEEK'} onChange={() => setPropagationMode('WEEK')} /><span className="text-sm text-gray-700">Solo esta semana</span></label>
              <label className="flex items-center cursor-pointer" title="Replica este valor a todas las semanas del trimestre actual"><input type="radio" name="prop" className="mr-2 text-purple-600 focus:ring-purple-500" checked={propagationMode === 'TRIMESTER'} onChange={() => setPropagationMode('TRIMESTER')} /><span className="text-sm text-gray-700">Todo el Trimestre</span></label>
              <label className="flex items-center cursor-pointer" title="Replica este valor a las 52 semanas del año"><input type="radio" name="prop" className="mr-2 text-purple-600 focus:ring-purple-500" checked={propagationMode === 'YEAR'} onChange={() => setPropagationMode('YEAR')} /><span className="text-sm text-gray-700">Todo el Año</span></label>
            </div>
          </div>
        </div>
      </div>
      {showMissingBranchAlert && (<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm animate-fade-in-up"><div className="flex"><div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" /></div><div className="ml-3"><p className="text-sm text-yellow-700 font-bold">Falta Presupuesto Global</p><p className="text-sm text-yellow-600 mt-1">Primero debe asignar el presupuesto de <strong>Efectivo</strong> en <strong>Sucursal Global</strong> para esta semana.</p></div></div></div>)}
      {(targetType === 'BRANCH' || (targetType === 'ADVISOR' && selectedAdvisor) || targetType === 'POSITION') && (
        <>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-800 text-sm mb-4 flex items-center"><Users size={16} className="mr-2" /> Asignando a: <strong>{getTargetName()}</strong></div>

          {/* GROUPED RENDER */}
          {renderGroup('COLOCACION', 'Colocación', 'bg-red-100 text-red-800', groupedIndicators['COLOCACION'])}
          {renderGroup('TOTAL_SAN', 'Total SAN', 'bg-fuchsia-100 text-fuchsia-800', groupedIndicators['TOTAL_SAN'])}
          {renderGroup('CAPTACION', 'Captación', 'bg-sky-100 text-sky-800', groupedIndicators['CAPTACION'])}
          {renderGroup('OTHER', 'Otros Indicadores', 'bg-gray-100 text-gray-800', groupedIndicators['OTHER'])}
        </>
      )}
    </div>
  );
};

interface BudgetCardProps { indicator: Indicator; targetId: string; periodType: 'WEEKLY' | 'DAILY'; budgets: any[]; year: number; week: number; onSave: (b: any[], year: number, week: number) => void; forcedValue?: number | null; isLocked?: boolean; }

const BudgetCard: React.FC<BudgetCardProps> = ({ indicator, targetId, periodType, budgets, year, week, onSave, forcedValue, isLocked }) => {
  const days = [{ label: 'Lun', val: 1 }, { label: 'Mar', val: 2 }, { label: 'Mié', val: 3 }, { label: 'Jue', val: 4 }, { label: 'Vie', val: 5 }, { label: 'Sáb', val: 6 }, { label: 'Dom', val: 0 }];
  const [weeklyVal, setWeeklyVal] = useState('');
  const [dailyVals, setDailyVals] = useState<{ [key: number]: string }>({});
  const [applyToAll, setApplyToAll] = useState(false);

  const isCumulative = indicator.isCumulative !== false;

  useEffect(() => {
    if (isLocked && forcedValue !== null && forcedValue !== undefined) {
      const valStr = forcedValue.toString();
      setWeeklyVal(valStr);
      const daily: any = {};
      days.forEach(d => daily[d.val] = valStr);
      setDailyVals(daily);
      let needsSave = false;
      if (periodType === 'WEEKLY') {
        const b = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'WEEKLY' && b.year === year && b.week === week);
        if (!b || b.amount !== forcedValue) needsSave = true;
      } else {
        days.forEach(d => {
          const b = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'DAILY' && b.dayOfWeek === d.val && b.year === year && b.week === week);
          if (!b || b.amount !== forcedValue) needsSave = true;
        });
      }
      if (needsSave) {
        const timer = setTimeout(() => {
          if (periodType === 'WEEKLY') { onSave([{ id: '', indicatorId: indicator.id, targetId, periodType: 'WEEKLY', year, week, amount: forcedValue }], year, week); }
          else {
            const configs: any[] = [];
            days.forEach(d => { configs.push({ id: '', indicatorId: indicator.id, targetId, periodType: 'DAILY', dayOfWeek: d.val, year, week, amount: forcedValue }); });
            onSave(configs, year, week);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
      return;
    }

    const bWeekly = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'WEEKLY' && b.year === year && b.week === week);
    setWeeklyVal(bWeekly ? bWeekly.amount.toString() : '');

    const vals: any = {};
    days.forEach(d => {
      const b = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'DAILY' && b.dayOfWeek === d.val && b.year === year && b.week === week);
      vals[d.val] = b ? b.amount.toString() : '';
    });
    setDailyVals(vals);

  }, [indicator.id, targetId, budgets, year, week, isLocked, forcedValue]);

  const handleWeeklyChange = (val: string) => {
    if (isLocked) return;
    const existing = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'WEEKLY' && b.year === year && b.week === week);
    onSave([{ id: existing ? existing.id : '', indicatorId: indicator.id, targetId, periodType: 'WEEKLY', year, week, amount: parseFloat(val) || 0 }], year, week);
  };

  const handleDailyChange = (dayIndex: number, val: string) => {
    if (isLocked) return;
    const newVals = { ...dailyVals };
    if (applyToAll) days.forEach(d => newVals[d.val] = val);
    else newVals[dayIndex] = val;
    setDailyVals(newVals);

    const configs: any[] = [];
    let calculatedWeekly = 0;

    const allValues = Object.entries(newVals).map(([d, v]) => parseFloat(v as string) || 0);

    if (isCumulative) {
      calculatedWeekly = allValues.reduce((a, b) => a + b, 0);
    } else {
      calculatedWeekly = Math.max(...allValues);
    }

    Object.entries(newVals).forEach(([d, v]) => {
      const numVal = parseFloat(v as string) || 0;
      const dayNum = parseInt(d);
      const existing = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'DAILY' && b.dayOfWeek === dayNum && b.year === year && b.week === week);
      configs.push({ id: existing ? existing.id : '', indicatorId: indicator.id, targetId, periodType: 'DAILY', dayOfWeek: dayNum, year, week, amount: numVal });
    });

    setWeeklyVal(calculatedWeekly.toString());
    const existingWeekly = budgets.find(b => b.indicatorId === indicator.id && b.targetId === targetId && b.periodType === 'WEEKLY' && b.year === year && b.week === week);
    configs.push({ id: existingWeekly ? existingWeekly.id : '', indicatorId: indicator.id, targetId, periodType: 'WEEKLY', year, week, amount: calculatedWeekly });

    onSave(configs, year, week);
  };

  const onWeeklyInputBlur = () => { handleWeeklyChange(weeklyVal); }
  const onDailyInputBlur = (dayIndex: number) => { handleDailyChange(dayIndex, dailyVals[dayIndex]); }

  const getBorderColor = () => {
    if (isLocked) return 'border-orange-200';
    if (indicator.group === 'COLOCACION') return 'border-red-200';
    if (indicator.group === 'CAPTACION') return 'border-sky-200';
    if (indicator.group === 'TOTAL_SAN') return 'border-fuchsia-200';
    return 'border-gray-100';
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 transition-shadow relative ${getBorderColor()} ${isLocked ? 'bg-orange-50/30' : 'hover:shadow-md'}`}>
      {isLocked && (<div className="absolute -top-3 right-4 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200 flex items-center shadow-sm"><Lock size={10} className="mr-1" /> AUTO</div>)}
      <div className="flex justify-between items-center mb-4"><h5 className="font-bold text-gray-800 flex items-center">{indicator.name}{isLocked && <Lock size={12} className="ml-2 text-gray-400" />}</h5><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{indicator.unit}</span></div>
      {periodType === 'WEEKLY' ? (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Meta Total</label>
          <input
            type="number"
            className={`w-full border rounded-lg p-2 focus:ring-2 outline-none font-medium ${isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-200 focus:ring-bank-500'}`}
            placeholder="0"
            value={weeklyVal}
            onChange={e => setWeeklyVal(e.target.value)}
            onBlur={onWeeklyInputBlur}
            disabled={isLocked}
          />
          {isLocked && <p className="text-[10px] text-orange-600 mt-1 italic">* Calculado automáticamente</p>}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center bg-gray-50 p-2 rounded-lg"><input type="checkbox" id={`all-${indicator.id}`} checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} disabled={isLocked} className="mr-2 rounded text-bank-600 focus:ring-bank-500" /><label htmlFor={`all-${indicator.id}`} className="text-xs text-gray-600 font-medium select-none cursor-pointer">Igualar todos los días</label></div>
          <div className="grid grid-cols-4 gap-2">
            {days.map(d => (
              <div key={d.val} className="col-span-1">
                <label className="block text-[10px] uppercase text-gray-400 text-center mb-0.5">{d.label}</label>
                <input
                  type="number"
                  className={`w-full border rounded p-1.5 text-sm text-center focus:ring-1 outline-none ${isLocked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:ring-bank-500'}`}
                  value={dailyVals[d.val] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setDailyVals(prev => ({ ...prev, [d.val]: val }));
                  }}
                  onBlur={() => onDailyInputBlur(d.val)}
                  disabled={isLocked}
                />
              </div>
            ))}
          </div>
          {!isCumulative && <p className="text-[10px] text-orange-600 mt-2 text-center bg-orange-50 p-1 rounded">No Acumulable: Meta semanal será el valor diario máximo.</p>}
        </div>
      )}
    </div>
  );
};

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
