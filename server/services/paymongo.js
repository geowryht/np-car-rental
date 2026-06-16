import crypto from "crypto";

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function auth() {
    return "Basic " + Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64");
}

export async function createPaymentLink({ amount, description, bookingId }) {
    const body = JSON.stringify({
        data: {
            attributes: {
                amount: Math.round(amount * 100),
                currency: "PHP",
                description,
                reference_number: bookingId,
            },
        },
    });

    const res = await fetch(`${PAYMONGO_BASE}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth() },
        body,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.errors?.[0]?.detail || "PayMongo link creation failed");

    return { linkId: data.data.id, checkoutUrl: data.data.attributes.checkout_url };
}

export function verifyWebhookSignature(rawBody, signature) {
    const expected = crypto
        .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET || "")
        .update(rawBody)
        .digest("base64");
    return signature === expected;
}

export async function refundPayment(paymentId, amount) {
    const body = JSON.stringify({
        data: {
            attributes: {
                payment_id: paymentId,
                amount: Math.round(amount * 100),
                reason: "requested_by_customer",
            },
        },
    });

    const res = await fetch(`${PAYMONGO_BASE}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth() },
        body,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.errors?.[0]?.detail || "Refund failed");
    return data.data;
}
