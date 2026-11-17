# LinkVault Firestore Security Specification

## 1. Data Invariants
1. **User Isolation:** A `users/{userId}` document may only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`. No user can list all users.
2. **Link Ownership:** Every `links/{linkId}` document must belong to `request.auth.uid` (`userId == request.auth.uid`). `userId` and `createdAt` are immutable after creation.
3. **Atomic Slug Uniqueness & Zero-PII Public Lookup:** Every `links/{linkId}` document is paired atomically with `public_routes/{slug}`. `public_routes/{slug}` contains only `{ slug, linkId, originalUrl, isActive, expiresAt, createdAt, updatedAt }` with zero user PII (`userId`, `email`, `title`). Listing `public_routes` is denied (`allow list: if false`).
4. **Master Gate on Click Telemetry:** `links/{linkId}/clicks/{clickId}` may only be read or deleted by the owner of the parent `links/{linkId}` document. Click creation requires strict schema validation, valid `deviceCategory` allowlist, server timestamp (`clickedAt == request.time`), and verification that `public_routes/{slug}` exists, points to `linkId`, and `isActive == true`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Result in PERMISSION_DENIED)
1. **Unauthenticated link creation:** `create /links/link123` with `request.auth == null`.
2. **Identity spoofing on link create:** User A creates `/links/link123` with `userId: "user-B"`.
3. **Cross-user link read/list:** User B runs `get /links/linkA` or `list /links` without `where('userId', '==', uidB)`.
4. **Shadow/Ghost field injection:** User A creates `/links/link123` with extra field `isAdmin: true`.
5. **Client timestamp forgery:** User A creates `/links/link123` with backdated `createdAt`.
6. **Immutable field mutation:** User A updates `/links/link123` attempting to change `userId` or `createdAt`.
7. **Orphaned public_route without parent link:** User A creates `/public_routes/evil` pointing to non-existent `linkId`.
8. **Hijacking another user's public_route:** User B updates or deletes `/public_routes/user-a-slug`.
9. **Scraping public_routes collection:** Unauthenticated or authenticated user calls `list /public_routes`.
10. **PII exposure via users list:** User B calls `list /users` or `get /users/userA`.
11. **Oversized string poisoning (Denial of Wallet):** Creating a click event with a 10KB `referrer` string or invalid `deviceCategory: "SmartFridge"`.
12. **Click spoofing on paused/non-existent link:** Creating `/links/link123/clicks/c1` when `public_routes/{slug}` does not exist or `isActive == false`.
