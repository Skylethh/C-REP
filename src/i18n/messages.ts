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
  brand: 'C-REP',
    dashboard: {
      title: 'Dashboard',
      welcome: 'Hoş geldin'
    },
    charts: {
      projectsComparisonTitle: 'Projeler Karşılaştırma (Son 90 Gün, tCO2e)',
      yAxisTons: 'Y ekseni: tCO2e'
    },
    stats: {
      totalProjects: 'Toplam Projeler',
      last30Emissions: 'Son 30 Gün Emisyonu',
      recentEntries: 'Son Kayıtlar',
      totalEntries: 'Toplam Kayıtlar',
      activeCompany: 'Aktif Şirket'
    },
    cards: {
      myProjects: 'Projelerim',
      recentActivities: 'Son Aktiviteler',
      emissionAnalysis: 'Emisyon Analizi',
      emissionByType: 'Tür bazında CO2e',
  emissionByScope: 'Kapsam bazında CO2e',
      entries: 'Kayıtlar',
      export: 'CSV Dışa Aktar'
    },
    cta: {
      viewAll: 'Tümünü Gör',
      createProject: 'Proje Oluştur',
      apply: 'Uygula'
    },
    misc: {
      noData: 'Henüz veri yok',
      noEvidence: 'Bu kayda ekli kanıt yok.',
      unauthorized: 'Yetkisiz',
      notFound: 'Bulunamadı',
      exportHint: 'Filtreler dışa aktarmaya yansıtılır.'
    }
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
  brand: 'C-REP',
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome'
    },
    charts: {
      projectsComparisonTitle: 'Projects Comparison (Last 90 Days, tCO2e)',
      yAxisTons: 'Y axis: tCO2e'
    },
    stats: {
      totalProjects: 'Total Projects',
      last30Emissions: 'Last 30 Days Emissions',
      recentEntries: 'Recent Entries',
      totalEntries: 'Total Entries',
      activeCompany: 'Active Company'
    },
    cards: {
      myProjects: 'My Projects',
      recentActivities: 'Recent Activities',
      emissionAnalysis: 'Emission Analysis',
      emissionByType: 'CO2e by Type',
      emissionByScope: 'CO2e by Scope',
      entries: 'Entries',
      export: 'Export CSV'
    },
    cta: {
      viewAll: 'View All',
      createProject: 'Create Project',
      apply: 'Apply'
    },
    misc: {
      noData: 'No data yet',
      noEvidence: 'No evidence attached to this entry.',
      unauthorized: 'Unauthorized',
      notFound: 'Not found',
      exportHint: 'Filters apply to the export.'
    }
  }
} as const;

export type Locale = keyof typeof messages;


