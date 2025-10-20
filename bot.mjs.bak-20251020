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
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkArbitrageOpportunity() {
  try {
    console.log('Checking arbitrage opportunities...');
    const jupiterApi = createJupiterApiClient();
    const pairs = [
      { inMint: 'So11111111111111111111111111111111111111112', outMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }, // USDC/USDT
      { inMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', outMint: 'So11111111111111111111111111111111111111112' }, // USDT/USDC
      { inMint: 'So11111111111111111111111111111111111111112', outMint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' } // USDC/SOL (SOL mint on devnet)
    ];
    for (const pair of pairs) {
      const quoteResponse = await jupiterApi.quoteGet({
        inputMint: pair.inMint,
        outputMint: pair.outMint,
        amount: 10000000, // 0.01 USDC in lamports
        slippageBps: 50, // 0.5% slippage
      });
      console.log('Quote response for', pair.inMint, 'to', pair.outMint, ':', quoteResponse);
      if (quoteResponse && quoteResponse.data && quoteResponse.data.outAmount) {
        const outAmount = BigInt(quoteResponse.data.outAmount);
        const inAmount = BigInt(10000000);
        const profit = Number(outAmount - inAmount);
        if (profit >= 0) { // Allow break-even or profit
          console.log('Potential opportunity (debug) for', pair.inMint, 'to', pair.outMint, ':', quoteResponse.data);
          await executeTradeWithFlashLoan(quoteResponse.data);
        } else {
          console.log('No profitable arbitrage opportunity for', pair.inMint, 'to', pair.outMint, '. Profit:', profit, 'Margin:', (profit / Number(inAmount)) * 100, '%');
        }
      }
    }
  } catch (error) {
    console.error('Arbitrage check failed:', error);
  }
}

async function executeTradeWithFlashLoan(quote) {
  try {
    const kamino = new Kamino(connection, keypair);
    const flashLoanAmount = BigInt(quote.inAmount); // Borrow inAmount
    const flashLoanTx = await kamino.createFlashLoanTx({
      amount: flashLoanAmount,
      asset: 'USDC', // Borrow USDC
      callback: async (borrowedAssets) => {
        // Execute arbitrage swaps with borrowedAssets (placeholder—replace with Jupiter swap logic)
        const swapTransaction = new Transaction()
          .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 })) // Set compute budget
          .add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: keypair.publicKey, lamports: Number(flashLoanAmount) }));
        return swapTransaction; // Repay within callback
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
    await checkArbitrageOpportunity();
    console.log('Cycle time:', Date.now() - startTime, 'ms');
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
  }
}

main().catch(console.error);

