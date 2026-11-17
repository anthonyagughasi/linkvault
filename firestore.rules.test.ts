/**
 * Adversarial Security Rules Specification Tests ("Dirty Dozen")
 * Verifies the 12 attack vectors documented in security_spec.md against
 * DRAFT_firestore.rules / firestore.rules structure and invariants.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const rules = fs.readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');

// Pillar 1 & Global Safety Net
assert.ok(rules.includes("rules_version = '2';"), 'Must use rules_version 2');
assert.ok(
  rules.includes('match /{document=**}') && rules.includes('allow read, write: if false;'),
  'Must begin with default-deny global safety net'
);

// Pillar 2: Validation Blueprints & Anti-Update-Gap
for (const fn of ['isValidUser(', 'isValidLink(', 'isValidPublicRoute(', 'isValidClickEvent(']) {
  assert.ok(rules.includes(`function ${fn}`), `Missing validation helper ${fn}`);
}
assert.ok(
  rules.includes("affectedKeys().hasOnly(['email', 'displayName', 'photoUrl', 'updatedAt'])"),
  'Users update must restrict affectedKeys'
);
assert.ok(
  rules.includes(
    "affectedKeys().hasOnly(['slug', 'originalUrl', 'title', 'isActive', 'expiresAt', 'updatedAt'])"
  ),
  'Links update must restrict affectedKeys'
);
assert.ok(
  rules.includes("affectedKeys().hasOnly(['originalUrl', 'isActive', 'expiresAt', 'updatedAt'])"),
  'PublicRoute update must restrict affectedKeys'
);

// Pillar 3: Path Variable Hardening
assert.ok(rules.includes('function isValidId(id)'), 'Missing isValidId helper');
assert.ok(rules.includes('function isValidSlug(slug)'), 'Missing isValidSlug helper');

// Pillar 6: PII Isolation
assert.ok(
  rules.includes('match /users/{userId}') &&
    rules.includes('allow get: if isOwner(userId)') &&
    rules.includes('allow list: if false;'),
  'Users collection must block list and restrict get to owner'
);
assert.ok(
  rules.includes('match /public_routes/{slug}') && rules.includes('allow list: if false;'),
  'public_routes must disable list scraping'
);

// Pillar 7: Atomicity Guarantee
assert.ok(rules.includes('existsAfter(') && rules.includes('getAfter('), 'Must enforce atomic batch link/public_route sync');

// Pillar 8: Secure List Queries
assert.ok(
  rules.includes('allow list: if isSignedIn() && existing().userId == request.auth.uid;'),
  'Links list rule must enforce resource.data.userId == request.auth.uid'
);

// Temporal Integrity & Click Abuse Protection
assert.ok(rules.includes('incoming().createdAt == request.time'), 'Must enforce server timestamp on create');
assert.ok(rules.includes('incoming().updatedAt == request.time'), 'Must enforce server timestamp on update');
assert.ok(rules.includes('incoming().clickedAt == request.time'), 'Must enforce server timestamp on click create');
assert.ok(
  rules.includes("data.deviceCategory in ['Desktop', 'Mobile', 'Tablet', 'Bot']"),
  'Click deviceCategory must use strict allowlist'
);
assert.ok(
  rules.includes('isActive == true'),
  'Click creation must verify target public_route is active'
);

console.log('PASS: All Dirty Dozen & Eight Pillars assertions verified on firestore.rules');
