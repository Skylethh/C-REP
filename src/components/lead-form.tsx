"use client";

import { useState } from 'react';
import { Button } from '@/components/button';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function LeadForm() {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    if (status === 'success') {
        return (
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle size={32} className="text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Talebiniz Alındı!</h3>
                <p className="text-white/70">
                    En kısa sürede size dönüş yapacağız. Demo görüşmesi planlamak için sizinle iletişime geçeceğiz.
                </p>
            </div>
        );
    }

    return (
        <form
            onSubmit={async (e) => {
                e.preventDefault();
                setStatus('submitting');

                try {
                    const formData = new FormData(e.currentTarget);

                    const res = await fetch('/api/leads', {
                        method: 'POST',
                        body: formData,
                    });

                    if (res.ok || res.redirected) {
                        setStatus('success');
                    } else {
                        setStatus('error');
                    }
                } catch {
                    setStatus('error');
                }
            }}
            className="space-y-4"
        >
            {status === 'error' && (
                <div className="rounded-md border border-red-400/30 bg-red-950/30 text-red-200 px-4 py-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    Bir hata oluştu. Lütfen tekrar deneyin.
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm text-white/70 font-medium">Ad Soyad *</label>
                    <input
                        name="fullName"
                        type="text"
                        required
                        placeholder="Adınız Soyadınız"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all text-white placeholder-white/30"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-white/70 font-medium">E-posta *</label>
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="ornek@sirket.com"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all text-white placeholder-white/30"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm text-white/70 font-medium">Şirket Adı *</label>
                    <input
                        name="company"
                        type="text"
                        required
                        placeholder="Şirket adınız"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all text-white placeholder-white/30"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-white/70 font-medium">Pozisyon *</label>
                    <input
                        name="jobTitle"
                        type="text"
                        required
                        placeholder="Göreviniz"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all text-white placeholder-white/30"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm text-white/70 font-medium">Mesajınız (opsiyonel)</label>
                <textarea
                    name="message"
                    rows={3}
                    placeholder="Bize iletmek istediğiniz bir mesaj var mı?"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-leaf-400/50 focus:border-leaf-400/50 transition-all text-white placeholder-white/30 resize-none"
                />
            </div>
            <div className="pt-2">
                <Button
                    type="submit"
                    size="lg"
                    className="w-full btn-primary"
                    disabled={status === 'submitting'}
                >
                    <Send size={16} className="mr-2" />
                    {status === 'submitting' ? 'Gönderiliyor...' : 'Demo Talep Et'}
                </Button>
            </div>
            <p className="text-xs text-white/40 text-center">
                Bilgileriniz gizli tutulur ve yalnızca demo planlamak için kullanılır.
            </p>
        </form>
    );
}
