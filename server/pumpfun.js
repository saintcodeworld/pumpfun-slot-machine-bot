import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const PUMP_FUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbCJ9BSL3eTK6s');
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

let connection;
let devKeypair;
let mintAddress;

export function initializeSolana() {
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  connection = new Connection(rpcUrl, 'confirmed');

  const privateKeyBytes = bs58.decode(process.env.DEV_PRIVATE_KEY);
  devKeypair = Keypair.fromSecretKey(privateKeyBytes);

  mintAddress = new PublicKey(process.env.TOKEN_MINT_ADDRESS);

  console.log('[Solana] Initialized');
  console.log('[Solana] Dev wallet:', devKeypair.publicKey.toBase58());
  console.log('[Solana] Token mint:', mintAddress.toBase58());
}

/**
 * Parse the on-chain bonding curve account data.
 * Layout (after 8-byte discriminator):
 *   u64 virtualTokenReserves
 *   u64 virtualSolReserves
 *   u64 realTokenReserves
 *   u64 realSolReserves
 *   u64 tokenTotalSupply
 *   bool complete
 */
async function getBondingCurveData(bondingCurvePubkey) {
  const accountInfo = await connection.getAccountInfo(bondingCurvePubkey);
  if (!accountInfo) throw new Error('Bonding curve account not found');

  const data = accountInfo.data;
  return {
    virtualTokenReserves: data.readBigUInt64LE(8),
    virtualSolReserves: data.readBigUInt64LE(16),
    realTokenReserves: data.readBigUInt64LE(24),
    realSolReserves: data.readBigUInt64LE(32),
    tokenTotalSupply: data.readBigUInt64LE(40),
    complete: data[48] === 1,
  };
}

/**
 * Constant-product formula: how many tokens does `solLamports` buy?
 */
function calculateTokensOut(virtualSolReserves, virtualTokenReserves, solLamports) {
  const solIn = BigInt(solLamports);
  const newVirtualSol = virtualSolReserves + solIn;
  const newVirtualTokens =
    (virtualSolReserves * virtualTokenReserves) / newVirtualSol;
  return virtualTokenReserves - newVirtualTokens;
}

/**
 * Execute a pump.fun bonding-curve buy for `solAmount` SOL.
 * Returns { signature, tokensReceived }.
 */
export async function executePumpFunBuy(solAmount) {
  if (!connection || !devKeypair || !mintAddress) {
    initializeSolana();
  }

  const solLamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  // ── Derive PDAs ──────────────────────────────────────────────
  const [globalAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('global')],
    PUMP_FUN_PROGRAM_ID,
  );

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintAddress.toBuffer()],
    PUMP_FUN_PROGRAM_ID,
  );

  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('__event_authority')],
    PUMP_FUN_PROGRAM_ID,
  );

  const associatedBondingCurve = await getAssociatedTokenAddress(
    mintAddress,
    bondingCurve,
    true, // allowOwnerOffCurve
  );

  const associatedUser = await getAssociatedTokenAddress(
    mintAddress,
    devKeypair.publicKey,
  );

  // ── Read bonding curve state ─────────────────────────────────
  const curveData = await getBondingCurveData(bondingCurve);

  if (curveData.complete) {
    throw new Error('Bonding curve complete – token has graduated to Raydium');
  }

  // 1 % protocol fee is deducted from the SOL input
  const feeAmount = BigInt(Math.floor(solLamports * 0.01));
  const solAfterFee = BigInt(solLamports) - feeAmount;

  const tokensOut = calculateTokensOut(
    curveData.virtualSolReserves,
    curveData.virtualTokenReserves,
    Number(solAfterFee),
  );

  // 5 % slippage tolerance on max SOL cost
  const maxSolCost = BigInt(Math.floor(solLamports * 1.05));

  // ── Build instruction data ───────────────────────────────────
  const data = Buffer.alloc(24);
  BUY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(tokensOut, 8);
  data.writeBigUInt64LE(maxSolCost, 16);

  const buyInstruction = new TransactionInstruction({
    programId: PUMP_FUN_PROGRAM_ID,
    keys: [
      { pubkey: globalAccount, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mintAddress, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: devKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  // ── Build transaction ────────────────────────────────────────
  const transaction = new Transaction();

  // Create ATA if it doesn't exist yet
  const ataInfo = await connection.getAccountInfo(associatedUser);
  if (!ataInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        devKeypair.publicKey,
        associatedUser,
        devKeypair.publicKey,
        mintAddress,
      ),
    );
  }

  transaction.add(buyInstruction);

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = devKeypair.publicKey;

  // ── Sign & send ──────────────────────────────────────────────
  transaction.sign(devKeypair);

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, preflightCommitment: 'confirmed' },
  );

  await connection.confirmTransaction(signature, 'confirmed');

  console.log(`[PumpFun] Buy executed — sig: ${signature}`);
  return { signature, tokensReceived: tokensOut.toString() };
}
