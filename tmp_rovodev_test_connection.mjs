import { PrismaClient } from "./lib/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
    console.log("Testing database connection...");
    const users = await prisma.user.findMany();
    console.log(`✓ Success! Found ${users.length} users`);
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
} catch (error) {
    console.error("✗ Error:", error.message);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
}
