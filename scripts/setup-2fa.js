// Usage: node scripts/setup-2fa.js
// Generates a TOTP secret for optional owner 2FA. Add the printed secret to .env as
// NOVIQ_OWNER_TOTP_SECRET, then scan the otpauth:// URI with an authenticator app
// (Google Authenticator, 1Password, Authy, etc). Leave it unset to skip 2FA.
const {generateSecret,generateURI}=require('otplib');
const secret=generateSecret();
const uri=generateURI({issuer:'NOVIQ',label:'owner',secret});
console.log('\nAdd this to your .env:\n');
console.log(`NOVIQ_OWNER_TOTP_SECRET=${secret}\n`);
console.log('Scan this URI with your authenticator app (or add the secret manually):\n');
console.log(uri+'\n');
