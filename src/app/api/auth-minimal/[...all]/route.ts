import { authMinimal } from "@/lib/auth-minimal";
import { toNextJsHandler } from "better-auth/next-js";

console.log('Minimal auth endpoint loaded');

// Export the handlers directly
export const { GET, POST } = toNextJsHandler(authMinimal);