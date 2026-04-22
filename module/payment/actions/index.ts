"use server";
import { auth } from "@/lib/auth";
import { getRemainingLimits, updateUserTier } from "@/module/payment/lib/subscription";
import { headers } from "next/headers";
import { polar_client } from "@/module/payment/config/polar";
import prisma from "@/lib/db";

export interface SubscriptionData {
    user: {
        id: string;
        name: string;
        email: string;
        subscriptionTier: string;
        subscriptionStatus: string | null;
        polarCustomerId: string | null;
        polarSubscriptionId: string | null;
    } | null;
    limits: {
        tier: "FREE" | "PRO";
        repositories: {
            current: number;
            limit: number | null;
            canAdd: boolean;
        };
        reviews: {
            [repositoryId: string]: {
                current: number;
                limit: number | null;
                canAdd: boolean;
            };
        };
    } | null;
}

export async function getSubscriptionData(): Promise<SubscriptionData> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        return { user: null, limits: null };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user) {
        return { user: null, limits: null };
    }

    const limits = await getRemainingLimits(user.id);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            subscriptionTier: user.subscriptionTier || "FREE",
            subscriptionStatus: user.subscriptionStatus || null,
            polarCustomerId: user.polarCustomerId || null,
            polarSubscriptionId: user.polarSubscriptionId || null,
        },
        limits,
    };
}

export async function syncSubscriptionStatus() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session?.user) {
        throw new Error("Not authenticated");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user) {
        return { success: false, message: "User not found" };
    }

    let polarCustomerId = user.polarCustomerId;

    if (!polarCustomerId) {
        // Try to find the customer in Polar by email
        try {
            const customerResult = await polar_client.customers.list({
                email: user.email
            });
            if (customerResult.result?.items?.length) {
                polarCustomerId = customerResult.result.items[0].id;
                // Save it to the database
                await prisma.user.update({
                    where: { id: user.id },
                    data: { polarCustomerId }
                });
            } else {
                return { success: false, message: "No Polar customer found for this email" };
            }
        } catch (error) {
            console.error("Failed to fetch customer by email:", error);
            return { success: false, message: "Failed to fetch Polar customer" };
        }
    }

    try {
        // Fetch subscriptions from Polar
        const result = await polar_client.subscriptions.list({
            customerId: polarCustomerId,
        });

        const subscriptions = result.result?.items || [];

        // Find the most relevant subscription (active or most recent)
        const activeSub = subscriptions.find((sub: any) => sub.status === 'active');
        const latestSub = subscriptions[0]; // Assuming API returns sorted or we should sort

        if (activeSub) {
            await updateUserTier(user.id, "PRO", "ACTIVE", activeSub.id);
            return { success: true, status: "ACTIVE" };
        } else if (latestSub) {
            // If latest is canceled/expired
            const status = latestSub.status === 'canceled' ? 'CANCELED' : 'EXPIRED';
            // Only downgrade if we are sure it's not active
            if (latestSub.status !== 'active') {
                await updateUserTier(user.id, "FREE", status, latestSub.id);
            }
            return { success: true, status };
        }

        // Fallback: Check for one-time purchases (Orders)
        const ordersResult = await polar_client.orders.list({
            customerId: polarCustomerId,
        });
        
        const orders = ordersResult.result?.items || [];
        const paidOrder = orders.find((order: any) => order.status === 'paid' && order.product.id === "06d097cd-3695-4ea4-901a-49aea1bc9072");

        if (paidOrder) {
            // They made a one-time purchase of the Pro product!
            await updateUserTier(user.id, "PRO", "ACTIVE", paidOrder.id);
            return { success: true, status: "ACTIVE" };
        }

        return { success: true, status: "NO_SUBSCRIPTION" };
    } catch (error) {
        console.error("Failed to sync subscription:", error);
        return { success: false, error: "Failed to sync with Polar" };
    }
}