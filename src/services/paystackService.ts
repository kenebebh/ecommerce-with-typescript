import axios from "axios";
import crypto from "crypto";
import { nairaToKobo } from "../utils/nairaToKobo.ts";

// Paystack API Configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY as string;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  throw new Error(
    "PAYSTACK_SECRET_KEY is not defined in environment variables"
  );
}

// Paystack API headers
const headers = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

// TypeScript interfaces
interface InitializePaymentData {
  email: string;
  amount: number; // In kobo (smallest currency unit)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata?: Record<string, any>;
  };
}

interface RefundPaymentData {
  transaction: string | number; // Transaction ID or reference
  amount?: number; // Optional: partial refund amount in kobo
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}

class PaystackService {
  /**
   * Initialize payment transaction
   * Converts amount from Naira to Kobo (multiply by 100)
   */
  static async initializePayment(
    email: string,
    amount: number, // Amount in Naira
    reference: string,
    metadata?: Record<string, any>,
    callbackUrl?: string
  ): Promise<InitializePaymentResponse> {
    try {
      const data: InitializePaymentData = {
        email,
        amount: nairaToKobo(amount),
        reference,
        callback_url:
          callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          ...metadata,
          cancel_action: `${process.env.FRONTEND_URL}/orders`,
        },
      };

      const response = await axios.post<InitializePaymentResponse>(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        data,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Paystack Initialize Error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to initialize payment"
      );
    }
  }

  /**
   * Verify payment transaction
   */
  static async verifyPayment(
    reference: string
  ): Promise<VerifyPaymentResponse> {
    try {
      const response = await axios.get<VerifyPaymentResponse>(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "Paystack Verify Error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to verify payment"
      );
    }
  }

  /**
   * Verify webhook signature
   * IMPORTANT: This ensures the webhook actually came from Paystack
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(payload)
        .digest("hex");

      return hash === signature;
    } catch (error) {
      console.error("Webhook Signature Verification Error:", error);
      return false;
    }
  }

  /**
   * Get transaction details
   */
  static async getTransaction(transactionId: number): Promise<any> {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/${transactionId}`,
        { headers }
      );

      return response.data;
    } catch (error: any) {
      console.error("Paystack Get Transaction Error:", error.response?.data);
      throw new Error(
        error.response?.data?.message || "Failed to get transaction"
      );
    }
  }

  /**
   * List all transactions with filters
   */
  static async listTransactions(params?: {
    perPage?: number;
    page?: number;
    status?: "success" | "failed" | "abandoned";
    from?: string; // Date: YYYY-MM-DD
    to?: string; // Date: YYYY-MM-DD
    amount?: number;
  }): Promise<any> {
    try {
      const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction`, {
        headers,
        params,
      });

      return response.data;
    } catch (error: any) {
      console.error("Paystack List Transactions Error:", error.response?.data);
      throw new Error(
        error.response?.data?.message || "Failed to list transactions"
      );
    }
  }

  /**
   * Initiate refund
   * NOTE: Paystack doesn't have a direct refund API
   * You need to request refund through their dashboard or contact support
   * This is a placeholder for manual refund tracking
   */
  static async initiateRefund(data: RefundPaymentData): Promise<any> {
    try {
      // Paystack refund endpoint (if available in your region)
      // Note: As of 2024, automatic refunds may not be available in all regions
      const response = await axios.post(`${PAYSTACK_BASE_URL}/refund`, data, {
        headers,
      });

      return response.data;
    } catch (error: any) {
      console.error("Paystack Refund Error:", error.response?.data);

      // If automatic refund is not available, return info message
      if (error.response?.status === 404 || error.response?.status === 400) {
        throw new Error(
          "Automatic refunds not available. Please process refund manually through Paystack dashboard."
        );
      }

      throw new Error(
        error.response?.data?.message || "Failed to initiate refund"
      );
    }
  }

  /**
   * Convert amount from Naira to Kobo
   */
  static toKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert amount from Kobo to Naira
   */
  static toNaira(amount: number): number {
    return amount / 100;
  }

  /**
   * Get Paystack test cards for testing
   */
  static getTestCards() {
    return {
      success: {
        card: "5060666666666666666",
        cvv: "123",
        expiry: "12/26",
        pin: "1234",
        description: "Successful transaction",
      },
      insufficient_funds: {
        card: "5060000000000000004",
        cvv: "123",
        expiry: "12/26",
        pin: "1234",
        description: "Insufficient funds",
      },
      declined: {
        card: "5060000000000000021",
        cvv: "123",
        expiry: "12/26",
        pin: "1234",
        description: "Card declined",
      },
      timeout: {
        card: "5060000000000000013",
        cvv: "123",
        expiry: "12/26",
        pin: "1234",
        description: "Gateway timeout",
      },
    };
  }
}

export default PaystackService;
