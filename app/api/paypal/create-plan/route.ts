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
      productId,
      planName = "Premium Plan",
      price = "25.00",
      currency = "USD",
      // Optional paid trial config
      trial = {
        enable: false,
        value: "5.00",
        currency_code: "USD",
        interval_unit: "DAY",
        interval_count: 1,
        total_cycles: 1,
      },
    } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();
    
    // Generate unique request ID to prevent duplicate requests
    const requestId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    type BillingCycle = {
      frequency: { interval_unit: string; interval_count: number };
      tenure_type: 'TRIAL' | 'REGULAR';
      sequence: number;
      total_cycles: number;
      pricing_scheme?: { fixed_price: { value: string; currency_code: string } };
    };

    const planData: {
      product_id: string;
      name: string;
      description: string;
      billing_cycles: BillingCycle[];
      payment_preferences: {
        auto_bill_outstanding: boolean;
        setup_fee_failure_action: string;
        payment_failure_threshold: number;
      };
      taxes: { percentage: string; inclusive: boolean };
    } = {
      product_id: productId,
      name: planName,
      description: `${planName} - Monthly subscription with unlimited access to premium features`,
      billing_cycles: [],
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

    // Optionally add a paid trial cycle first
    if (trial && trial.enable) {
      planData.billing_cycles.push({
        frequency: {
          interval_unit: trial.interval_unit || "DAY",
          interval_count: Number(trial.interval_count || 1),
        },
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: Number(trial.total_cycles || 1),
        pricing_scheme: {
          fixed_price: {
            value: String(trial.value || "5.00"),
            currency_code: trial.currency_code || "USD",
          },
        },
      });
    }

    // Regular recurring cycle
    planData.billing_cycles.push({
      frequency: {
        interval_unit: "MONTH",
        interval_count: 1,
      },
      tenure_type: "REGULAR",
      sequence: planData.billing_cycles.length + 1,
      total_cycles: 0, // 0 means unlimited cycles
      pricing_scheme: {
        fixed_price: {
          value: price,
          currency_code: currency,
        },
      },
    });

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal API error: ${error}`);
    }

    const plan = await response.json();

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        product_id: plan.product_id,
        name: plan.name,
        description: plan.description,
        status: plan.status,
        create_time: plan.create_time,
        billing_cycles: plan.billing_cycles,
        payment_preferences: plan.payment_preferences,
        links: plan.links
      }
    });

  } catch (error) {
    console.error('Error creating PayPal plan:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
