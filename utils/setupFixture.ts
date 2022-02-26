import {Contract} from 'ethers';
import {deployments, getNamedAccounts} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  IncentivesController,
  InitializableAdminUpgradeabilityProxy,
  MockAToken,
  MockMintableERC20,
  StakedKimber
} from '../typechain';
import {ContractId, ContractRecord, Fixture, User} from '../types';
import {enumKeys} from '../utils';
import {getContractAt} from './contractGetter';
import getConfig from './getConfig';

async function setupUser<T extends {[contractName: string]: Contract}>(
  hre: HardhatRuntimeEnvironment,
  address: string,
  contract: T,
  name?: string
): Promise<User & T> {
  const signer = await hre.ethers.getSigner(address);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = {address, name: name ? name : address, signer} as User & T;
  for (const key of enumKeys(contract)) {
    user[key] = contract[key].connect(signer);
  }

  return user;
}

export const setupFixture = deployments.createFixture(async (hre: HardhatRuntimeEnvironment) => {
  const config = getConfig();

  await deployments.fixture(['testEnv']);

  const kimberToken = (await hre.ethers.getContract(ContractId.MockMintableERC20)) as MockMintableERC20;

  const stakedKimberProxy = (await hre.ethers.getContract(
    ContractId.StakedKimberProxy
  )) as InitializableAdminUpgradeabilityProxy;

  const stakedKimber = await getContractAt<StakedKimber>(hre, ContractId.StakedKimber, stakedKimberProxy.address);

  const incentivesControllerProxy = (await hre.ethers.getContract(
    ContractId.IncentivesControllerProxy
  )) as InitializableAdminUpgradeabilityProxy;

  const incentivesController = await getContractAt<IncentivesController>(
    hre,
    ContractId.IncentivesController,
    incentivesControllerProxy.address
  );

  const mockADAI = (await hre.ethers.getContract(ContractId.MockADAI)) as MockAToken;
  const mockAETH = (await hre.ethers.getContract(ContractId.MockAETH)) as MockAToken;

  const contract: ContractRecord = {
    kimberToken,
    stakedKimber,
    stakedKimberProxy,
    incentivesController,
    incentivesControllerProxy,
    mockADAI,
    mockAETH,
  };

  const {deployer, admin, distributer, user1, user2, user3, user4, user5, emissionManager, rewardsVault} =
    await getNamedAccounts();

  const chainId = parseInt(await hre.getChainId());
  if (!chainId) {
    throw new Error("Current network doesn't have CHAIN ID");
  }

  return {
    ...contract,
    deployer: await setupUser(hre, deployer, contract, 'deployer'),
    admin: await setupUser(hre, admin, contract, 'admin'),
    distributer: await setupUser(hre, distributer, contract, 'distributer'),
    emissionManager: await setupUser(hre, emissionManager, contract, 'emissionManager'),
    rewardsVault: await setupUser(hre, rewardsVault, contract, 'rewardsVault'),
    user1: await setupUser(hre, user1, contract, 'user1'),
    user2: await setupUser(hre, user2, contract, 'user2'),
    user3: await setupUser(hre, user3, contract, 'user3'),
    user4: await setupUser(hre, user4, contract, 'user4'),
    user5: await setupUser(hre, user5, contract, 'user5'),
    config: config,
    chainId,
  } as Fixture;
});

export default setupFixture;
