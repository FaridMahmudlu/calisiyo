export const ALANLAR = {
  sayisal: {
    label: 'Sayısal',
    icon: '🔢',
    tyt: ['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
    ayt: ['Matematik', 'Fizik', 'Kimya', 'Biyoloji'],
  },
  esit_agirlik: {
    label: 'Eşit Ağırlık',
    icon: '⚖️',
    tyt: ['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
    ayt: ['Matematik', 'Edebiyat', 'Tarih', 'Coğrafya'],
  },
  sozel: {
    label: 'Sözel',
    icon: '📚',
    tyt: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
    ayt: ['Edebiyat', 'Tarih', 'Coğrafya', 'Felsefe'],
  },
  dil: {
    label: 'Dil',
    icon: '🌍',
    tyt: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'],
    ydt: ['İngilizce', 'Almanca', 'Fransızca'],
  },
};

export const SINAV_TURLERI = ['TYT', 'AYT', 'YDT'];

export const KITAP_TURLERI = [
  { value: 'soru_bankasi', label: 'Soru Bankası' },
  { value: 'konu_anlatim', label: 'Konu Anlatım' },
  { value: 'deneme', label: 'Deneme' },
  { value: 'yaprak_test', label: 'Yaprak Test' },
];

// Get the second exam type label based on alan
export function getSecondExamLabel(alan) {
  return alan === 'dil' ? 'YDT' : 'AYT';
}

// Check if user has AYT or YDT
export function getExamTabs(alan) {
  if (alan === 'dil') {
    return ['TYT', 'YDT'];
  }
  return ['TYT', 'AYT'];
}
