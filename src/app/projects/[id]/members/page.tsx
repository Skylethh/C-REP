import { createClient } from '@/lib/server';
import { addMember, removeMember } from './server';
import InviteForm from './InviteForm';

export default async function MembersPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, role')
    .eq('project_id', params.id);

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-900/80 to-ocean-900/80 border border-white/10 shadow-lg mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 backdrop-blur-sm"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        
        <div className="relative p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold highlight-text">Proje Üyeleri</h1>
          </div>
          
          <p className="text-white/70 ml-11 mt-2">
            Proje ekibini yönetin, yeni üyeler ekleyin ve rolleri düzenleyin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite Section */}
        <div className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Davet Gönder</h2>
          </div>
          
          <InviteForm projectId={params.id} />
        </div>

        {/* Add Member Section */}
        <div className="glass p-6 rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Doğrudan Ekle</h2>
          </div>

          <form action={addMember.bind(null, params.id)} className="space-y-4">
            <div className="space-y-1">
              <label className="form-label flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                E-posta
              </label>
              <input 
                name="email" 
                type="email" 
                placeholder="kullanici@ornek.com" 
                className="form-input" 
                required
              />
            </div>

            <div className="space-y-1">
              <label className="form-label flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Rol
              </label>
              <select name="role" className="form-input">
                <option value="viewer">Görüntüleyici (Viewer)</option>
                <option value="editor">Editör (Editor)</option>
              </select>
            </div>

            <button className="btn-primary w-full px-6 py-2.5 rounded-lg flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Üye Ekle
            </button>
          </form>
        </div>
      </div>

      {/* Members List */}
      <div className="glass p-6 rounded-xl border border-white/10 mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-md bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Mevcut Üyeler</h2>
        </div>

        {members && members.length > 0 ? (
          <div className="space-y-3">
            {members.map((m) => {
              const roleColor = m.role === 'owner' 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : m.role === 'editor'
                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                : 'bg-gray-500/15 text-gray-300 border-gray-500/30';
              
              const roleText = m.role === 'owner' 
                ? 'Proje Sahibi'
                : m.role === 'editor'
                ? 'Editör'
                : 'Görüntüleyici';

              return (
                <div key={m.user_id} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-br from-leaf-500/20 to-ocean-500/20 border border-white/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-leaf-400">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">{m.user_id}</div>
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColor}`}>
                        {roleText}
                      </span>
                    </div>
                  </div>
                  
                  {m.role !== 'owner' && (
                    <form action={removeMember.bind(null, params.id)}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="text-red-400 hover:text-red-300 p-2 rounded-md hover:bg-red-500/10 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gradient-to-br from-leaf-500/10 to-ocean-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/40">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2 text-white/80">Henüz üye yok</h3>
            <p className="text-white/60">Bu projede henüz üye bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}


