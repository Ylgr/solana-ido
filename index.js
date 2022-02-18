const { program } = require('commander');
const anchor = require('@project-serum/anchor');
const { web3, Provider, Wallet, utils } = anchor;
const { Account, Transaction, SystemProgram, PublicKey } = web3;
const Base58 = require('base-58');
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token');
const BN = anchor.BN;
require('dotenv').config();

const connection = new web3.Connection(process.env.NETWORK === 'LOCAL' ? 'http://127.0.0.1:8899/':'https://api.devnet.solana.com/');

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

const bicTokenPublicKey = new web3.PublicKey('9kJAfNMhZNtaTQTMGvrnRnCg1qxeCunFdvwY5webv8TN')
const birTokenPublicKey = new web3.PublicKey('2EVyXs7AM8tgkjweRFkwCDe8DaVEYetDPG2EauAu2U6B')
const bgtTokenPublicKey = new web3.PublicKey('GGi2oBV3vDVwGK97Y8Sp2iYM6qdxMqz1e8QXyFF6KNEU')
const usdtTokenPublicKey = new web3.PublicKey('v2aShdenyX3bNDvUWzRYBXPC5yeuhtBjTTg3AiF5TAE')
const DECIMALS = 6;

const currentBicPrice = 0.1;
const birReceiveRate = 0.33;
const bgtReceiveRate = 1;
const bicRefRate = 0.1;
const birRefRate = 0.03;
const bgtRefRate = 0.1;
const ref = {
    '2B8SUxUHwUMCaGBR564L5KLDGJ7SyjbZDzXZifbvrhdv': new web3.PublicKey('6qbhYEGCMihaQiRt66oTMDgvCm2VY23vJsETGN6rs8z1'),
    '6qbhYEGCMihaQiRt66oTMDgvCm2VY23vJsETGN6rs8z1': new web3.PublicKey('6qbhYEGCMihaQiRt66oTMDgvCm2VY23vJsETGN6rs8z1'),
}
const amountUsdtForRentAccount = 0.2 * Math.pow(10, DECIMALS);

program.command('init-token')
    .description('Create BIC, BIR, BGT and USDT and mint 1000 for each')
    .action(async () => {
        console.log('Create tokens for master wallet: ', testMasterWallet.publicKey.toString())
        console.log('And mining 1000 token each for master wallet.')
        await createTokensAndMintIt();
        await createUsdtAndMintIt();
    });

program.command('transfer-usdt')
    .description('Transfer usdt to user')
    .action(async () => {
        const amountUsdt = 1;
        console.log(`Tranfer ${amountUsdt} from ${testMasterWallet.publicKey.toString()} to ${user1Wallet.publicKey.toString()}.`)
        await transferUsdtToUser(amountUsdt);
    });

program.command('buy')
    .description('User buy BIC')
    .action(async () => {
        const amountUsdt = 1;
        console.log(`${user1Wallet.publicKey.toString()} buy BIC by using ${amountUsdt} USDT.`)
        await createBuyRequest(amountUsdt);
    });

program.command('balance')
    .description('Log balance of all user')
    .action(async () => {
        console.log('Master wallet.')
        await logBalance(testMasterWallet);
        console.log('Fee payer wallet.')
        await logBalance(testFeePayerWallet);
        console.log('User 1 (Buy user).')
        await logBalance(user1Wallet);
        console.log('User 2 (Ref user).')
        await logBalance(user2Wallet);
    });

program.parse();

