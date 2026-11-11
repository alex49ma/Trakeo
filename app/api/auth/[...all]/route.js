// Better Auth's endpoints (/api/auth/*). POSTs (sign-up, sign-in, password reset...) pass Arcjet's shield and bot
// detection first (D15): the root layout's Arcjet check only covers pages
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth";
import { aj } from "@/lib/arcjet";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request) {
    const decision = await aj.protect(request);
    if (decision.isDenied()) {
        return Response.json({ code: "REQUEST_BLOCKED", message: "Request blocked" }, { status: 403 });
    }
    return handler.POST(request);
}
