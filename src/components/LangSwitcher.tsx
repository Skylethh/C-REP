"use client";
import { switchLocale } from '@/app/i18n/actions';

export function LangSwitcher() {
  return (
    <form action={switchLocale}>
      <select
        name="locale"
        className="bg-transparent border border-white/20 rounded-md px-2 py-1 text-sm"
        defaultValue="tr"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
    </form>
  );
}


