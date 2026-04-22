import { Polar } from "@polar-sh/sdk";
export const polar_client = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: "sandbox"
    
})