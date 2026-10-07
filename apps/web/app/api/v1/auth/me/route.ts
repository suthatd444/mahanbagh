import { NextRequest, NextResponse } from 'next/server';
import { serverApi } from '../../../../../lib/server-api';

export async function GET(req: NextRequest) {
  const backendResponse = await serverApi.get('/auth/me', {
    headers: { cookie: req.headers.get('cookie') || '' },
  });
  return NextResponse.json(backendResponse.data, { status: backendResponse.status });
}
