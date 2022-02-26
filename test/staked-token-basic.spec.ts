import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, constants, utils} from 'ethers';
import {HOUR, SECOND} from '../constants';
import {AssetConfigInput, Fixture} from '../types';
import {advanceTimeAndBlock, getLatestBlockTimestamp} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';
import {getRewards, getUserIndex, stakeToken} from './helpers';

const {Zero, MaxUint256} = constants;

use(waffleChai);

describe('StakedToken Basics', () => {
  const fixture = {} as Fixture;

  before(async () => {
    Object.assign(fixture, await setupFixture());
    const {stakedKimber, rewardsVault} = fixture;

    // mint kimber to contract as rewards
    await rewardsVault.kimberToken.mint(utils.parseEther('1000000000'));
    await rewardsVault.kimberToken.approve(stakedKimber.address, MaxUint256);
  });

  it('check if initial configuration after initialize() is correct', async () => {
    const {stakedKimber, kimberToken, rewardsVault} = fixture;

    expect(await stakedKimber.name()).to.be.equal('Staked Kimber');
    expect(await stakedKimber.symbol()).to.be.equal('stkKIMBER');
    expect(await stakedKimber.decimals()).to.be.equal(18);
    expect(await stakedKimber.REVISION()).to.be.equal(1);
    expect(await stakedKimber.STAKED_TOKEN()).to.be.equal(kimberToken.address);
    expect(await stakedKimber.REWARD_TOKEN()).to.be.equal(kimberToken.address);
    expect(await stakedKimber.COOLDOWN_SECONDS()).to.be.equal(24 * HOUR);
    expect(await stakedKimber.UNSTAKE_WINDOW()).to.be.equal(48 * HOUR);
    expect(await stakedKimber.REWARDS_VAULT()).to.be.equal(rewardsVault.address);
  });

  it('reverted: try to stake 0 amount', async () => {
    const {user1} = fixture;

    await expect(user1.stakedKimber.stake(user1.address, Zero)).to.be.revertedWith('INVALID_ZERO_AMOUNT');
  });

  it('reverted: try to activate cooldown with 0 staked amount', async () => {
    const {user1} = fixture;

    await expect(user1.stakedKimber.cooldown()).to.be.revertedWith('INVALID_BALANCE_ON_COOLDOWN');
  });

  it('User 1 stakes 50 KIMBER: receives 50 SKIMBER, StakedAave balance of KIMBER is 50 and his rewards to claim are 0', async () => {
    const {kimberToken, stakedKimber, user1, emissionManager} = fixture;

    const amount = utils.parseEther('50');
    await user1.kimberToken.mint(amount);
    await user1.kimberToken.approve(stakedKimber.address, MaxUint256);

    const emissionPerSecond = 100;
    const totalStaked = await stakedKimber.totalSupply();
    const underlyingAsset = stakedKimber.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.stakedKimber.configureAssets(input);
    await expect(Promise.resolve(tx))
      .to.emit(stakedKimber, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const userStakedBalanceBefore = await stakedKimber.balanceOf(user1.address);
    const userTokenBalanceBefore = await kimberToken.balanceOf(user1.address);
    const contractTokenBalanceBefore = await kimberToken.balanceOf(stakedKimber.address);

    await stakeToken(stakedKimber, user1, user1, amount, {shouldReward: false, timeTravel: 100 * SECOND});

    const userStakedBalanceAfter = await stakedKimber.balanceOf(user1.address);
    const userTokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    const contractTokenBalanceAfter = await kimberToken.balanceOf(stakedKimber.address);

    expect(userStakedBalanceAfter).to.be.equal(userStakedBalanceBefore.add(amount), 'user staked balance');
    expect(contractTokenBalanceAfter).to.be.equal(contractTokenBalanceBefore.add(amount), 'contract token balance');
    expect(userTokenBalanceAfter).to.be.equal(userTokenBalanceBefore.sub(amount), 'user token balance');
  });

  it('user1 stakes 20 KIMBER more: his total SKIMBER balance increases, StakedAave balance of Aave increases and his reward until now get kimbermulated', async () => {
    const {kimberToken, stakedKimber, user1} = fixture;

    const amount = utils.parseEther('20');
    await user1.kimberToken.mint(amount);

    const userStakedBalanceBefore = await stakedKimber.balanceOf(user1.address);
    const userTokenBalanceBefore = await kimberToken.balanceOf(user1.address);
    const contractTokenBalanceBefore = await kimberToken.balanceOf(stakedKimber.address);

    await stakeToken(stakedKimber, user1, user1, amount, {shouldReward: true, timeTravel: 100 * SECOND});

    const userStakedBalanceAfter = await stakedKimber.balanceOf(user1.address);
    const userTokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    const contractTokenBalanceAfter = await kimberToken.balanceOf(stakedKimber.address);

    expect(userStakedBalanceAfter).to.be.equal(userStakedBalanceBefore.add(amount), 'user staked balance');
    expect(contractTokenBalanceAfter).to.be.equal(contractTokenBalanceBefore.add(amount), 'contract token balance');
    expect(userTokenBalanceAfter).to.be.equal(userTokenBalanceBefore.sub(amount), 'user token balance');
  });

  it('user1 claims half of rewards', async () => {
    const {kimberToken, stakedKimber, user1} = fixture;

    const userTokenBalanceBefore = await kimberToken.balanceOf(user1.address);

    const totalRewards = await stakedKimber.stakerRewardsToClaim(user1.address);
    const amountToClaim = totalRewards.div(2);
    const tx = await user1.stakedKimber.claimRewards(user1.address, amountToClaim);

    await expect(Promise.resolve(tx))
      .to.emit(stakedKimber, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, amountToClaim);

    const userTokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    expect(userTokenBalanceAfter).to.be.eq(userTokenBalanceBefore.add(amountToClaim));
  });

  it('reverted: user1 claims higher rewards than the current balance ', async () => {
    const {kimberToken, stakedKimber, user1} = fixture;

    const userTokenBalanceBefore = await kimberToken.balanceOf(user1.address);

    const totalRewards = await stakedKimber.stakerRewardsToClaim(user1.address);
    const amountToClaim = totalRewards.mul(2);
    await expect(user1.stakedKimber.claimRewards(user1.address, amountToClaim)).to.be.revertedWith('INVALID_AMOUNT');

    const userTokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    expect(userTokenBalanceAfter).to.be.eq(userTokenBalanceBefore);
  });

  it('user1 claims all of rewards', async () => {
    const {kimberToken, stakedKimber, user1} = fixture;

    const underlyingAsset = stakedKimber.address;
    const userTokenBalanceBefore = await kimberToken.balanceOf(user1.address);
    const userStakedBalanceBefore = await stakedKimber.balanceOf(user1.address);
    const userIndexBefore = await getUserIndex(stakedKimber, user1.address, underlyingAsset);

    const totalRewards = await stakedKimber.stakerRewardsToClaim(user1.address);
    const amountToClaim = MaxUint256;
    const tx = await user1.stakedKimber.claimRewards(user1.address, amountToClaim);

    const userIndexAfter = await getUserIndex(stakedKimber, user1.address, underlyingAsset);

    const expectedAccruedRewards = getRewards(userStakedBalanceBefore, userIndexAfter, userIndexBefore);

    await expect(Promise.resolve(tx))
      .to.emit(stakedKimber, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, expectedAccruedRewards.add(totalRewards));

    const userTokenBalanceAfter = await kimberToken.balanceOf(user1.address);

    expect(userTokenBalanceAfter).to.be.eq(userTokenBalanceBefore.add(expectedAccruedRewards).add(totalRewards));
  });

  it('user2 stakes 50 KIMBER, with the rewards not enabled', async () => {
    const {kimberToken, stakedKimber, user2, emissionManager} = fixture;

    const amount = utils.parseEther('50');
    await user2.kimberToken.mint(amount);
    await user2.kimberToken.approve(stakedKimber.address, MaxUint256);

    const emissionPerSecond = Zero;
    const totalStaked = Zero;
    const underlyingAsset = stakedKimber.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.stakedKimber.configureAssets(input);
    await expect(Promise.resolve(tx))
      .to.emit(stakedKimber, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const userStakedBalanceBefore = await stakedKimber.balanceOf(user2.address);
    const userTokenBalanceBefore = await kimberToken.balanceOf(user2.address);
    const contractTokenBalanceBefore = await kimberToken.balanceOf(stakedKimber.address);

    await stakeToken(stakedKimber, user2, user2, amount, {shouldReward: false, timeTravel: 100 * SECOND});

    expect(await stakedKimber.getTotalRewardsBalance(user2.address)).to.be.eq(Zero);

    const userStakedBalanceAfter = await stakedKimber.balanceOf(user2.address);
    const userTokenBalanceAfter = await kimberToken.balanceOf(user2.address);
    const contractTokenBalanceAfter = await kimberToken.balanceOf(stakedKimber.address);

    expect(userStakedBalanceAfter).to.be.equal(userStakedBalanceBefore.add(amount), 'user staked balance');
    expect(contractTokenBalanceAfter).to.be.equal(contractTokenBalanceBefore.add(amount), 'contract token balance');
    expect(userTokenBalanceAfter).to.be.equal(userTokenBalanceBefore.sub(amount), 'user token balance');
  });

  it('user2 stakes 30 KIMBER more, with the rewards not enabled', async () => {
    const {kimberToken, stakedKimber, user2} = fixture;

    const amount = utils.parseEther('30');
    await user2.kimberToken.mint(amount);

    const userStakedBalanceBefore = await stakedKimber.balanceOf(user2.address);
    const userTokenBalanceBefore = await kimberToken.balanceOf(user2.address);
    const contractTokenBalanceBefore = await kimberToken.balanceOf(stakedKimber.address);

    await stakeToken(stakedKimber, user2, user2, amount, {shouldReward: false, timeTravel: 100 * SECOND});

    expect(await stakedKimber.getTotalRewardsBalance(user2.address)).to.be.eq(Zero);

    const userStakedBalanceAfter = await stakedKimber.balanceOf(user2.address);
    const userTokenBalanceAfter = await kimberToken.balanceOf(user2.address);
    const contractTokenBalanceAfter = await kimberToken.balanceOf(stakedKimber.address);

    expect(userStakedBalanceAfter).to.be.equal(userStakedBalanceBefore.add(amount), 'user staked balance');
    expect(contractTokenBalanceAfter).to.be.equal(contractTokenBalanceBefore.add(amount), 'contract token balance');
    expect(userTokenBalanceAfter).to.be.equal(userTokenBalanceBefore.sub(amount), 'user token balance');
  });

  it('check staker cooldown with stake() while being on valid unstake window', async () => {
    const {stakedKimber, user3} = fixture;
    const amount1 = utils.parseEther('50');
    const amount2 = utils.parseEther('20');

    const COOLDOWN_SECONDS = await stakedKimber.COOLDOWN_SECONDS();
    await user3.kimberToken.mint(amount1.add(amount2));
    await user3.kimberToken.approve(stakedKimber.address, MaxUint256);

    await stakeToken(stakedKimber, user3, user3, amount1, {shouldReward: false, timeTravel: 100 * SECOND});

    await expect(user3.stakedKimber.redeem(user3.address, MaxUint256)).to.be.revertedWith('UNSTAKE_WINDOW_FINISHED');

    await user3.stakedKimber.cooldown();
    const cooldownTimestampBefore = await stakedKimber.stakersCooldowns(user3.address);
    let latestTimestamp = await getLatestBlockTimestamp();

    expect(cooldownTimestampBefore).to.be.eq(BigNumber.from(latestTimestamp));

    await advanceTimeAndBlock(COOLDOWN_SECONDS.toNumber());

    await user3.stakedKimber.stake(user3.address, amount2);
    const cooldownTimestampAfter = await stakedKimber.stakersCooldowns(user3.address);

    latestTimestamp = await getLatestBlockTimestamp();

    const expectedCooldownTimestamp = amount2
      .mul(latestTimestamp)
      .add(amount1.mul(cooldownTimestampBefore))
      .div(amount2.add(amount1));

    expect(cooldownTimestampAfter).to.be.eq(expectedCooldownTimestamp);
  });
});
