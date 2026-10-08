'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban } from 'lucide-react';

const formatDate = (value) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));

export default function BlockedUsersSection({ supabase }) {
  const [blocked, setBlocked] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => supabase.rpc('list_my_blocked_users').then(({ data, error: loadError }) => {
    if (loadError) setError('Engellenen kullanıcılar yüklenemedi.');
    else setBlocked(data || []);
  }), [supabase]);

  useEffect(() => { load(); }, [load]);

  const unblock = async (person) => {
    setBusy(person.userId);
    const { error: unblockError } = await supabase.rpc('unblock_user', { p_user_id: person.userId });
    setBusy('');
    if (unblockError) return setError('Engel kaldırılamadı. Lütfen tekrar dene.');
    setBlocked((current) => current.filter((item) => item.userId !== person.userId));
  };

  return (
    <section className="settings-section study-panel" id="engellenenler">
      <div className="settings-intro"><Ban size={20} /><div><h2>Engellenen kullanıcılar</h2><p>Engellediğin kişiler sana arkadaşlık isteği gönderemez ve sınıf mesajları senden gizlenir.</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {blocked.length === 0 ? <p className="settings-warning">Engellediğin bir kullanıcı yok.</p> : (
        <div className="blocked-user-list">
          {blocked.map((person) => (
            <div key={person.userId}>
              <span><strong>{person.name}</strong><small>{person.username ? `@${person.username} · ` : ''}{formatDate(person.blockedAt)} tarihinde engellendi</small></span>
              <button className="study-button" onClick={() => unblock(person)} disabled={busy === person.userId}>{busy === person.userId ? 'Kaldırılıyor…' : 'Engeli kaldır'}</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
