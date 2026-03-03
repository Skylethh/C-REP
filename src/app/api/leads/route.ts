import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const fullName = String(formData.get('fullName') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const company = String(formData.get('company') || '').trim();
        const jobTitle = String(formData.get('jobTitle') || '').trim();
        const message = String(formData.get('message') || '').trim();

        // Basic validation
        if (!fullName || !email || !company || !jobTitle) {
            return NextResponse.json(
                { error: 'Lütfen tüm zorunlu alanları doldurun.' },
                { status: 400 }
            );
        }

        // Save to Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error: dbError } = await supabase.from('leads').insert({
            full_name: fullName,
            email,
            company,
            job_title: jobTitle,
            message: message || null,
            status: 'new',
        });

        if (dbError) {
            console.error('Lead insert error:', dbError);
        }

        // Send email notification to C-REP team
        try {
            await resend.emails.send({
                from: 'C-REP Demo Talep <onboarding@resend.dev>',
                to: 'crep.iletisim@gmail.com',
                subject: `🟢 Yeni Demo Talebi: ${company} — ${fullName}`,
                html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fffe; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px 32px;">
              <h1 style="color: white; margin: 0; font-size: 22px;">🌿 C-REP — Yeni Demo Talebi</h1>
            </div>
            <div style="padding: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 140px;">Ad Soyad</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">E-posta</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${email}" style="color: #059669;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Şirket</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${company}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Pozisyon</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${jobTitle}</td>
                </tr>
                ${message ? `
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #374151; vertical-align: top;">Mesaj</td>
                  <td style="padding: 12px 0; color: #111827;">${message}</td>
                </tr>
                ` : ''}
              </table>
              <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #059669;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  Bu talep C-REP landing page'indeki demo formundan gönderildi. En kısa sürede iletişime geçin.
                </p>
              </div>
            </div>
            <div style="padding: 16px 32px; background: #f3f4f6; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">C-REP Karbon Emisyon Yönetim Platformu</p>
            </div>
          </div>
        `,
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            // Don't fail the request if email fails — lead is already saved in DB
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Lead API error:', err);
        return NextResponse.json(
            { error: 'Bir hata oluştu.' },
            { status: 500 }
        );
    }
}
