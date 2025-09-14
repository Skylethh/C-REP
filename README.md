C-rep

Modern, çok-tenant karbon emisyon raporlama uygulaması.

Kurulum

1) Bağımlılıklar:

```bash
npm install
```

2) .env.local:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SENTRY_DSN=
```

3) Supabase SQL: 001_init.sql → 010_storage_limits.sql sırasıyla çalıştırın.

4) Storage: `evidence` bucket (private) oluşturun.

Geliştirme

```bash
npm run dev
```

Testler

```bash
npm test
```

Dağıtım

Vercel + Supabase. Prod’da CSP sıkı, rate limit middleware aktif.


