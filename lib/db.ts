import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

// Use WebSocket for Neon in Node.js (not needed in Edge)
neonConfig.webSocketConstructor = ws;

const createPrismaClient = () => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is not set");
    }

    // Strip pgbouncer param — Neon's WS driver handles pooling itself
    const url = new URL(connectionString);
    url.searchParams.delete("pgbouncer");

    const adapter = new PrismaNeon({ connectionString: url.toString() });

    return new PrismaClient({
        adapter,
        log:
            process.env.NODE_ENV === "development"
                ? ["error", "warn"]
                : ["error"],
    });
};

declare const globalThis: {
    prismaGlobal: ReturnType<typeof createPrismaClient>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export default prisma;