import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: headers["paypal-transmission-id"],
          transmission_time: headers["paypal-transmission-time"],
          cert_url: headers["paypal-cert-url"],
          auth_algo: headers["paypal-auth-algo"],
          transmission_sig: headers["paypal-transmission-sig"],
          webhook_id: webhookId,
          webhook_event: body,
        }),
      }
    );

    const result = await response.json();
    return result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headers = Object.fromEntries(req.headers.entries());

    // Verify webhook signature (recommended for production)
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (webhookId) {
      const isValid = await verifyWebhookSignature(webhookId, headers, body);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`PayPal Webhook: ${eventType}`, resource);

    const supabase = await createClient();

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        // Handle subscription activation
        await handleSubscriptionActivated(supabase, resource);
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        // Handle subscription cancellation
        await handleSubscriptionCancelled(supabase, resource);
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        // Handle subscription suspension
        await handleSubscriptionSuspended(supabase, resource);
        break;

      case "BILLING.SUBSCRIPTION.UPDATED":
        // Handle subscription updates
        await handleSubscriptionUpdated(supabase, resource);
        break;

      case "PAYMENT.SALE.COMPLETED":
        // Handle successful payment
        await handlePaymentCompleted(supabase, resource);
        break;

      case "PAYMENT.SALE.REFUNDED":
        // Handle refund
        await handlePaymentRefunded(supabase, resource);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionActivated(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Update subscription status to active
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      next_billing_date: (resource.billing_info as Record<string, unknown>)?.next_billing_time,
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", resource.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionCancelled(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Update subscription status to cancelled
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", resource.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionSuspended(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Update subscription status to suspended
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", resource.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handleSubscriptionUpdated(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Update subscription details
  const { error } = await supabase
    .from("subscriptions")
    .update({
      next_billing_date: (resource.billing_info as Record<string, unknown>)?.next_billing_time,
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_id", resource.id);

  if (error) {
    console.error("Error updating subscription:", error);
  }
}

async function handlePaymentCompleted(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Log payment in billing history (you'll need to create this table)
  // This is a placeholder for future implementation
  console.log("Payment completed:", resource);
}

async function handlePaymentRefunded(supabase: Awaited<ReturnType<typeof createClient>>, resource: Record<string, unknown>) {
  // Log refund in billing history
  console.log("Payment refunded:", resource);
}

