export declare const tokenStore: {
    save(userId: string, tokenId: string): Promise<void>;
    exists(userId: string, tokenId: string): Promise<boolean>;
    revoke(userId: string, tokenId: string): Promise<void>;
    revokeAll(userId: string): Promise<void>;
    /**
     * Scans Redis for EVERY currently-valid refresh token, across every
     * user, and returns which userId each one belongs to.
     *
     * This is what "see all logged-in users" is actually built on: a user
     * counts as "logged in" if they have at least one refresh-token key
     * still alive in Redis (haven't logged out, and it hasn't expired).
     * Redis's TTL (see `save()` above) means a session that goes quiet
     * just expires and disappears from this list on its own — no manual
     * cleanup job needed.
     *
     * One user can appear more than once here if they're signed in on
     * multiple devices/browsers (each login creates its own tokenId) —
     * the caller (admin.controller.ts) is the one that groups these back
     * down to one row per user, with a "device count".
     */
    listActiveSessions(): Promise<{
        userId: string;
        tokenId: string;
    }[]>;
};
//# sourceMappingURL=tokenStore.service.d.ts.map