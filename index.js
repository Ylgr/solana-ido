const anchor = require("@project-serum/anchor");
const { web3, Provider, Wallet, utils } = anchor;
const { Account, Transaction, SystemProgram, PublicKey } = web3;
const Base58 = require('base-58');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");
const BN = anchor.BN;
require('dotenv').config();

const connection = new web3.Connection(process.env.NETWORK === "LOCAL" ? "http://127.0.0.1:8899/":"https://api.devnet.solana.com/");

const testFeePayerSecretKey = 'EGeG7Q6j8DedNW1ayFJW6a1eqUYCVobJ3CkKMxGPUb3vZLfHJhYDy2YrY8bwrNy2kZvqRPduFn8KXUUxJtqEPB3'
const testMasterSecretKey = '5rfnMoHXULH1fvcvdeBNwNLCJjDrNjd5UoqQZiNxzxJ1DFXTAWj8HRJNzxh4kaoeSnjZvaGZ8yLYAvuX7W1SEfxQ'
// 3rpycwRea4yGvcE5inQNX1eut4wEpeVCZohkEiBXY3PB
const testFeePayerWallet = new Wallet(web3.Keypair.fromSecretKey(Base58.decode(testFeePayerSecretKey)))
// 8HZtsjLbS5dim8ULfVv83XQ6xp4oMph2FpzmsLbg2aC4
const testMasterWallet = new Wallet(web3.Keypair.fromSecretKey(Base58.decode(testMasterSecretKey)))


// 2B8SUxUHwUMCaGBR564L5KLDGJ7SyjbZDzXZifbvrhdv
const user1Wallet = new Wallet(web3.Keypair.fromSecretKey(Base58.decode('4EHnNBG9jfvU2RE5bgXd9Fzn6bbKTnDdvVeQmJScpLTFyMyAy7QcLdnLuxEz7fqJLbHdZg6pZggGmumPX8hbA5Qg')))
// 6qbhYEGCMihaQiRt66oTMDgvCm2VY23vJsETGN6rs8z1
const user2Wallet = new Wallet(web3.Keypair.fromSecretKey(Base58.decode('4TQEhMh7ujM8yoEKxEv6d5dWciCPhErAMP2FuLS2xTX9B3VrwZUDJVubVVby46yQGkcmWD2vvcv7pyrQDJxu96yb')))

const bicTokenAddress = '9kJAfNMhZNtaTQTMGvrnRnCg1qxeCunFdvwY5webv8TN'
const birTokenAddress = '2EVyXs7AM8tgkjweRFkwCDe8DaVEYetDPG2EauAu2U6B'
const bgtTokenAddress = '3CvHRa7W8KcQG37xEqvUoUwNonxVBMkPRNttHn9MVczg'
const usdtTokenAddress = 'v2aShdenyX3bNDvUWzRYBXPC5yeuhtBjTTg3AiF5TAE'

const currentPrice = 0;
const coreTeamRole = 'CORE_TEAM_ROLE';
const communityRole = 'COMMUNITY_ROLE';
const whitelist = {
    '2B8SUxUHwUMCaGBR564L5KLDGJ7SyjbZDzXZifbvrhdv': coreTeamRole,
    '6qbhYEGCMihaQiRt66oTMDgvCm2VY23vJsETGN6rs8z1': communityRole,
}
const priceForRentInUsdt = 0;

const provider = new Provider(connection, testFeePayerWallet, {skipPreflight: false});
const DECIMALS = 6;

async function createTokensAndMintIt() {
    const amountMint = 10000*1e6;

    const tokenMint = web3.Keypair.generate();

    console.log('Create token: ', tokenMint.publicKey.toString());
    const tokenMasterAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tokenMint.publicKey,
        testMasterWallet.publicKey
    )

    const instructions = [
        web3.SystemProgram.createAccount({
            fromPubkey: testFeePayerWallet.publicKey,
            newAccountPubkey: tokenMint.publicKey,
            space: 82,
            lamports: await connection.getMinimumBalanceForRentExemption(82),
            programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            tokenMint.publicKey,
            DECIMALS,
            testMasterWallet.publicKey,
            null
        ),
        Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            tokenMint.publicKey,
            tokenMasterAssociatedAccount,
            testMasterWallet.publicKey,
            testFeePayerWallet.publicKey
        ),
        Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            tokenMint.publicKey,
            tokenMasterAssociatedAccount,
            testMasterWallet.publicKey,
            [],
            amountMint
        ),

    ];
    let tx = new web3.Transaction().add(...instructions)
    tx.feePayer = testFeePayerWallet.payer.publicKey
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    tx.partialSign(tokenMint)
    tx.partialSign(testFeePayerWallet.payer)
    tx.partialSign(testMasterWallet.payer)
    const rawTx = tx.serialize()
    const receipt = await connection.sendRawTransaction(rawTx)
    logOnExplorer(receipt);
}

function logOnExplorer(hash) {
    console.log('https://explorer.solana.com/tx/'+ hash + '?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899');
}

createTokensAndMintIt()

async function createBuyRequest() {

}
