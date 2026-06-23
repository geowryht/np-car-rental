import crypto from "crypto";

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function auth() {
    return "Basic " + Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64");
}

export async function createPaymentLink({ amount, description, bookingId }) {
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const body = JSON.stringify({
        data: {
            attributes: {
                amount: Math.round(amount * 100),
                currency: "PHP",
                description,
                reference_number: bookingId,
                redirect: {
                    success: `${clientUrl}/payment/callback?bookingId=${bookingId}`,
                    failed: `${clientUrl}/payment/callback?bookingId=${bookingId}&status=failed`,
                },
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

export async function getLinkStatus(linkId) {
    const res = await fetch(`${PAYMONGO_BASE}/links/${linkId}`, {
        headers: { Authorization: auth() },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.errors?.[0]?.detail || "Failed to fetch link status");

    const attrs = data.data.attributes;
    const payments = attrs.payments || [];
    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

    return {
        status: attrs.status,
        paid: attrs.status === "paid" || (lastPayment?.data?.attributes?.status === "paid"),
        paymentId: lastPayment?.data?.id || null,
        paymentMethod: lastPayment?.data?.attributes?.source?.type || null,
        amount: attrs.amount / 100,
    };
}
