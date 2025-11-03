/**
 * Helper para cifrado/descifrado AES-GCM
 * Usado para cifrar tokens de Mercado Pago antes de guardarlos en la BD
 */

/**
 * Cifra un token usando AES-GCM
 * @param plaintext - Token en texto plano
 * @param key - Clave de cifrado (debe ser de 32 bytes para AES-256)
 * @returns Objeto con ciphertext y nonce
 */
export async function encrypt(
  plaintext: string,
  key: string
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  // Convertir la clave a formato adecuado
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generar nonce aleatorio (12 bytes para AES-GCM)
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // Cifrar el texto
  const plaintextData = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    plaintextData
  );

  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce,
  };
}

/**
 * Descifra un token usando AES-GCM
 * @param ciphertext - Token cifrado
 * @param nonce - Nonce usado para el cifrado
 * @param key - Clave de cifrado (debe ser de 32 bytes para AES-256)
 * @returns Token en texto plano
 */
export async function decrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: string
): Promise<string> {
  // Convertir la clave a formato adecuado
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Descifrar el texto
  const plaintextData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(plaintextData);
}

/**
 * Convierte Uint8Array a base64 para almacenamiento en PostgreSQL bytea
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

/**
 * Convierte base64 a Uint8Array desde PostgreSQL bytea
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  return new Uint8Array(binary.split('').map((char) => char.charCodeAt(0)));
}

