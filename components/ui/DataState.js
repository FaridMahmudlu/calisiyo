import { AlertCircle, Inbox } from 'lucide-react';
import JourneyLoader from './JourneyLoader';

export default function DataState({ loading, error, empty, emptyTitle = 'Henüz veri yok', emptyText, children }) {
  if (loading) {
    return <JourneyLoader compact label="Veriler yükleniyor" />;
  }
  if (error) {
    return <div className="data-state data-state-error" role="alert"><AlertCircle size={28} /><strong>Bir sorun oluştu</strong><span>{error}</span></div>;
  }
  if (empty) {
    return <div className="data-state"><Inbox size={30} /><strong>{emptyTitle}</strong>{emptyText && <span>{emptyText}</span>}</div>;
  }
  return children;
}
