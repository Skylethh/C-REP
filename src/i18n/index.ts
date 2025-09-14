import { cookies } from 'next/headers';
import { messages, type Locale } from './messages';

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const locale = c.get('locale')?.value as Locale | undefined;
  return locale ?? 'tr';
}

export async function getMessages() {
  const locale = await getLocale();
  return { locale, dict: messages[locale] };
}

export async function t(path: string): Promise<string> {
  const { dict } = await getMessages();
  return path.split('.').reduce<any>((acc, key) => acc?.[key], dict) ?? path;
}


