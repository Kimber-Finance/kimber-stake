import {BigNumber, constants, ContractReceipt, ContractTransaction} from 'ethers';
import {ethers} from 'hardhat';

const {Zero} = constants;

export const waitForTx = async (tx: ContractTransaction): Promise<ContractReceipt> => await tx.wait(1);

export const advanceBlock = async (timestamp: number): Promise<void> => {
  await ethers.provider.send('evm_mine', [timestamp]);
};

export const increaseTime = async (secondsToIncrease: number): Promise<void> => {
  await ethers.provider.send('evm_increaseTime', [secondsToIncrease]);
  await ethers.provider.send('evm_mine', []);
};

// Workaround for time travel tests bug: https://github.com/Tonyhaenn/hh-time-travel/blob/0161d993065a0b7585ec5a043af2eb4b654498b8/test/test.js#L12
export const advanceTimeAndBlock = async function (seconds: number): Promise<void> {
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(currentBlockNumber);

  if (currentBlock === null) {
    /* Workaround for https://github.com/nomiclabs/hardhat/issues/1183
     */
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine', []);
    //Set the next blocktime back to 15 seconds
    await ethers.provider.send('evm_increaseTime', [15]);
    return;
  }
  const currentTime = currentBlock.timestamp;
  const futureTime = currentTime + seconds;
  await ethers.provider.send('evm_setNextBlockTimestamp', [futureTime]);
  await ethers.provider.send('evm_mine', []);
};

export const getTxCostAndTimestamp = async (tx: ContractReceipt): Promise<{txTimestamp: number; txCost: BigNumber}> => {
  if (!tx.blockNumber || !tx.transactionHash || !tx.cumulativeGasUsed) {
    throw new Error('No tx blocknumber');
  }
  const txTimestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

  const txInfo = await ethers.provider.getTransaction(tx.transactionHash);
  const txCost = tx.cumulativeGasUsed.mul(txInfo?.gasPrice || Zero);

  return {txCost, txTimestamp};
};

export const getLatestBlockTimestamp = async (): Promise<number> => {
  return (await ethers.provider.getBlock('latest')).timestamp;
};
