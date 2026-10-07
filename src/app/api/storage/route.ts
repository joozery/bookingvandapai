import { NextResponse } from 'next/server';
import { deleteFromR2, downloadFromR2, uploadToR2 } from '@/lib/r2';

export async function POST(request: Request) {
  const form = await request.formData();
  const path = String(form.get('path') || '');
  const file = form.get('file');
  if (!path || !(file instanceof Blob)) return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  await uploadToR2(path, Buffer.from(await file.arrayBuffer()), file.type || undefined);
  return NextResponse.json({ path });
}

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  const result = await downloadFromR2(path);
  const body = result.Body ? await result.Body.transformToByteArray() : new Uint8Array();
  return new Response(Buffer.from(body), { headers: { 'content-type': result.ContentType || 'application/octet-stream' } });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  for (const path of body.paths || []) await deleteFromR2(String(path));
  return NextResponse.json({ ok: true });
}
