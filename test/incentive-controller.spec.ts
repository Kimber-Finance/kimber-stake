import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, constants, utils} from 'ethers';
import {DAY, HOUR, PSM_STAKER_PREMIUM, YEAR} from '../constants';
import {AssetConfigInput, Fixture} from '../types';
import {advanceTimeAndBlock, waitForTx} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';
import {doIncentiveAction} from './helpers';

const {Zero, MaxUint256} = constants;

use(waffleChai);

describe('IncentiveController', () => {
  const fixture = {} as Fixture;

  before(async () => {
    Object.assign(fixture, await setupFixture());

    const {rewardsVault, incentivesController} = fixture;
    // mint reward token to reward vault for testing
    rewardsVault.kimberToken.mint(utils.parseEther('100000000'));
    rewardsVault.kimberToken.approve(incentivesController.address, MaxUint256);
  });

  beforeEach(async () => {
    const {mockADAI} = fixture;
    // always reset user state since we share it for all the users
    await mockADAI.cleanUserState();
  });

  it('check if initial configuration after initialize() is correct', async () => {
    const {incentivesController, stakedKimber, kimberToken, rewardsVault} = fixture;

    expect(await incentivesController.REVISION()).to.be.equal(1);
    expect(await incentivesController.REWARD_TOKEN()).to.be.equal(kimberToken.address);
    expect(await incentivesController.PSM()).to.be.equal(stakedKimber.address);
    expect(await incentivesController.EXTRA_PSM_REWARD()).to.be.equal(PSM_STAKER_PREMIUM);
    expect(await incentivesController.REWARDS_VAULT()).to.be.equal(rewardsVault.address);

    expect(await kimberToken.allowance(incentivesController.address, stakedKimber.address)).to.be.equal(MaxUint256);
  });

  it('reverted: call initialize the second time', async () => {
    const {incentivesControllerProxy, incentivesController, admin} = fixture;

    const encodedIntializeIncentivesController = incentivesController.interface.encodeFunctionData('initialize');
    await expect(
      incentivesControllerProxy['initialize(address,address,bytes)'](
        incentivesController.address,
        admin.address,
        encodedIntializeIncentivesController
      )
    ).to.be.reverted;
  });

  it('reverted: configure asset only by emission manager', async () => {
    const {user1} = fixture;

    await expect(user1.incentivesController.configureAssets([])).to.be.revertedWith('ONLY_EMISSION_MANAGER');
  });

  it('configure aDAI as underlying asset with 0 emission and 0 user balance; expect 0 rewards', async () => {
    const {emissionManager, incentivesController, mockADAI, user1} = fixture;

    const emissionPerSecond = 0;
    const stakedByUser = utils.parseEther('0');
    const totalStaked = utils.parseEther('0');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).to.be.equal(Zero);
  });

  it('configure aDAI as underlying asset with 0 emission and 1 user balance; expect 0 rewards', async () => {
    const {emissionManager, incentivesController, mockADAI, user1} = fixture;

    const emissionPerSecond = 0;
    const stakedByUser = utils.parseEther('1');
    const totalStaked = utils.parseEther('2');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).to.be.equal(Zero);
  });

  it('configure aDAI as underlying asset with 100 emission and user1 has no balance; expect 0 rewards', async () => {
    const {emissionManager, incentivesController, mockADAI, user1} = fixture;

    const emissionPerSecond = 100;
    const stakedByUser = utils.parseEther('0');
    const totalStaked = utils.parseEther('1');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).to.be.equal(Zero);
  });

  it('configure aDAI as underlying asset with 100 emission and user1 has balance; expect some rewards', async () => {
    const {emissionManager, incentivesController, mockADAI, user1} = fixture;

    const emissionPerSecond = 100;
    const stakedByUser = utils.parseEther('1');
    const totalStaked = utils.parseEther('2');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).not.to.be.equal(Zero);
  });

  it('user1 claims the rewards', async () => {
    const {incentivesController, mockADAI, user1, kimberToken} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = BigNumber.from(10000);
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user1.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user1.address,
      toStake
    );

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, amountToClaim);

    const tokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.gt(Zero);
  });

  it('user1 claims the rewards and stake; expect the balance should include premium amount', async () => {
    const {incentivesController, mockADAI, user1, stakedKimber} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = BigNumber.from(10000);
    const toStake = true;

    const tokenBalanceBefore = await stakedKimber.balanceOf(user1.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user1.address,
      toStake
    );

    const premium = await incentivesController.EXTRA_PSM_REWARD();
    const amountToClaimPlusPremium = amountToClaim.add(amountToClaim.mul(premium).div(100));

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, amountToClaimPlusPremium);

    const tokenBalanceAfter = await stakedKimber.balanceOf(user1.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(amountToClaimPlusPremium);
  });

  it('user1 claims the rewards to user3', async () => {
    const {incentivesController, mockADAI, user1, user3, kimberToken} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = BigNumber.from(10000);
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user3.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user3.address,
      toStake
    );

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user3.address, amountToClaim);

    const tokenBalanceAfter = await kimberToken.balanceOf(user3.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(amountToClaim);
  });

  it('user1 claims the rewards to user3 and stake; expect user3 the balance should include premium amount', async () => {
    const {incentivesController, mockADAI, user1, user3, stakedKimber} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = BigNumber.from(10000);
    const toStake = true;

    const tokenBalanceBefore = await stakedKimber.balanceOf(user3.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user3.address,
      toStake
    );

    const premium = await incentivesController.EXTRA_PSM_REWARD();
    const amountToClaimPlusPremium = amountToClaim.add(amountToClaim.mul(premium).div(100));

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user3.address, amountToClaimPlusPremium);

    const tokenBalanceAfter = await stakedKimber.balanceOf(user3.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(amountToClaimPlusPremium);
  });

  it('user1 claims the rewards with MaxUint256(-1) amount', async () => {
    const {incentivesController, mockADAI, user1, kimberToken} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = MaxUint256;
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user1.address);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user1.address,
      toStake
    );

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, rewardsBalanceBefore);

    const tokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(rewardsBalanceBefore);

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).to.be.eq(Zero);
  });

  it('configure aDAI as underlying asset with 200 emission and user1 has balance; expect some rewards', async () => {
    const {emissionManager, incentivesController, mockADAI, user1} = fixture;

    const emissionPerSecond = 200;
    const stakedByUser = utils.parseEther('1');
    const totalStaked = utils.parseEther('2');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset, emissionPerSecond);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).not.to.be.equal(Zero);
  });

  it('user1 claims the rewards more than the balance', async () => {
    const {incentivesController, mockADAI, user1, kimberToken} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = utils.parseEther('10000000');
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user1.address);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);

    const claimedTx = await user1.incentivesController.claimRewards(
      [underlyingAsset],
      amountToClaim,
      user1.address,
      toStake
    );

    await expect(Promise.resolve(claimedTx))
      .to.emit(incentivesController, 'RewardsClaimed')
      .withArgs(user1.address, user1.address, rewardsBalanceBefore);

    const tokenBalanceAfter = await kimberToken.balanceOf(user1.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(rewardsBalanceBefore);

    const rewardsBalanceAfter = await incentivesController.getRewardsBalance([underlyingAsset], user1.address);
    expect(rewardsBalanceAfter).to.be.eq(Zero);
  });

  it('user2 has NO rewards, claims 0 rewards, expect 0 claimed amount', async () => {
    const {mockADAI, user2, kimberToken} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = Zero;
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user2.address);

    const tx = await user2.incentivesController.claimRewards([underlyingAsset], amountToClaim, user2.address, toStake);
    await expect(Promise.resolve(tx)).not.to.be.reverted;

    const tokenBalanceAfter = await kimberToken.balanceOf(user2.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(Zero);
  });

  it('user2 has NO rewards, claims 10 rewards, expect 0 claimed amount', async () => {
    const {mockADAI, user2, kimberToken, incentivesController} = fixture;

    const underlyingAsset = mockADAI.address;
    const amountToClaim = utils.parseEther('1');
    const toStake = false;

    const tokenBalanceBefore = await kimberToken.balanceOf(user2.address);

    const rewardsBalanceBefore = await incentivesController.getRewardsBalance([underlyingAsset], user2.address);
    expect(rewardsBalanceBefore).to.be.equal(Zero);

    const tx = await user2.incentivesController.claimRewards([underlyingAsset], amountToClaim, user2.address, toStake);
    await expect(Promise.resolve(tx)).not.to.be.reverted;

    const tokenBalanceAfter = await kimberToken.balanceOf(user2.address);
    expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.eq(Zero);
  });

  it('update config for multiple underlying assets', async () => {
    const {emissionManager, incentivesController, mockADAI, mockAETH} = fixture;

    const emissionPerSecond = 10;
    const totalStaked = Zero;
    const underlyingAsset1 = mockADAI.address;
    const underlyingAsset2 = mockAETH.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset: underlyingAsset1,
      },
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset: underlyingAsset2,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset1, emissionPerSecond);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset2, emissionPerSecond);

    const {emissionPerSecond: emissionPerSecond1} = await incentivesController.assets(underlyingAsset1);
    expect(emissionPerSecond1).to.be.eq(emissionPerSecond);

    const {emissionPerSecond: emissionPerSecond2} = await incentivesController.assets(underlyingAsset2);
    expect(emissionPerSecond2).to.be.eq(emissionPerSecond);
  });

  it('indexes should change if emission are set not to 0, and pool has deposited and borrowed funds', async () => {
    const {emissionManager, incentivesController, mockADAI, mockAETH, user1, user2} = fixture;

    const emissionPerSecond1 = 10;
    const emissionPerSecond2 = 20;
    const totalStaked = utils.parseEther('20');
    const stakedByUser = utils.parseEther('1');
    const underlyingAsset1 = mockADAI.address;
    const underlyingAsset2 = mockAETH.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond: emissionPerSecond1,
        totalStaked,
        underlyingAsset: underlyingAsset1,
      },
      {
        emissionPerSecond: emissionPerSecond2,
        totalStaked,
        underlyingAsset: underlyingAsset2,
      },
    ];
    const tx = await emissionManager.incentivesController.configureAssets(input);
    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset1, emissionPerSecond1);

    await expect(Promise.resolve(tx))
      .to.emit(incentivesController, 'AssetConfigUpdated')
      .withArgs(underlyingAsset2, emissionPerSecond2);

    const {index: index1Before} = await incentivesController.assets(underlyingAsset1);
    const {index: index2Before} = await incentivesController.assets(underlyingAsset2);

    await doIncentiveAction(
      incentivesController,
      underlyingAsset2,
      user2.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockAETH.handleActionOnAic(user2.address, stakedByUser, totalStaked);
        return await waitForTx(await mockAETH.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    await doIncentiveAction(
      incentivesController,
      underlyingAsset1,
      user1.address,
      stakedByUser,
      totalStaked,
      async () => {
        await mockADAI.handleActionOnAic(user1.address, stakedByUser, totalStaked);
        return await waitForTx(await mockADAI.setUserBalanceAndSupply(stakedByUser, totalStaked));
      },
      {
        timeTravel: 1 * HOUR,
      }
    );

    const {index: index1After} = await incentivesController.assets(underlyingAsset1);
    const {index: index2After} = await incentivesController.assets(underlyingAsset2);
    expect(index1After).not.to.be.eq(index1Before);
    expect(index2After).not.to.be.eq(index2Before);
  });

  it('indexes should cumulate rewards if next emission is 0 and should not changed afterwards', async () => {
    const {emissionManager, incentivesController, mockADAI} = fixture;

    const emissionPerSecond = 0;
    const totalStaked = utils.parseEther('20');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset: underlyingAsset,
      },
    ];
    await waitForTx(await emissionManager.incentivesController.configureAssets(input));

    const {index: indexBefore} = await incentivesController.assets(underlyingAsset);
    expect(indexBefore).to.be.gt(Zero);

    await advanceTimeAndBlock(1 * DAY);

    const {index: indexAfter} = await incentivesController.assets(underlyingAsset);
    expect(indexAfter).to.be.eq(indexBefore);
  });

  it('should go to the limit if distribution ended', async () => {
    const {emissionManager, incentivesController, mockADAI} = fixture;

    const emissionPerSecond = 10;
    const totalStaked = utils.parseEther('20');
    const underlyingAsset = mockADAI.address;
    const input: AssetConfigInput[] = [
      {
        emissionPerSecond,
        totalStaked,
        underlyingAsset: underlyingAsset,
      },
    ];
    await waitForTx(await emissionManager.incentivesController.configureAssets(input));

    await advanceTimeAndBlock(2 * YEAR);

    const {index: indexBefore} = await incentivesController.assets(underlyingAsset);
    expect(indexBefore).to.be.gt(Zero);

    const {index: index1After} = await incentivesController.assets(underlyingAsset);
    expect(index1After).to.be.eq(indexBefore);
  });
});
