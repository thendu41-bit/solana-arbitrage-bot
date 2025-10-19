import { Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import { MarginfiClient } from '@mrgnlabs/marginfi-client-v2';
import axios from 'axios';
import WebSocket from 'ws';
import async from 'async';

console.log('Script started');
const privateKey = '135,230,96,141,185,65,142,78,229,14,231,19,177,4,235,204,76,149,250,108,192,11,236,233,87,136,213,225,196,193,58,63,189,98,58,85,68,121,56,244,60,241,30,89,117,226,8,66,5,12,119,239,2,100,169,122,253,69,107,203,14,21,230,235';
const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKey.split(',').map(Number)));
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkArbitrageOpportunity() {
  try {
    console.log('Checking arbitrage opportunity...');
    const jupiterApi = createJupiterApiClient();
    const quoteResponse = await jupiterApi.quoteGet({
      inputMint: 'So11111111111111111111111111111111111111112', // USDC
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDT
      amount: 1000000, // 1 USDC in lamports
      slippageBps: 50, // 0.5% slippage
    });
    console.log('Quote response:', quoteResponse);
    if (quoteResponse && quoteResponse.data && quoteResponse.data.outAmount) {
      const outAmount = BigInt(quoteResponse.data.outAmount);
      const inAmount = BigInt(1000000);
      const profit = Number(outAmount - inAmount);
      if (profit > -50000 && (profit / Number(inAmount)) > -0.05) { // Allow small losses for testing
        console.log('Potential opportunity (debug):', quoteResponse.data);
        await executeTrade(quoteResponse.data);
      } else {
        console.log('No profitable arbitrage opportunity found. Profit:', profit, 'Margin:', (profit / Number(inAmount)) * 100, '%');
      }
    }
  } catch (error) {
    console.error('Arbitrage check failed:', error);
  }
}

async function executeTrade(quote) {
  try {
    const jupiterApi = createJupiterApiClient();
    const swapResponse = await jupiterApi.swapPost({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    });
    const swapTransaction = swapResponse.data.swapTransaction;
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = Transaction.from(transactionBuf);
    transaction.partialSign(keypair);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('Trade executed successfully:', signature);
  } catch (error) {
    console.error('Trade execution failed:', error);
  }
}

async function main() {
  console.log('Main loop started');
  while (true) {
    await checkArbitrageOpportunity();
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
  }
}

main().catch(console.error);
