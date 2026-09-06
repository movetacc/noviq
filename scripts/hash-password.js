// Usage: node scripts/hash-password.js "your-password-here"
// Prints an argon2id hash to put in .env as NOVIQ_OWNER_PASSWORD_HASH, so the
// plaintext password never has to live in your .env file.
const argon2=require('argon2');
(async()=>{
 const pw=process.argv[2];
 if(!pw){console.error('Usage: node scripts/hash-password.js "your-password"');process.exit(1)}
 const hash=await argon2.hash(pw,{type:argon2.argon2id});
 console.log('\nAdd this to your .env:\n');
 console.log(`NOVIQ_OWNER_PASSWORD_HASH=${hash}\n`);
 console.log('Then remove NOVIQ_OWNER_PASSWORD entirely.');
})();
