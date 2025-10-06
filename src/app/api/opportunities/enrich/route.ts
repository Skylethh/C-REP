import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
	return NextResponse.json({ message: 'AI enrichment henüz etkin değil.' }, { status: 501 });
}
