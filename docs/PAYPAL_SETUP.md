# PayPal Integration Setup Guide

Complete step-by-step guide to setting up PayPal for subscription billing.

## Prerequisites

- PayPal Developer Account
- Supabase project configured
- App deployed (for production webhooks)

## Part 1: Create PayPal Developer Account

### 1. Sign Up
1. Go to https://developer.paypal.com
2. Click "Sign Up" or "Log In" if you have a personal PayPal account
3. Accept the developer terms

### 2. Access Dashboard
1. Navigate to https://developer.paypal.com/dashboard/
2. You'll see your apps and sandbox accounts

## Part 2: Create PayPal App

### 1. Create REST API App

1. In the Dashboard, click **"Create App"**
2. Fill in the details:
   - **App Name**: "Joseph Weblet App" (or your app name)
   - **App Type**: "Merchant"
3. Click **"Create App"**

### 2. Get Credentials

#### Sandbox Credentials
1. In your app dashboard, you'll see:
   - **Client ID** (starts with `A...`)
   - **Secret** (click "Show" to reveal)
2. Copy both values

#### Production Credentials
1. Toggle to **"Live"** mode at the top
2. You'll need to complete business verification first
3. Once verified, you'll get production credentials

### 3. Configure App Settings

1. Scroll down to **"App settings"**
2. Enable features:
   - ✅ Accept payments
   - ✅ Subscriptions
3. Add **Return URL**: `https://your-domain.com` (for production)
4. Add **Cancel URL**: `https://your-domain.com/cancelled`
5. Click **"Save"**

## Part 3: Create Subscription Plan

### 1. Navigate to Products

1. In PayPal Dashboard, go to **"Products" > "Subscriptions"**
2. Click **"Create Plan"**

### 2. Configure Plan Details

#### Basic Information
- **Product Name**: "Premium Plan"
- **Product Type**: "Digital Goods" or "Service"
- **Category**: Choose appropriate category

#### Pricing
- **Billing Cycle**: "Monthly" (or your preference)
- **Price**: $25.00 (or your price)
- **Currency**: USD (or your currency)

#### Setup Options
- **Payment Preferences**:
  - Auto billing: "Outstanding balance"
  - Payment failure: Retry up to 3 times
  
- **Plan Details**:
  - **Payment definition**:
    - Frequency: 1 Month
    - Cycles: 0 (unlimited)
  
- **Trial Period** (optional):
  - Duration: 7 days
  - Price: $0.00

### 3. Save and Activate

1. Review all settings
2. Click **"Save"**
3. **Activate the plan**
4. Copy the **Plan ID** (starts with `P-...`)

### 4. Create Plans for Both Modes

You need to create the plan twice:
1. Once in **Sandbox** mode (for testing)
2. Once in **Live** mode (for production)

Each will have a different Plan ID.

## Part 4: Configure Environment Variables

### Development (.env.local)

```bash
# Sandbox credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=Axxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYPAL_PLAN_ID=P-xxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=sandbox
```

### Production

```bash
# Live credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=Axxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=ELxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_PAYPAL_PLAN_ID=P-xxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=live
```

## Part 5: Test in Sandbox

### 1. Create Sandbox Test Accounts

1. In PayPal Dashboard, go to **"Sandbox" > "Accounts"**
2. Click **"Create Account"**

#### Create Buyer Account
- **Account Type**: Personal
- **Email**: auto-generated or custom
- **Password**: Choose a password
- **PayPal Balance**: $1000 (or any amount)

#### Create Business Account (if needed)
- **Account Type**: Business
- **Email**: auto-generated or custom
- **PayPal Balance**: $0

### 2. Test Subscription Flow

1. Start your dev server: `pnpm dev`
2. Login to your app
3. Go to Settings > Billing
4. Click "Subscribe Now"
5. Login with **sandbox buyer credentials**
6. Complete payment
7. Verify subscription in Supabase `subscriptions` table
8. Check PayPal sandbox dashboard for transaction

### 3. Test Cancellation

1. In Settings > Billing, click "Cancel Subscription"
2. Confirm cancellation
3. Verify status updated in Supabase
4. Check PayPal sandbox for cancelled status

## Part 6: Set Up Webhooks (Production)

### 1. Create Webhook

