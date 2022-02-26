import {constants} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {HOUR, PSM_STAKER_PREMIUM, YEAR} from '../constants';
import {ContractId} from '../types';
import {parseNetwork} from '../utils';
import {
  deployIncentivesController,
  deployInitializableAdminUpgradeabilityProxy,
  deployMockAToken,
  deployMockMintableERC20,
  deployStakedKimber,
} from '../utils/contractDeployer';
import {waitForTx} from '../utils/hhNetwork';

const {AddressZero} = constants;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {network} = parseNetwork(hre.network.name);
  console.log(`***** using network ${network}  *****`);

  const {getNamedAccounts} = hre;
  const {admin, emissionManager, rewardsVault} = await getNamedAccounts();

  const kimberToken = await deployMockMintableERC20(hre, 'Kimber Token', 'KIMBER');
  const stakedKimberImpl = await deployStakedKimber(hre, [
    kimberToken.address,
    kimberToken.address,
    24 * HOUR,
    48 * HOUR,
    rewardsVault,
    emissionManager,
    100 * YEAR,
    AddressZero,
  ]);
  const stakedKimberProxy = await deployInitializableAdminUpgradeabilityProxy(hre, ContractId.StakedKimberProxy);
  const encodedIntialize = stakedKimberImpl.interface.encodeFunctionData('initialize');
  await waitForTx(
    await stakedKimberProxy['initialize(address,address,bytes)'](stakedKimberImpl.address, admin, encodedIntialize)
  );

  const incentivesControllerImpl = await deployIncentivesController(hre, [
    kimberToken.address,
    rewardsVault,
    stakedKimberProxy.address,
    PSM_STAKER_PREMIUM,
    emissionManager,
    1 * YEAR,
  ]);
  const incentivesControllerProxy = await deployInitializableAdminUpgradeabilityProxy(
    hre,
    ContractId.IncentivesControllerProxy
  );
  const encodedIntializeIncentivesController = incentivesControllerImpl.interface.encodeFunctionData('initialize');
  await waitForTx(
    await incentivesControllerProxy['initialize(address,address,bytes)'](
      incentivesControllerImpl.address,
      admin,
      encodedIntializeIncentivesController
    )
  );

  await deployMockAToken(hre, ContractId.MockADAI, incentivesControllerProxy.address);
  await deployMockAToken(hre, ContractId.MockAETH, incentivesControllerProxy.address);
};

export default func;
func.tags = ['testEnv'];
