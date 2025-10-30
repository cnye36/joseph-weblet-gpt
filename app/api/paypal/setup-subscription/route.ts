import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live' 
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

export async function POST(request: NextRequest) {
  try {
    const { 
      productName = "Joseph Weblet App Premium",
      productDescription = "Premium subscription for Joseph Weblet App with unlimited conversations, priority support, and advanced AI features",
      planName = "Premium Plan",
      price = "25.00",
      currency = "USD",
      imageUrl = "https://webletgpt.com/logo.png",
      homeUrl = "https://webletgpt.com"
    } = await request.json();

    const accessToken = await getPayPalAccessToken();
    const results: { product?: { id: string; name: string; description: string; type: string; category: string; create_time: string }; plan?: { id: string; product_id: string; name: string; description: string; status: string; create_time: string; billing_cycles: { frequency: { interval_unit: string; interval_count: number }; tenure_type: string; sequence: number; total_cycles: number; pricing_scheme: { fixed_price: { value: string; currency_code: string } } }[]; payment_preferences: { auto_bill_outstanding: boolean; setup_fee_failure_action: string; payment_failure_threshold: number }; taxes: { percentage: string; inclusive: boolean } } } = {};

    // Step 1: Create Product
    console.log('Creating PayPal product...');
    const productRequestId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const productData = {
      name: productName,
      description: productDescription,
      type: "SERVICE",
      category: "SOFTWARE",
      image_url: imageUrl,
      home_url: homeUrl
    };

    const productResponse = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': productRequestId,
      },
      body: JSON.stringify(productData),
    });

    if (!productResponse.ok) {
      const error = await productResponse.text();
      throw new Error(`Failed to create product: ${error}`);
    }

    const product = await productResponse.json();
    results.product = {
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      category: product.category,
      create_time: product.create_time
    };

    console.log('Product created successfully:', product.id);

    // Step 2: Create Plan
    console.log('Creating PayPal plan...');
    const planRequestId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const planData = {
      product_id: product.id,
      name: planName,
      description: `${planName} - Monthly subscription with unlimited access to premium features`,
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 means unlimited cycles
          pricing_scheme: {
            fixed_price: {
              value: price,
              currency_code: currency
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: "0", // Set to 0 for now, can be configured later
        inclusive: false
      }
    };

    const planResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': planRequestId,
      },
      body: JSON.stringify(planData),
    });

    if (!planResponse.ok) {
      const error = await planResponse.text();
      throw new Error(`Failed to create plan: ${error}`);
    }

    const plan = await planResponse.json();
    results.plan = {
      id: plan.id,
      product_id: plan.product_id,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      create_time: plan.create_time,
      billing_cycles: plan.billing_cycles,
      payment_preferences: plan.payment_preferences,
      taxes: plan.taxes
    };

    console.log('Plan created successfully:', plan.id);

    // Step 3: Activate the plan
    console.log('Activating plan...');
    const activateResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${plan.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!activateResponse.ok) {
      const error = await activateResponse.text();
      console.warn(`Failed to activate plan: ${error}`);
    } else {
      console.log('Plan activated successfully');
      results.plan.status = 'ACTIVE';
    }

    return NextResponse.json({
      success: true,
      message: 'PayPal subscription setup completed successfully',
      data: results,
      environment_variables: {
        NEXT_PUBLIC_PAYPAL_PLAN_ID: plan.id,
        PAYPAL_PRODUCT_ID: product.id
      }
    });

  } catch (error) {
    console.error('Error setting up PayPal subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
