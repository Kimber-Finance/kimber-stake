import {BigNumberish} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  DistributionManager,
  IncentivesController,
  InitializableAdminUpgradeabilityProxy,
  MockAToken,
  MockDoubleTransfer,
  MockMintableERC20,
  StakedKimber
} from '../typechain';
import {Address, ContractId} from '../types';
import {getContractAt} from './contractGetter';
import registerContractInJsonDb from './registerContractInJsonDb';

export const deployMockMintableERC20 = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  symbol: string
): Promise<MockMintableERC20> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockMintableERC20;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [name, symbol],
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployStakedKimber = async (
  hre: HardhatRuntimeEnvironment,
  args: [Address, Address, BigNumberish, BigNumberish, Address, Address, BigNumberish, Address]
): Promise<StakedKimber> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.StakedKimber;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockStakedKimberV2 = async (
  hre: HardhatRuntimeEnvironment,
  args: [Address, Address, BigNumberish, BigNumberish, Address, Address, BigNumberish, Address]
): Promise<StakedKimber> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockStakedKimberV2;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployInitializableAdminUpgradeabilityProxy = async (
  hre: HardhatRuntimeEnvironment,
  name: ContractId
): Promise<InitializableAdminUpgradeabilityProxy> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.InitializableAdminUpgradeabilityProxy;
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployIncentivesController = async (
  hre: HardhatRuntimeEnvironment,
  args: [
    Address, // rewardToken,
    Address, // rewardsVault,
    Address, // psm,
    BigNumberish, // extraPsmReward,
    Address, // emissionManager,
    BigNumberish // distributionDuration
  ]
): Promise<IncentivesController> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.IncentivesController;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployDistributionManager = async (hre: HardhatRuntimeEnvironment): Promise<DistributionManager> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.DistributionManager;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockDoubleTransfer = async (
  hre: HardhatRuntimeEnvironment,
  token: Address
): Promise<MockDoubleTransfer> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockDoubleTransfer;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [token],
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockAToken = async (
  hre: HardhatRuntimeEnvironment,
  name: ContractId,
  incentivesController: Address
): Promise<MockAToken> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockAToken;
  const result = await deploy(name, {
    from: deployer,
    contract,
    args: [incentivesController],
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};