1. In PayPal Dashboard, go to **"Developer" > "Webhooks"**
2. Click **"Create Webhook"**
3. Configure:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/paypal`
   - **Event types**: Select these events:
     ```
     BILLING.SUBSCRIPTION.ACTIVATED
     BILLING.SUBSCRIPTION.CANCELLED
     BILLING.SUBSCRIPTION.SUSPENDED
     BILLING.SUBSCRIPTION.UPDATED
     PAYMENT.SALE.COMPLETED
     PAYMENT.SALE.REFUNDED
     ```
4. Click **"Save"**

### 2. Get Webhook ID

1. After creating webhook, you'll see the **Webhook ID**
2. Copy this ID
3. Add to your `.env`:
   ```bash
   PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxx
   ```

### 3. Test Webhooks

Use PayPal's webhook simulator:
1. Go to **"Webhooks" > Your webhook > "Simulator"**
2. Select an event type
3. Click "Send Test"
4. Check your API logs for the webhook

## Part 7: Go Live

### Checklist

- [ ] Complete PayPal business verification
- [ ] Create production subscription plan
- [ ] Get production credentials
- [ ] Set up production webhook
- [ ] Update environment variables
- [ ] Test with small amount first
- [ ] Monitor transactions closely

### Update Configuration

```bash
# .env.production or production environment
NEXT_PUBLIC_PAYPAL_CLIENT_ID=<live-client-id>
PAYPAL_CLIENT_SECRET=<live-secret>
NEXT_PUBLIC_PAYPAL_PLAN_ID=<live-plan-id>
PAYPAL_MODE=live
PAYPAL_WEBHOOK_ID=<webhook-id>
```

## Part 8: Monitoring

### PayPal Dashboard

Monitor in PayPal:
1. **Transactions**: Track all payments
2. **Subscriptions**: View active subscriptions
3. **Disputes**: Handle any issues
4. **Reports**: Download financial reports

### Your Database

Monitor in Supabase:
1. Check `subscriptions` table for status
2. Review webhook logs
3. Monitor API errors
4. Track cancellations

### Set Up Alerts

Consider setting up:
- Email notifications for new subscriptions
- Alerts for failed payments
- Slack notifications for cancellations
- Dashboard for subscription metrics

## Troubleshooting

### Common Issues

#### PayPal button not showing
- Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set correctly
- Verify it's the correct mode (sandbox/live)
- Check browser console for errors
- Ensure PayPal SDK script loads

#### Subscription not saving
- Check Supabase logs
- Verify RLS policies allow insert
- Check if user is authenticated
- Verify Plan ID is correct

#### Payment fails in sandbox
- Check test account has sufficient balance
- Verify subscription plan is active
- Check plan ID matches environment
- Review PayPal sandbox logs

#### Webhook not received
- Verify webhook URL is accessible publicly
- Check webhook ID is correct
- Ensure events are selected correctly
- Review webhook signature verification

### Testing Webhook Locally

Use ngrok or similar:
```bash
ngrok http 3000
# Use ngrok URL for webhook: https://xxx.ngrok.io/api/webhooks/paypal
```

## Security Best Practices

### Credentials
- ✅ Never commit secrets to git
- ✅ Use environment variables
- ✅ Different credentials for dev/prod
- ✅ Rotate secrets regularly

### API Security
- ✅ Verify webhook signatures
- ✅ Validate all inputs
- ✅ Check user authentication
- ✅ Log all transactions
- ✅ Monitor for unusual activity

### Data Protection
- ✅ Store minimal payment data
- ✅ Use Supabase RLS
- ✅ Encrypt sensitive data
- ✅ Regular backups

## Advanced Configuration

### Multiple Plans

To offer multiple subscription tiers:

1. Create multiple plans in PayPal
2. Store plan IDs in your database or config
3. Update `BillingSettings.tsx` to show multiple options
4. Pass plan ID dynamically to PayPal button

Example:
```tsx
createSubscription: function (data, actions) {
  return actions.subscription.create({
    plan_id: selectedPlanId, // Dynamic plan ID
  });
}
```

### Trial Periods

When creating a plan:
1. Enable trial period
2. Set trial duration (e.g., 7 days)
3. Set trial price ($0 for free trial)
4. PayPal handles automatic conversion

### Promotional Codes

PayPal doesn't directly support promo codes in subscriptions. Options:
1. Create discounted plans
2. Handle discounts in your app logic
3. Use PayPal's coupon API (business accounts)

### Annual Billing

Create separate annual plan:
1. Billing cycle: Yearly
2. Price: $99/year (discounted from $120)
3. Different Plan ID
4. Add toggle in your UI

## Resources

### Documentation
- [PayPal Developer Docs](https://developer.paypal.com/docs/api/overview/)
- [Subscriptions API](https://developer.paypal.com/docs/api/subscriptions/v1/)
- [Webhooks Guide](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)

### Testing
- [Sandbox Testing Guide](https://developer.paypal.com/docs/api-basics/sandbox/)
- [Test Cards](https://developer.paypal.com/docs/checkout/advanced/test/)

### Support
- [PayPal Developer Community](https://www.paypal-community.com/t5/Developer/ct-p/developer)
- [Contact PayPal Support](https://www.paypal.com/us/smarthelp/contact-us)

## Need Help?

If you encounter issues:
1. Check this guide thoroughly
2. Review PayPal documentation
3. Check Supabase logs
4. Review browser console
5. Test in sandbox first
6. Contact PayPal support if needed

---

## Quick Reference

### Sandbox URLs
- Dashboard: https://developer.paypal.com/dashboard/
- Test Accounts: https://developer.paypal.com/dashboard/accounts
- Webhooks: https://developer.paypal.com/dashboard/webhooks

### Production URLs
- PayPal: https://www.paypal.com
- Business Dashboard: https://www.paypal.com/businesswallet/

### API Endpoints
- Sandbox: `https://api-m.sandbox.paypal.com`
- Production: `https://api-m.paypal.com`

---

You're all set! Follow this guide step by step and you'll have PayPal subscriptions working smoothly. 🎉

