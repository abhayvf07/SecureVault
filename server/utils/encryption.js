const crypto = require('crypto');

/**
 * Encryption Utility — AES-256-GCM
 *
 * Placeholder for V2.0 encryption-at-rest feature.
 * NOT wired into the upload/download pipeline yet.
 *
 * When ready to integrate:
 * 1. Add FILE_ENCRYPTION_KEY to .env (32-byte hex: `crypto.randomBytes(32).toString('hex')`)
 * 2. Call encrypt() after multer saves file, before DB record
 * 3. Store returned { iv, authTag } in File model
 * 4. Call decrypt() during download stream before sending to client
 *
 * @module utils/encryption
 */

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a buffer using AES-256-GCM.
 * @param {Buffer} buffer - The plaintext file data
 * @param {string} keyHex - 32-byte hex-encoded encryption key
 * @returns {{ encrypted: Buffer, iv: string, authTag: string }}
 */
const encrypt = (buffer, keyHex) => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

/**
 * Decrypt a buffer using AES-256-GCM.
 * @param {Buffer} encrypted - The ciphertext file data
 * @param {string} keyHex - 32-byte hex-encoded encryption key
 * @param {string} ivHex - Hex-encoded IV used during encryption
 * @param {string} authTagHex - Hex-encoded auth tag from encryption
 * @returns {Buffer} Decrypted plaintext data
 */
const decrypt = (encrypted, keyHex, ivHex, authTagHex) => {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

module.exports = { encrypt, decrypt };
