Using custom PDF fonts (Turkish glyph support)

By default, the PDF uses the built-in font to avoid remote fetch issues in serverless/locked-down networks. To enable a Turkish-capable font like DejaVu Sans, add font files locally and set env vars:

1) Place fonts under public/fonts/ (recommended):
   - public/fonts/DejaVuSans.ttf
   - public/fonts/DejaVuSans-Bold.ttf

2) Set environment variables in .env.local:
   REPORT_PDF_CUSTOM_FONT=true
   REPORT_PDF_FONT_PATH=/public/fonts/DejaVuSans.ttf
   REPORT_PDF_FONT_BOLD_PATH=/public/fonts/DejaVuSans-Bold.ttf

Notes:
- Provide TTF/OTF file paths accessible to the Next.js runtime (absolute path or from project root). If using /public, ensure the path starts with /public/ for server-side file resolution.
- If fonts are not found or paths are wrong, the code will silently fall back to the default font (text still renders but glyph coverage may be limited).
- This approach avoids "Unknown font format" errors from remote CDNs and keeps rendering deterministic.

Windows: No-commands fallback (easiest)

If you can't run PowerShell or download fonts:

- The server tries to use installed Windows fonts automatically (Segoe UI / Arial) under C:\\Windows\\Fonts.
- Just restart the dev server and try generating a PDF. In most setups, this is enough for correct Turkish glyphs.

Manual copy via File Explorer (optional):

1) Create the folder public\\fonts in your project (CarbonProject\\public\\fonts).
2) Open C:\\Windows\\Fonts in File Explorer.
3) Copy these files if present: segoeui.ttf (Regular) and segoeuib.ttf (Bold).
4) Paste them into public\\fonts.
5) Create .env.local with:

   REPORT_PDF_CUSTOM_FONT=true
   REPORT_PDF_FONT_PATH=/public/fonts/segoeui.ttf
   REPORT_PDF_FONT_BOLD_PATH=/public/fonts/segoeuib.ttf

6) Restart the dev server and regenerate the PDF.
