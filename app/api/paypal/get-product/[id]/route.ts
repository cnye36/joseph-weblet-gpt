import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Failed to get token: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const accessToken = await getPayPalAccessToken();
    const productRes = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!productRes.ok) {
      return NextResponse.json({ success: false, error: await productRes.text() }, { status: productRes.status });
    }
    const product = await productRes.json();
    return NextResponse.json({ success: true, product });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}