async function createTokensAndMintIt() {
    const amountMint = 10000*1e6;
    const lamports = await connection.getMinimumBalanceForRentExemption(82)

    const bicTokenMint = web3.Keypair.generate();
    console.log('Create token BIC: ', bicTokenMint.publicKey.toString());
    const bicMasterAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        bicTokenMint.publicKey,
        testMasterWallet.publicKey
    )

    const birTokenMint = web3.Keypair.generate();
    console.log('Create token BIR: ', birTokenMint.publicKey.toString());
    const birMasterAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        birTokenMint.publicKey,
        testMasterWallet.publicKey
    )

    const bgtTokenMint = web3.Keypair.generate();
    console.log('Create token BGT: ', bgtTokenMint.publicKey.toString());

    const instructions = createTokenAndMintInstructions(bicTokenMint.publicKey, lamports, true)
        .concat(createAssociateTokenTokenAndMintToItInstructions(bicTokenMint.publicKey, bicMasterAssociatedAccount, amountMint))
        .concat(createTokenAndMintInstructions(birTokenMint.publicKey, lamports))
        .concat(createAssociateTokenTokenAndMintToItInstructions(birTokenMint.publicKey, birMasterAssociatedAccount, amountMint))
        .concat(createTokenAndMintInstructions(bgtTokenMint.publicKey, lamports, true))

    let tx = new web3.Transaction().add(...instructions)
    tx.feePayer = testFeePayerWallet.payer.publicKey
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    tx.partialSign(bicTokenMint)
    tx.partialSign(birTokenMint)
    tx.partialSign(bgtTokenMint)
    tx.partialSign(testFeePayerWallet.payer)
    tx.partialSign(testMasterWallet.payer)
    const rawTx = tx.serialize()
    const receipt = await connection.sendRawTransaction(rawTx)
    logOnExplorer(receipt);
}

async function createUsdtAndMintIt() {
    const amountMint = 10000*1e6;
    const lamports = await connection.getMinimumBalanceForRentExemption(82)
    const usdtTokenMint = web3.Keypair.generate();
    console.log('Create token USDT: ', usdtTokenMint.publicKey.toString());
    const usdtMasterAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdtTokenMint.publicKey,
        testMasterWallet.publicKey
    )
    const instructions = createTokenAndMintInstructions(usdtTokenMint.publicKey, lamports)
        .concat(createAssociateTokenTokenAndMintToItInstructions(usdtTokenMint.publicKey, usdtMasterAssociatedAccount, amountMint))
    let tx = new web3.Transaction().add(...instructions)
    tx.feePayer = testFeePayerWallet.payer.publicKey
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    tx.partialSign(usdtTokenMint)
    tx.partialSign(testFeePayerWallet.payer)
    tx.partialSign(testMasterWallet.payer)
    const rawTx = tx.serialize()
    const receipt = await connection.sendRawTransaction(rawTx)
    logOnExplorer(receipt);
}


function createTokenAndMintInstructions(mintPublicKey, lamports, isAbleToFreeze = false) {
    return [
        web3.SystemProgram.createAccount({
            fromPubkey: testFeePayerWallet.publicKey,
            newAccountPubkey: mintPublicKey,
            space: 82,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mintPublicKey,
            DECIMALS,
            testMasterWallet.publicKey,
            isAbleToFreeze && testMasterWallet.publicKey
        )
    ]
}
function createAssociateTokenTokenAndMintToItInstructions(mintPublicKey, tokenMasterAssociatedAccount, amountMint) {
    return [
        Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            mintPublicKey,
            tokenMasterAssociatedAccount,
            testMasterWallet.publicKey,
            testFeePayerWallet.publicKey
        ),
        Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mintPublicKey,
            tokenMasterAssociatedAccount,
            testMasterWallet.publicKey,
            [],
            amountMint
        )
    ]
}

function logOnExplorer(hash) {
    console.log(
        'https://explorer.solana.com/tx/'+ hash +
        (process.env.NETWORK === 'LOCAL' ? '?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899' : '?cluster=devnet')
    );
}

async function transferUsdtToUser(amountUsdt) {
    amountUsdt = amountUsdt*Math.pow(10, DECIMALS)
    const userPublicKey = user1Wallet.publicKey;

    const userAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdtTokenPublicKey,
        userPublicKey
    )

    const tokenMasterAssociatedAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdtTokenPublicKey,
        testMasterWallet.publicKey
    )

    // console.log('master: ', (await connection.getTokenAccountBalance(tokenMasterAssociatedAccount)))

    const instructions = [
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            tokenMasterAssociatedAccount,
            userAssociatedAccount,
            testMasterWallet.publicKey,
            [],
            amountUsdt
        ),
    ]
    let isCreateAssociatedTokenAccount = false;
    try {
        await connection.getTokenAccountBalance(userAssociatedAccount)
    } catch (e) {
        instructions.unshift(Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            usdtTokenPublicKey,
            userAssociatedAccount,
            userPublicKey,
            testFeePayerWallet.publicKey
        ))
        isCreateAssociatedTokenAccount = true;
    }

    let tx = new web3.Transaction().add(...instructions)
    tx.feePayer = testFeePayerWallet.payer.publicKey
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    tx.partialSign(testFeePayerWallet.payer)
    tx.partialSign(testMasterWallet.payer)
    const rawTx = tx.serialize()
    const receipt = await connection.sendRawTransaction(rawTx)
    logOnExplorer(receipt);
}

