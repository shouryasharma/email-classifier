import crypto from 'node:crypto';

export function secretsMatch(received, expected) {
  if (!received || !expected) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
