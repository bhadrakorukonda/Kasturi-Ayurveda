// Razorpay Checkout (hosted). Card/UPI details are entered inside
// Razorpay's own iframe and never touch our frontend or backend.
//
// The success callback here is NOT proof of payment: the booking is only
// confirmed by the backend when Razorpay's signed webhook arrives. The
// frontend just sends the patient to their booking page, which waits for
// that confirmation.

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayPaymentParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: () => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let loadPromise: Promise<void> | null = null;

const loadCheckoutScript = (): Promise<void> => {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      script.remove();
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
};

export const openRazorpayCheckout = async (
  payment: RazorpayPaymentParams,
  prefill: { name?: string; email?: string; contact?: string },
  callbacks: { onSuccess: () => void; onDismiss: () => void; onFailure: () => void }
): Promise<void> => {
  await loadCheckoutScript();
  if (!window.Razorpay) {
    throw new Error("Could not load the payment window. Please try again.");
  }

  const checkout = new window.Razorpay({
    key: payment.keyId,
    order_id: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    name: "Kasturi Ayurveda",
    description: "Consultation",
    prefill,
    theme: { color: "#6b9e78" },
    handler: callbacks.onSuccess,
    modal: { ondismiss: callbacks.onDismiss },
  });
  checkout.on("payment.failed", callbacks.onFailure);
  checkout.open();
};