async function getListAssociatedAccount(publicKey) {
    const usdt = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        usdtTokenPublicKey,
        publicKey
    )
    const bic = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        bicTokenPublicKey,
        publicKey
    )
    const bir = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        birTokenPublicKey,
        publicKey
    )
    const bgt = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        bgtTokenPublicKey,
        publicKey
    )
    return {bic, bir, bgt, usdt}
}

async function createBuyRequest(amountUsdt) {
    amountUsdt = amountUsdt*Math.pow(10, DECIMALS);
    const userPublicKey = user1Wallet.publicKey;
    const userPayer = user1Wallet.payer;

    const masterAssociatedAccount = await getListAssociatedAccount(testMasterWallet.publicKey);
    const userAssociatedAccount = await getListAssociatedAccount(userPublicKey);

    const refUserPublicKey = ref[userPublicKey]
    if(!refUserPublicKey) {
        console.log('User not whitelist and ref!')
        return
    }
    const refAssociatedAccount = await getListAssociatedAccount(refUserPublicKey);

    const instructionRentAccount = []

    // BIC user
    try {
        await connection.getTokenAccountBalance(userAssociatedAccount.bic)
    } catch (e) {
        amountUsdt-=amountUsdtForRentAccount;
        if(amountUsdt < 0) {
            console.log('Not enough USDT for rent!')
            return
        }
        instructionRentAccount.push(Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            bicTokenPublicKey,
            userAssociatedAccount.bic,
            userPublicKey,
            testFeePayerWallet.publicKey
        ))
    }

    // BIR user
    try {
        await connection.getTokenAccountBalance(userAssociatedAccount.bir)
    } catch (e) {
        amountUsdt-=amountUsdtForRentAccount;
        if(amountUsdt < 0) {
            console.log('Not enough USDT for rent!')
            return
        }
        instructionRentAccount.push(Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            birTokenPublicKey,
            userAssociatedAccount.bir,
            userPublicKey,
            testFeePayerWallet.publicKey
        ))
    }

    // BIC Ref
    try {
        await connection.getTokenAccountBalance(refAssociatedAccount.bic)
    } catch (e) {
        instructionRentAccount.push(Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            bicTokenPublicKey,
            refAssociatedAccount.bic,
            refUserPublicKey,
            testFeePayerWallet.publicKey
        ))
    }

    // BIR Ref
    try {
        await connection.getTokenAccountBalance(refAssociatedAccount.bir)
    } catch (e) {
        instructionRentAccount.push(Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            birTokenPublicKey,
            refAssociatedAccount.bir,
            refUserPublicKey,
            testFeePayerWallet.publicKey
        ))
    }

    const bicReceive = amountUsdt/currentBicPrice;
    const birReceive = bicReceive*birReceiveRate;
    const bgtReceive = bicReceive*bgtReceiveRate;
    const bicRef = bicReceive*bicRefRate;
    const birRef = bicReceive*birRefRate;
    const bgtRef = bicReceive*bgtRefRate;
    const buyAndRewardInstructions = [
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            userAssociatedAccount.usdt,
            masterAssociatedAccount.usdt,
            userPublicKey,
            [],
            amountUsdt
        ),
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            masterAssociatedAccount.bic,
            userAssociatedAccount.bic,
            testMasterWallet.publicKey,
            [],
            bicReceive
        ),
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            masterAssociatedAccount.bir,
            userAssociatedAccount.bir,
            testMasterWallet.publicKey,
            [],
            birReceive
        ),
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            masterAssociatedAccount.bic,
            refAssociatedAccount.bic,
            testMasterWallet.publicKey,
            [],
            bicRef
        ),
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            masterAssociatedAccount.bir,
            refAssociatedAccount.bir,
            testMasterWallet.publicKey,
            [],
            birRef
        ),
    ]

    const mintBgtToReceive = await thawThenMintThenFreezeBgtAgain(userAssociatedAccount.bgt, bgtReceive, userPublicKey);
    const mintBgtToRef = await thawThenMintThenFreezeBgtAgain(refAssociatedAccount.bgt, bgtRef, refUserPublicKey);

    const instructions = instructionRentAccount.concat(buyAndRewardInstructions).concat(mintBgtToReceive).concat(mintBgtToRef)

    let tx = new web3.Transaction().add(...instructions)
    tx.feePayer = testFeePayerWallet.payer.publicKey
    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    tx.partialSign(testFeePayerWallet.payer)
    tx.partialSign(testMasterWallet.payer)
    tx.partialSign(userPayer)
    const rawTx = tx.serialize()
    const receipt = await connection.sendRawTransaction(rawTx)
    logOnExplorer(receipt);
}

