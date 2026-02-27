import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = 60; // requests per window
const WINDOW_MS = 60_000; // 1 minute
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries periodically
function cleanup() {
	const now = Date.now();
	for (const [ip, entry] of ipRequestMap) {
		if (now > entry.resetAt) {
			ipRequestMap.delete(ip);
		}
	}
}

let lastCleanup = Date.now();

export function proxy(request: NextRequest) {
	if (!request.nextUrl.pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	// Cleanup every 5 minutes
	const now = Date.now();
	if (now - lastCleanup > 300_000) {
		cleanup();
		lastCleanup = now;
	}

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	const entry = ipRequestMap.get(ip);

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET",
		"Cache-Control": "public, max-age=300, stale-while-revalidate=60",
	};

	// Handle CORS preflight
	if (request.method === "OPTIONS") {
		return new NextResponse(null, { status: 204, headers: corsHeaders });
	}

	if (!entry || now > entry.resetAt) {
		ipRequestMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
		const response = NextResponse.next();
		Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
		return response;
	}

	if (entry.count >= RATE_LIMIT) {
		return NextResponse.json(
			{ error: "Too many requests" },
			{
				status: 429,
				headers: {
					...corsHeaders,
					"Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
				},
			}
		);
	}

	entry.count++;
	const response = NextResponse.next();
	Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
	return response;
}

export const config = { matcher: "/api/:path*" };
