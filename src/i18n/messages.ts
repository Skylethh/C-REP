export const messages = {
  tr: {
    nav: {
      dashboard: 'Kontrol Paneli',
      reports: 'Raporlar',
      opportunities: 'Fırsatlar'
    },
    auth: {
      login: 'Giriş Yap',
      signup: 'Kayıt Ol',
      signout: 'Çıkış Yap'
    },
    brand: 'C-rep'
  },
  en: {
    nav: {
      dashboard: 'Dashboard',
      reports: 'Reports',
      opportunities: 'Opportunities'
    },
    auth: {
      login: 'Login',
      signup: 'Sign Up',
      signout: 'Sign Out'
    },
    brand: 'C-rep'
  }
} as const;

export type Locale = keyof typeof messages;


