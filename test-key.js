const { Keypair } = require('@solana/web3.js');

const privateKey = '[12,34,56,...,255]'; // Replace with your array
try {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKey.split(',').map(Number)));
  console.log('Keypair created successfully. Public Key:', keypair.publicKey.toBase58());
} catch (error) {
  console.error('Error creating keypair:', error.message);
}

