#!/usr/bin/env node

/**
 * PayPal Subscription Setup Script
 * 
 * This script creates a PayPal product and subscription plan programmatically.
 * Run this script after setting up your PayPal credentials in .env.local
 * 
 * Usage: node scripts/setup-paypal.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const PAYPAL_BASE_URL = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local');
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

async function createProduct(accessToken) {
  console.log('🛍️  Creating PayPal product...');
  
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
    throw new Error(`Failed to create product: ${error}`);
  }

  const product = await response.json();
  console.log('✅ Product created successfully:', product.id);
  return product;
}

async function createPlan(accessToken, productId) {
  console.log('📋 Creating PayPal subscription plan...');
  
  const requestId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const planData = {
    product_id: productId,
    name: "Premium Plan",
    description: "Premium Plan - Monthly subscription with unlimited access to premium features",
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
            value: "25.00",
            currency_code: "USD"
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
    throw new Error(`Failed to create plan: ${error}`);
  }

  const plan = await response.json();
  console.log('✅ Plan created successfully:', plan.id);
  return plan;
}

async function activatePlan(accessToken, planId) {
  console.log('🚀 Activating subscription plan...');
  
  // First, check the current status of the plan
  const getResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${planId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (getResponse.ok) {
    const planDetails = await getResponse.json();
    console.log(`📊 Plan current status: ${planDetails.status}`);
    
    if (planDetails.status === 'ACTIVE') {
      console.log('✅ Plan is already active');
      return;
    }
  }

  // Try to activate the plan
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans/${planId}/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.text();
    console.warn(`⚠️  Failed to activate plan: ${error}`);
    console.log('ℹ️  Plan may already be active or in a different status');
    return; // Don't throw error, just warn
  }

  console.log('✅ Plan activated successfully');
}

async function main() {
  try {
    console.log('🚀 Starting PayPal subscription setup...\n');
    
    // Check environment variables
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      console.error('❌ Error: PayPal credentials not found in .env.local');
      console.log('\nPlease add the following to your .env.local file:');
      console.log('PAYPAL_CLIENT_ID=your_client_id');
      console.log('PAYPAL_CLIENT_SECRET=your_client_secret');
      console.log('PAYPAL_MODE=sandbox');
      process.exit(1);
    }

    console.log(`🔧 Using PayPal ${process.env.PAYPAL_MODE || 'sandbox'} mode\n`);

    // Get access token
    console.log('🔑 Getting PayPal access token...');
    const accessToken = await getPayPalAccessToken();
    console.log('✅ Access token obtained\n');

    // Create product
    const product = await createProduct(accessToken);
    console.log('');

    // Create plan
    const plan = await createPlan(accessToken, product.id);
    console.log('');

    // Activate plan
    await activatePlan(accessToken, plan.id);
    console.log('');

    // Display results
    console.log('🎉 PayPal subscription setup completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Plan ID: ${plan.id}`);
    console.log(`   Plan Name: ${plan.name}`);
    console.log(`   Price: $25.00/month`);
    console.log(`   Status: ${plan.status}\n`);

    console.log('🔧 Next steps:');
    console.log('1. Add these environment variables to your .env.local:');
    console.log(`   NEXT_PUBLIC_PAYPAL_PLAN_ID=${plan.id}`);
    console.log(`   PAYPAL_PRODUCT_ID=${product.id}`);
    console.log('');
    console.log('2. Update your domain URLs in the product (if needed):');
    console.log('   - image_url: https://webletgpt.com/logo.png');
    console.log('   - home_url: https://webletgpt.com');
    console.log('');
    console.log('3. Test your subscription flow in your app!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();