async function logBalance(wallet) {
    console.log('Balance of wallet: ', wallet.publicKey.toString());

    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log('SOL: ', solBalance/1e9)
    const associatedAccount = await getListAssociatedAccount(wallet.publicKey);

    let bicBalance = 0
    try {
        bicBalance = (await connection.getTokenAccountBalance(associatedAccount.bic)).value.uiAmount
        console.log('BIC: ', bicBalance);
    } catch (e) {
        console.log('BIC account not created.');
    }
    let birBalance = 0
    try {
        birBalance = (await connection.getTokenAccountBalance(associatedAccount.bir)).value.uiAmount
        console.log('BIC: ', birBalance);
    } catch (e) {
        console.log('BIR account not created.');
    }
    let bgtBalance = 0
    try {
        bgtBalance = (await connection.getTokenAccountBalance(associatedAccount.bgt)).value.uiAmount
        console.log('BGT: ', bgtBalance);
    } catch (e) {
        console.log('BGT account not created.');
    }
    let usdtBalance = 0
    try {
        usdtBalance = (await connection.getTokenAccountBalance(associatedAccount.usdt)).value.uiAmount
        console.log('USDT: ', bgtBalance);
    } catch (e) {
        console.log('USDT account not created.');
    }
    console.log('-------------------------------------------------------------')
}


async function thawThenMintThenFreezeBgtAgain(dest, mintAmount, userPublicKey) {
    let isCreatedAccount = true;
    try {
        await connection.getTokenAccountBalance(dest)
    } catch (e) {
        isCreatedAccount = false
    }
    return [
        isCreatedAccount ? Token.createThawAccountInstruction(
            TOKEN_PROGRAM_ID,
            dest,
            bgtTokenPublicKey,
            testMasterWallet.publicKey,
            []
        ) : Token.createAssociatedTokenAccountInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            bgtTokenPublicKey,
            dest,
            userPublicKey,
            testFeePayerWallet.publicKey
        ),
        Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            bgtTokenPublicKey,
            dest,
            testMasterWallet.publicKey,
            [],
            mintAmount
        ),
        Token.createFreezeAccountInstruction(
            TOKEN_PROGRAM_ID,
            dest,
            bgtTokenPublicKey,
            testMasterWallet.publicKey,
            []
        )
    ]
}

// Stuff to check if account free con transfer or mint?
// async function freezeAccount() {
//     const bicToken = new Token(connection, bicTokenPublicKey, TOKEN_PROGRAM_ID, testFeePayerWallet.payer)
//
//
//     const bicAssociatedAccount1 = await Token.getAssociatedTokenAddress(
//         ASSOCIATED_TOKEN_PROGRAM_ID,
//         TOKEN_PROGRAM_ID,
//         bicTokenPublicKey,
//         user1Wallet.publicKey
//     )
//
//     const masterBicAssociatedAccount = await Token.getAssociatedTokenAddress(
//         ASSOCIATED_TOKEN_PROGRAM_ID,
//         TOKEN_PROGRAM_ID,
//         bicTokenPublicKey,
//         testMasterWallet.publicKey
//     )
//
//     const bicAssociatedAccount2 = await Token.getAssociatedTokenAddress(
//         ASSOCIATED_TOKEN_PROGRAM_ID,
//         TOKEN_PROGRAM_ID,
//         bicTokenPublicKey,
//         user2Wallet.publicKey
//     )
//     // await bicToken.freezeAccount(bicAssociatedAccount1, testMasterWallet.publicKey, [testMasterWallet.payer])
//
//     // const transfer = await bicToken.transfer(bicAssociatedAccount1, bicAssociatedAccount2, user1Wallet.publicKey, [user1Wallet.payer], 0.01)
//     // console.log('transfer: ', transfer)
//
//     await bicToken.mintTo(bicAssociatedAccount1, testMasterWallet.publicKey, [testMasterWallet.payer]);
// }


