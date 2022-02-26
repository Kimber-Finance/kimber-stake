import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, constants, ContractReceipt} from 'ethers';
import {DistributionManager, IncentivesController, StakedKimber} from '../../typechain';
import {Address, User} from '../../types';
import {advanceTimeAndBlock, getLatestBlockTimestamp} from '../../utils/hhNetwork';

const {Zero} = constants;

use(waffleChai);

export const getLinearCumulatedRewards = (
  emissionPerSecond: BigNumber,
  lastUpdateTimestamp: BigNumber,
  currentTimestamp: BigNumber
): BigNumber => {
  const timeDelta = currentTimestamp.sub(lastUpdateTimestamp);
  return timeDelta.mul(emissionPerSecond);
};

export const getNormalizedDistribution = (
  totalBalance: BigNumber,
  currentIndex: BigNumber,
  emissionPerSecond: BigNumber,
  lastUpdateTimestamp: BigNumber,
  currentTimestamp: BigNumber,
  emissionEndTimestamp: BigNumber,
  precision = 18
): BigNumber => {
  if (totalBalance.isZero() || emissionPerSecond.isZero() || lastUpdateTimestamp.gte(emissionEndTimestamp)) {
    return currentIndex;
  }
  const linearReward = getLinearCumulatedRewards(
    emissionPerSecond,
    lastUpdateTimestamp,
    currentTimestamp.gte(emissionEndTimestamp) ? emissionEndTimestamp : currentTimestamp
  );

  return linearReward.mul(BigNumber.from(10).pow(precision)).div(totalBalance).add(currentIndex);
};

export const getRewards = (
  principalUserBalance: BigNumber,
  assetIndex: BigNumber,
  userIndex: BigNumber,
  precision = 18
) => {
  return principalUserBalance.mul(assetIndex.sub(userIndex)).div(BigNumber.from(10).pow(precision));
};

export const getUserIndex = async (
  distributionManager: DistributionManager | IncentivesController | StakedKimber,
  user: Address,
  asset: string
): Promise<BigNumber> => {
  return await distributionManager.getUserAssetData(user, asset);
};

export const getAssetData = async (
  distributionManager: DistributionManager | IncentivesController | StakedKimber,
  underlyingAsset: Address
) => {
  return await distributionManager.assets(underlyingAsset);
};

export const doIncentiveAction = async (
  incentivesController: IncentivesController,
  underlyingAsset: Address,
  user: Address,
  stakedByUser: BigNumber,
  totalStaked: BigNumber,
  action: () => Promise<ContractReceipt>,
  options?: {
    timeTravel?: number;
  }
) => {
  await action();

  const unclaimedRewardsBefore = await incentivesController.getUserUnclaimedRewards(user);

  if (options?.timeTravel) {
    await advanceTimeAndBlock(options.timeTravel);
  }
  const txTimestamp = await getLatestBlockTimestamp();

  const userIndex = await getUserIndex(incentivesController, user, underlyingAsset);
  const assetData = await getAssetData(incentivesController, underlyingAsset);
  const distributionEndTimestamp = await incentivesController.DISTRIBUTION_END();

  const expectedAssetIndex = getNormalizedDistribution(
    totalStaked,
    assetData.index,
    assetData.emissionPerSecond,
    assetData.lastUpdateTimestamp,
    BigNumber.from(txTimestamp),
    distributionEndTimestamp
  );

  const expectedAccruedRewards = getRewards(stakedByUser, expectedAssetIndex, userIndex);
  const unclaimedRewards = await incentivesController.getRewardsBalance([underlyingAsset], user);
  expect(unclaimedRewards).to.be.equal(unclaimedRewardsBefore.add(expectedAccruedRewards));
};

export const stakeToken = async (
  stakedToken: StakedKimber,
  user: User,
  onBehalfOf: User,
  amount: BigNumber,
  options?: {
    shouldReward: boolean;
    timeTravel?: number;
  }
) => {
  const rewardsBalanceBefore = await stakedToken.getTotalRewardsBalance(user.address);
  const stakedByUser = await stakedToken.balanceOf(user.address);
  const userIndexBefore = await getUserIndex(stakedToken, user.address, stakedToken.address);

  const tx = stakedToken.connect(user.signer).stake(onBehalfOf.address, amount);

  if (options?.timeTravel) {
    await advanceTimeAndBlock(options.timeTravel);
  }

  const userIndexAfter = await getUserIndex(stakedToken, user.address, stakedToken.address);
  const rewardsBalanceAfter = await stakedToken.getTotalRewardsBalance(user.address);

  const expectedAccruedRewards = getRewards(stakedByUser, userIndexAfter, userIndexBefore);
  console.log(
    'expectedAccruedRewards',
    expectedAccruedRewards.toString(),
    '\nrewardsBalanceBefore',
    rewardsBalanceBefore.toString(),
    'RewardsBalanceAfter',
    rewardsBalanceAfter.toString(),
    '\nuserIndexBefore',
    userIndexBefore.toString(),
    'userIndexAfter',
    userIndexAfter.toString()
  );

  if (options?.shouldReward) {
    expect(expectedAccruedRewards).to.be.gt(Zero);
    // TODO: change lte to eq?
    expect(rewardsBalanceAfter).to.be.lte(rewardsBalanceBefore.add(expectedAccruedRewards));
  } else {
    expect(expectedAccruedRewards).to.be.eq(Zero);
  }

  if (expectedAccruedRewards.gt(Zero)) {
    await expect(Promise.resolve(tx))
      .to.emit(stakedToken, 'RewardsAccrued')
      .withArgs(user.address, expectedAccruedRewards);
  }
};

