import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, constants, utils} from 'ethers';
import {SECOND} from '../constants';
import {StakedKimber} from '../typechain';
import {Address, AssetConfigInput, Fixture, User} from '../types';
import {advanceTimeAndBlock, getLatestBlockTimestamp} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';
import {stakeToken, transferStakedToken} from './helpers';

const {Zero, MaxUint256} = constants;

use(waffleChai);

describe('StakedToken Transfer', () => {
  const fixture = {} as Fixture;
  let COOLDOWN_SECONDS: BigNumber;
  let UNSTAKE_WINDOW: BigNumber;
  let underlyingAsset: Address;

  before(async () => {
    Object.assign(fixture, await setupFixture());
    const {stakedKimber, rewardsVault} = fixture;

    underlyingAsset = stakedKimber.address;

    COOLDOWN_SECONDS = await stakedKimber.COOLDOWN_SECONDS();
    UNSTAKE_WINDOW = await stakedKimber.UNSTAKE_WINDOW();

    // mint KIMBER to contract as rewards
    await rewardsVault.kimberToken.mint(utils.parseEther('1000000000'));
    await rewardsVault.kimberToken.approve(stakedKimber.address, MaxUint256);
  });

  const configureNonZeroEmission = async (emissionManager: User, stakedKimber: StakedKimber) => {
    const emissionPerSecond = 100;
    const totalStaked = await stakedKimber.totalSupply();
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    await emissionManager.stakedKimber.configureAssets(input);
  };

  const configureZeroEmission = async (emissionManager: User) => {
    const emissionPerSecond = Zero;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked: Zero,
        underlyingAsset,
      },
    ];
    await emissionManager.stakedKimber.configureAssets(input);
  };

  it('user1 stakes 50 KIMBER', async () => {
    const {stakedKimber, user1, emissionManager} = fixture;

    await configureNonZeroEmission(emissionManager, stakedKimber);

    const amount = utils.parseEther('50');
    await user1.kimberToken.mint(amount);
    await user1.kimberToken.approve(stakedKimber.address, MaxUint256);

    await stakeToken(stakedKimber, user1, user1, amount, {shouldReward: false, timeTravel: 100 * SECOND});
  });

  it('user1 transfer 50 stkKIMBER to user2', async () => {
    const {stakedKimber, user1, user2, emissionManager} = fixture;

    await configureNonZeroEmission(emissionManager, stakedKimber);

    const amount = utils.parseEther('50');

    await transferStakedToken(stakedKimber, user1, user2, amount, {
      shouldSenderReward: true,
      shouldRecieverReward: false,
      timeTravel: 100 * SECOND,
    });
  });

  it('user2 transfer 50 stkKIMBER to himself', async () => {
    const {stakedKimber, user2, emissionManager} = fixture;

    await configureNonZeroEmission(emissionManager, stakedKimber);

    const amount = utils.parseEther('50');

    await transferStakedToken(stakedKimber, user2, user2, amount, {
      shouldRecieverReward: true,
      shouldSenderReward: true,
      timeTravel: 100 * SECOND,
    });
  });

  it('user2 transfers 50 stkKIMBER to user3, with rewards not enabled', async () => {
    const {stakedKimber, user2, user3, emissionManager} = fixture;

    await configureZeroEmission(emissionManager);

    const amount = utils.parseEther('50');

    await transferStakedToken(stakedKimber, user2, user3, amount, {
      shouldRecieverReward: false,
      shouldSenderReward: false,
      timeTravel: 100 * SECOND,
    });
  });

  it('user4 stakes and transfers 50 stkKIMBER to user3, with rewards not enabled', async () => {
    const {stakedKimber, user3, user4, emissionManager} = fixture;

    await configureZeroEmission(emissionManager);

    const amount = utils.parseEther('50');

    await user4.kimberToken.mint(amount);
    await user4.kimberToken.approve(stakedKimber.address, MaxUint256);

    await stakeToken(stakedKimber, user4, user4, amount, {shouldReward: false, timeTravel: 100 * SECOND});

    await transferStakedToken(stakedKimber, user4, user3, amount, {
      shouldRecieverReward: false,
      shouldSenderReward: false,
    });
  });

  it('sender activates cooldown, transfer all to reciever, sender cooldown should be reset if all amount get transfered', async () => {
    const {stakedKimber, user3: sender, user5: reciever, emissionManager} = fixture;

    await configureZeroEmission(emissionManager);

    const amount = utils.parseEther('100');

    await sender.stakedKimber.cooldown();
    const latestTimestamp = await getLatestBlockTimestamp();
    const cooldownTimestamp = await stakedKimber.stakersCooldowns(sender.address);
    expect(cooldownTimestamp).to.be.eq(latestTimestamp);

    await transferStakedToken(stakedKimber, sender, reciever, amount, {
      shouldRecieverReward: false,
      shouldSenderReward: false,
      timeTravel: 100 * SECOND,
    });

    expect(await stakedKimber.stakersCooldowns(sender.address)).to.be.eq(Zero);
    expect(await stakedKimber.balanceOf(sender.address)).to.be.eq(Zero);
    expect(await stakedKimber.balanceOf(reciever.address)).to.be.gt(Zero);
  });

  it('sender activates cooldown, transfer to reciever, reciever cooldown should be reset if sender cooldown gets expired', async () => {
    const {stakedKimber, user3: reciever, user5: sender, emissionManager} = fixture;

    await configureZeroEmission(emissionManager);

    const amount = utils.parseEther('10');

    await sender.stakedKimber.cooldown();

    await reciever.kimberToken.approve(stakedKimber.address, MaxUint256);
    await reciever.kimberToken.mint(amount);
    await reciever.stakedKimber.stake(reciever.address, amount);
    await reciever.stakedKimber.cooldown();

    await advanceTimeAndBlock(COOLDOWN_SECONDS.add(UNSTAKE_WINDOW).add(1).toNumber());

    // Transfer staked KIMBER from sender to receiver, it will also transfer the cooldown status from sender to the receiver
    await transferStakedToken(stakedKimber, sender, reciever, amount, {
      shouldRecieverReward: false,
      shouldSenderReward: false,
      timeTravel: 100 * SECOND,
    });

    expect(await stakedKimber.stakersCooldowns(reciever.address)).to.be.eq(Zero);
    expect(await stakedKimber.balanceOf(sender.address)).to.be.gt(Zero);
    expect(await stakedKimber.balanceOf(reciever.address)).to.be.gt(Zero);
  });

  it('sender activates cooldown, transfer to reciever, reciever cooldown should be the same if sender cooldown is less than reciever cooldown', async () => {
    const {stakedKimber, user3: reciever, user5: sender, emissionManager} = fixture;

    await configureZeroEmission(emissionManager);

    const amount = utils.parseEther('10');

    await sender.stakedKimber.cooldown();
    await advanceTimeAndBlock(5 * SECOND);
    await reciever.stakedKimber.cooldown();
    const recieverCooldownBefore = await stakedKimber.stakersCooldowns(reciever.address);

    // Transfer staked KIMBER from sender to receiver, it will also transfer the cooldown status from sender to the receiver
    await transferStakedToken(stakedKimber, sender, reciever, amount, {
      shouldRecieverReward: false,
      shouldSenderReward: false,
      timeTravel: 100 * SECOND,
    });

    const recieverCooldownAfter = await stakedKimber.stakersCooldowns(reciever.address);

    expect(recieverCooldownAfter).to.be.eq(recieverCooldownBefore);
    expect(await stakedKimber.balanceOf(sender.address)).to.be.gt(Zero);
    expect(await stakedKimber.balanceOf(reciever.address)).to.be.gt(Zero);
  });
});
