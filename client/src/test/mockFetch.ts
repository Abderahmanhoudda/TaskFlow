// TaskFlow - Test utilities
// Fetch mocking helpers shared by the Vitest suites

import { vi } from 'vitest';

// Minimal Response stand-in: api.ts only reads ok, status, and text()
export const jsonResponse = (body: unknown, status = 200): Response =>
    ({
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(body),
    }) as Response;

export type FetchHandler = (
    url: string,
    init?: RequestInit
) => Response | Promise<Response>;

// Replace global fetch with a route-driven mock; returns the spy
export function stubFetch(handler: FetchHandler) {
    const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(handler(String(input), init))
    );
    vi.stubGlobal('fetch', spy);
    return spy;
}

// Fetch that always fails like an offline server
export function stubNetworkFailure() {
    const spy = vi.fn(() =>
        Promise.reject(new TypeError('Failed to fetch'))
    );
    vi.stubGlobal('fetch', spy);
    return spy;
}