export const transferStakedToken = async (
  stakedToken: StakedKimber,
  sender: User,
  reciever: User,
  amount: BigNumber,
  options?: {
    shouldSenderReward: boolean;
    shouldRecieverReward: boolean;
    timeTravel?: number;
  }
) => {
  const senderRewardsBalanceBefore = await stakedToken.getTotalRewardsBalance(sender.address);
  const senderStakedBalance = await stakedToken.balanceOf(sender.address);
  const senderIndexBefore = await getUserIndex(stakedToken, sender.address, stakedToken.address);

  const recieverRewardsBalanceBefore = await stakedToken.getTotalRewardsBalance(reciever.address);
  const recieverStakedBalance = await stakedToken.balanceOf(reciever.address);
  const recieverIndexBefore = await getUserIndex(stakedToken, reciever.address, stakedToken.address);

  const tx = await stakedToken.connect(sender.signer).transfer(reciever.address, amount);

  if (options?.timeTravel) {
    await advanceTimeAndBlock(options.timeTravel);
  }

  const senderIndexAfter = await getUserIndex(stakedToken, sender.address, stakedToken.address);
  const senderRewardsBalanceAfter = await stakedToken.getTotalRewardsBalance(sender.address);

  const recieverIndexAfter = await getUserIndex(stakedToken, reciever.address, stakedToken.address);
  const recieverRewardsBalanceAfter = await stakedToken.getTotalRewardsBalance(reciever.address);

  const expectedSenderAccruedRewards = getRewards(senderStakedBalance, senderIndexAfter, senderIndexBefore);
  const expectedRecieverAccruedRewards = getRewards(recieverStakedBalance, recieverIndexAfter, recieverIndexBefore);
  console.log(
    'expectedSenderAccruedRewards',
    expectedSenderAccruedRewards.toString(),
    'senderRewardsBalanceBefore',
    senderRewardsBalanceBefore.toString(),
    'senderRewardsBalanceAfterr',
    senderRewardsBalanceAfter.toString(),
    'senderIndexBefore',
    senderIndexBefore.toString(),
    'senderIndexAfter',
    senderIndexAfter.toString()
  );
  console.log(
    'expectedRecieverAccruedRewards',
    expectedRecieverAccruedRewards.toString(),
    'recieverRewardsBalanceBefore',
    recieverRewardsBalanceBefore.toString(),
    'recieverRewardsBalanceAfterr',
    recieverRewardsBalanceAfter.toString(),
    'recieverIndexBefore',
    recieverIndexBefore.toString(),
    'recieverIndexAfter',
    recieverIndexAfter.toString()
  );

  if (options?.shouldSenderReward) {
    expect(expectedSenderAccruedRewards).to.be.gt(Zero);
    // TODO: change lte to eq?
    expect(senderRewardsBalanceAfter).to.be.lte(senderRewardsBalanceBefore.add(expectedSenderAccruedRewards));
  } else {
    expect(expectedSenderAccruedRewards).to.be.eq(Zero);
  }

  if (expectedSenderAccruedRewards.gt(Zero)) {
    await expect(Promise.resolve(tx))
      .to.emit(stakedToken, 'RewardsAccrued')
      .withArgs(sender.address, expectedSenderAccruedRewards);
  }

  if (options?.shouldRecieverReward) {
    expect(expectedRecieverAccruedRewards).to.be.gt(Zero);
    // TODO: change lte to eq?
    expect(recieverRewardsBalanceAfter).to.be.lte(recieverRewardsBalanceBefore.add(expectedRecieverAccruedRewards));
  } else {
    expect(expectedRecieverAccruedRewards).to.be.eq(Zero);
  }

  if (expectedRecieverAccruedRewards.gt(Zero)) {
    await expect(Promise.resolve(tx))
      .to.emit(stakedToken, 'RewardsAccrued')
      .withArgs(reciever.address, expectedRecieverAccruedRewards);
  }
};
