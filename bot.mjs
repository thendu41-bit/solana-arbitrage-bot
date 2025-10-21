import { Connection, Keypair, Transaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import pkg from '@kamino-finance/klend-sdk';
const { Kamino } = pkg;
import axios from 'axios';
import WebSocket from 'ws';
import async from 'async';

console.log('Script started');
const privateKey = '135,230,96,141,185,65,142,78,229,14,231,19,177,4,235,204,76,149,250,108,192,11,236,233,87,136,213,225,196,193,58,63,189,98,58,85,68,121,56,244,60,241,30,89,117,226,8,66,5,12,119,239,2,100,169,122,253,69,107,203,14,21,230,235';
const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKey.split(',').map(Number)));
const connection = new Connection('https://api.devnet.solana.com', 'confirmed'); // Primary RPC

async function checkArbitrageOpportunity() {
  try {
    console.log('Checking arbitrage opportunities...');
    const jupiterApi = createJupiterApiClient();
    const pairs = [
      { inMint: 'So11111111111111111111111111111111111111112', outMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // USDC/USDT
      { inMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', outMint: 'So11111111111111111111111111111111111111112' }, // USDT/USDC
      { inMint: 'So11111111111111111111111111111111111111112', outMint: 'So11111111111111111111111111111111111111112' } // USDC/USDC (test)
    ];
    for (const pair of pairs) {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          const quoteResponse = await jupiterApi.quoteGet({
            inputMint: pair.inMint,
            outputMint: pair.outMint,
            amount: 10000000,
            slippageBps: 50,
          });
          console.log('Quote response for', pair.inMint, 'to', pair.outMint, ':', quoteResponse);
          if (quoteResponse && quoteResponse.data && quoteResponse.data.outAmount) {
            const outAmount = Number(BigInt(quoteResponse.data.outAmount));
            const inAmount = 10000000;
            const profit = outAmount - inAmount;
            console.log('Profit for', pair.inMint, 'to', pair.outMint, ':', profit, 'Margin:', (profit / inAmount) * 100, '%');
            if (profit >= 0) {
              console.log('Potential opportunity (debug) for', pair.inMint, 'to', pair.outMint, ':', quoteResponse.data);
              await executeTradeWithFlashLoan(quoteResponse.data);
            } else {
              console.log('No profitable arbitrage opportunity for', pair.inMint, 'to', pair.outMint);
            }
          }
          break; // Exit on success
        } catch (error) {
          attempt++;
          console.error('Arbitrage check failed for', pair.inMint, 'to', pair.outMint, 'attempt', attempt, ':', error.message);
          if (attempt === maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s, 3s backoff
        }
      }
    }
  } catch (error) {
    console.error('Arbitrage check failed overall:', error);
  }
}

async function executeTradeWithFlashLoan(quote) {
  try {
    const kamino = new Kamino(connection, keypair);
    const flashLoanAmount = BigInt(quote.inAmount);
    const flashLoanTx = await kamino.createFlashLoanTx({
      amount: flashLoanAmount,
      asset: 'USDC',
      callback: async (borrowedAssets) => {
        const swapTransaction = new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }))
          .add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: keypair.publicKey, lamports: Number(flashLoanAmount) }));
        return swapTransaction;
      },
    });
    const signature = await connection.sendTransaction(flashLoanTx, [keypair]);
    console.log('Flash loan arbitrage executed:', signature);
  } catch (error) {
    console.error('Flash loan failed:', error);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function main() {
  console.log('Main loop started');
  while (true) {
    const startTime = Date.now();
    await checkArbitrageOpportunity().catch(() => {}); // Catch errors to ensure delay
    console.log('Cycle time:', Date.now() - startTime, 'ms');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Enforce 5s delay
  }
}

main().catch(console.error);
