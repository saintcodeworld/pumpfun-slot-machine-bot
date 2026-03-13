import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  OnlinePumpSdk,
  PUMP_SDK,
  getBuyTokenAmountFromSolAmount,
} from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

let connection;
let devKeypair;
let mintAddress;
let onlineSdk;

export function initializeSolana() {
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  connection = new Connection(rpcUrl, 'confirmed');

  const privateKeyBytes = bs58.decode(process.env.DEV_PRIVATE_KEY);
  devKeypair = Keypair.fromSecretKey(privateKeyBytes);

  mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
  onlineSdk = new OnlinePumpSdk(connection);

  console.log('[Solana] Initialized');
  console.log('[Solana] Dev wallet:', devKeypair.publicKey.toBase58());
  console.log('[Solana] Token mint:', mintAddress.toBase58());
}

/**
 * Execute a pump.fun bonding-curve buy for `solAmount` SOL
 * using the official @pump-fun/pump-sdk.
 * Returns { signature, tokensReceived }.
 */
export async function executePumpFunBuy(solAmount) {
  if (!connection || !devKeypair || !mintAddress) {
    initializeSolana();
  }

  console.log(`[PumpFun] Starting buy: ${solAmount} SOL for mint ${mintAddress.toBase58()}`);
  console.log(`[PumpFun] Using wallet: ${devKeypair.publicKey.toBase58()}`);

  const solLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  const solBN = new BN(solLamports);

  // ── Detect which token program owns this mint ──────────────
  const mintAccountInfo = await connection.getAccountInfo(mintAddress);
  if (!mintAccountInfo) throw new Error('Mint account not found on-chain');

  const mintOwner = mintAccountInfo.owner;
  const isToken2022 = mintOwner.equals(TOKEN_2022_PROGRAM_ID);
  const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  console.log(`[PumpFun] Mint owner: ${mintOwner.toBase58()} (Token2022: ${isToken2022})`);

  // ── Fetch global state and bonding curve via SDK ───────────
  const global = await onlineSdk.fetchGlobal();
  const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } =
    await onlineSdk.fetchBuyState(mintAddress, devKeypair.publicKey, tokenProgramId);

  if (bondingCurve.complete) {
    throw new Error('Bonding curve complete – token has graduated to Raydium');
  }

  // ── Calculate token amount using SDK's formula ─────────────
  const amount = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig: null,
    mintSupply: null,
    bondingCurve,
    amount: solBN,
  });

  console.log(`[PumpFun] Buy params — tokenAmount: ${amount.toString()}, solAmount: ${solBN.toString()} lamports, slippage: 25%`);

  // ── Build buy instructions via official SDK ────────────────
  const instructions = await PUMP_SDK.buyInstructions({
    global,
    bondingCurveAccountInfo,
    bondingCurve,
    associatedUserAccountInfo,
    mint: mintAddress,
    user: devKeypair.publicKey,
    amount,
    solAmount: solBN,
    slippage: 25,
    tokenProgram: tokenProgramId,
  });

  // ── Build, sign, send transaction ──────────────────────────
  const transaction = new Transaction();
  for (const ix of instructions) {
    transaction.add(ix);
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = devKeypair.publicKey;
  transaction.sign(devKeypair);

  console.log('[PumpFun] Sending transaction...');

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true, preflightCommitment: 'confirmed' },
  );

  console.log(`[PumpFun] TX sent — sig: ${signature}`);

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log(`[PumpFun] Buy confirmed — sig: ${signature}`);
  return { signature, tokensReceived: amount.toString() };
}
