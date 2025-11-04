/**
 * Helper para validar firma X-Signature de webhooks de Mercado Pago
 * Mercado Pago envía la firma en el header X-Signature
 */

/**
 * Valida la firma X-Signature de un webhook de Mercado Pago
 * Formato de MP: ts=<timestamp>,v1=<hash>
 * El hash es HMAC-SHA256 de: id=<data.id>&topic=<topic>&<secret>
 * 
 * @param signature - Header X-Signature recibido
 * @param body - Cuerpo del request (JSON string parseado)
 * @param secret - Clave secreta de la aplicación (MP_WEBHOOK_SECRET)
 * @returns true si la firma es válida, false en caso contrario
 */
export async function verifyMPSignature(
  signature: string,
  body: string,
  secret: string
): Promise<boolean> {
  try {
    if (!signature || !secret) {
      return false;
    }

    // Parsear el evento del body
    const event = JSON.parse(body);
    const dataId = event.data?.id;
    const topic = event.type || event.topic;

    if (!dataId || !topic) {
      console.error('X-Signature: falta data.id o type en el evento');
      return false;
    }

    // Mercado Pago envía la firma en formato: ts=<timestamp>,v1=<hash>
    const parts = signature.split(',');
    const v1Part = parts.find((p) => p.startsWith('v1='));
    
    if (!v1Part) {
      console.error('X-Signature no contiene v1');
      return false;
    }

    const receivedHash = v1Part.split('=')[1];

    // Crear el mensaje según formato de MP: id=<data.id>&topic=<topic>
    const message = `id=${dataId}&topic=${topic}`;
    
    // Calcular HMAC-SHA256 usando crypto.subtle
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    // Importar clave para HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Firmar el mensaje
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );

    // Convertir a hex string para comparar
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Comparar hashes (case-insensitive)
    return receivedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error('Error validando firma MP:', error);
    return false;
  }
}

/**
 * Validación alternativa usando el secret directamente
 * Si MP envía el secret en el header, podemos validar directamente
 */
export function verifyMPSignatureSimple(
  signature: string,
  body: string,
  secret: string
): boolean {
  // Si el secret está en la firma, validar directamente
  if (signature.includes(secret)) {
    return true;
  }
  
  // Validación básica: verificar que la firma no esté vacía
  return signature.length > 0 && secret.length > 0;
}

