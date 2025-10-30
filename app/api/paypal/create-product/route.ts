import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'sandbox' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST() {
  try {
    const accessToken = await getPayPalAccessToken();
    
    // Generate unique request ID to prevent duplicate requests
    const requestId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const productData = {
      name: "Joseph Weblet App Premium",
      description: "Premium subscription for Joseph Weblet App with unlimited conversations, priority support, and advanced AI features",
      type: "SERVICE",
      category: "SOFTWARE",
      image_url: "https://webletgpt.com/logo.png", // Replace with your actual logo URL
      home_url: "https://webletgpt.com" // Replace with your actual domain
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal API error: ${error}`);
    }

    const product = await response.json();

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        type: product.type,
        category: product.category,
        create_time: product.create_time,
        links: product.links
      }
    });

  } catch (error) {
    console.error('Error creating PayPal product:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
