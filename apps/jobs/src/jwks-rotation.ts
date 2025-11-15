/**
 * JWKS rotation job stub. In a production environment this job would
 * generate a new signing key, publish it to a JWKS endpoint, mark the
 * previous key as retiring, and revoke tokens signed by retired keys after
 * a grace period. Here we only log the action.
 */
import { rotateSigningKey } from '../../api/src/services/jwt';

export async function rotateJwks(): Promise<void> {
  // Rotate the active signing key. This marks the current key as retiring and
  // generates a new RSA key pair for future token signing. In a production
  // deployment you would also publish the JWKS document containing all
  // public keys and remove fully retired keys after a grace period.
  rotateSigningKey();
  console.log('JWKS rotation: generated new signing key');
}