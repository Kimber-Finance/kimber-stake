import {DeployResult} from 'hardhat-deploy/dist/types';
import {ContractDeployResult} from '../types';
import getDb from './getDb';

const isDeployResult = (arg: DeployResult | ContractDeployResult): arg is DeployResult => {
  return (arg as DeployResult).receipt !== undefined;
};

const registerContractInJsonDb = async (
  contractId: string,
  network: string,
  result: DeployResult | ContractDeployResult
): Promise<void> => {
  const MAINNET_FORK = process.env.MAINNET_FORK === 'true';
  if (MAINNET_FORK || (network !== 'hardhat' && !network.includes('coverage'))) {
    console.log(`*** ${contractId} ***\n`);
    console.log(`Network: ${network}`);

    if (isDeployResult(result)) {
      console.log(`tx: ${result.transactionHash}`);
      console.log(`contract address: ${result.address}`);
      console.log(`deployer address: ${result.receipt?.from}`);
      console.log(`gas used: ${result.receipt?.gasUsed}`);
      console.log(`\n******`);
      console.log();

      return await getDb()
        .set(`deployed.${contractId}.${network}`, {
          address: result.address,
          deployer: result.receipt?.from,
        })
        .set(`${contractId}.${network}`, result.address)
        .write();
    } else {
      return await getDb()
        .set(`deployed.${contractId}.${network}`, {
          address: result.address,
          deployer: result.deployer,
        })
        .set(`${contractId}.${network}`, result.address)
        .write();
    }
  }
};

export default registerContractInJsonDb;
