import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, parseUnits } from "ethers";

import MarketFactoryABI from "../contract/MarketFactory.json";
import PredictionMarketABI from "../contract/PredictionMarket.json";
import APMTokenABI from "../contract/APMToken.json";
import LiquidityLockerABI from "../contract/LiquidityLocker.json";
import VestingManagerABI from "../contract/VestingManager.json";
import { getActiveWalletProvider } from "./walletProvider";

const addresses = {
  factory: import.meta.env.VITE_MARKET_FACTORY_ADDRESS || import.meta.env.VITE_MARKET_FACTORY,
  token: import.meta.env.VITE_APM_TOKEN_ADDRESS || import.meta.env.VITE_APM_TOKEN,
  predictionMarket: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS || import.meta.env.VITE_PREDICTION_MARKET,
  liquidityLocker: import.meta.env.VITE_LIQUIDITY_LOCKER_ADDRESS || import.meta.env.VITE_LIQUIDITY_LOCKER,
  vestingManager: import.meta.env.VITE_VESTING_MANAGER_ADDRESS || import.meta.env.VITE_VESTING_MANAGER,
};

let provider;
let signer;
let readProvider;

function getReadProvider() {
  if (readProvider) return readProvider;
  const rpcUrl = import.meta.env.VITE_BNB_RPC_URL || import.meta.env.VITE_RPC_URL;
  if (!rpcUrl) throw new Error("Read-only RPC is not configured. Set VITE_BNB_RPC_URL in the frontend environment.");
  readProvider = new JsonRpcProvider(rpcUrl, Number(import.meta.env.VITE_CHAIN_ID || 97));
  return readProvider;
}

function getReadFactoryContract() {
  return new Contract(requireAddress(addresses.factory, "Market Factory"), MarketFactoryABI, getReadProvider());
}

async function getWalletContext() {
  const injectedProvider = getActiveWalletProvider();
  if (!injectedProvider) throw new Error("Connect a wallet first using the APM Agro wallet selector.");
  provider = new BrowserProvider(injectedProvider);
  signer = await provider.getSigner();

  const expectedChainId = Number(import.meta.env.VITE_CHAIN_ID || 97);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== expectedChainId) {
    throw new Error(`Wrong network. Please switch your wallet to chain ID ${expectedChainId}.`);
  }
  return { provider, signer };
}

function requireAddress(value, label) {
  if (!value) throw new Error(`${label} address is missing. Configure its VITE_ environment variable in Vercel.`);
  return value;
}

async function getContract(address, abi, label) {
  const { signer: activeSigner } = await getWalletContext();
  return new Contract(requireAddress(address, label), abi, activeSigner);
}

export const getFactoryContract = () =>
  getContract(addresses.factory, MarketFactoryABI, "Market Factory");

export const getTokenContract = () =>
  getContract(addresses.token, APMTokenABI, "APM Token");

export const getLiquidityLockerContract = () =>
  getContract(addresses.liquidityLocker, LiquidityLockerABI, "Liquidity Locker");

export const getVestingManagerContract = () =>
  getContract(addresses.vestingManager, VestingManagerABI, "Vesting Manager");

async function getMarketContract(marketAddress) {
  if (!marketAddress) throw new Error("Market address is required.");
  return new Contract(marketAddress, PredictionMarketABI, getReadProvider());
}

async function getWritableMarketContract(marketAddress) {
  if (!marketAddress) throw new Error("Market address is required.");
  const { signer: activeSigner } = await getWalletContext();
  return new Contract(marketAddress, PredictionMarketABI, activeSigner);
}

function normalizeStatus(status) {
  const value = String(status).toLowerCase();
  if (value.includes("resolv")) return "Resolved";
  if (value.includes("clos") || value.includes("expir")) return "Closed";
  return "Open";
}

async function readMarket(marketAddress) {
  const market = await getMarketContract(marketAddress);
  const tokenAddress = await market.token();
  const token = new Contract(tokenAddress, APMTokenABI, getReadProvider());
  const decimals = Number(await token.decimals());
  const [question, statusText, yesPoolRaw, noPoolRaw, totalPoolRaw, deadline, creator] =
    await Promise.all([
      market.question(),
      market.getMarketStatus(),
      market.getYesPool(),
      market.getNoPool(),
      market.getTotalPool(),
      market.deadline(),
      market.owner(),
    ]);

  const yesPool = Number(formatUnits(yesPoolRaw, decimals));
  const noPool = Number(formatUnits(noPoolRaw, decimals));
  const totalLiquidity = Number(formatUnits(totalPoolRaw, decimals));
  const total = yesPool + noPool;

  return {
    id: marketAddress,
    question,
    description: "",
    yesPrice: total > 0 ? (yesPool / total) * 100 : 50,
    noPrice: total > 0 ? (noPool / total) * 100 : 50,
    totalLiquidity,
    liquidityPercentage: total > 0 ? 100 : 0,
    status: normalizeStatus(statusText),
    creator,
    deadline: Number(deadline),
    yesPool,
    noPool,
  };
}

export const allMarkets = async () => {
  const factory = getReadFactoryContract();
  const marketAddresses = await factory.getAllMarkets();
  return Promise.all(marketAddresses.map(readMarket));
};

export const getMarketById = readMarket;

export const getOutcomePrices = async (marketId) => {
  const market = await readMarket(marketId);
  return { yes: market.yesPrice, no: market.noPrice };
};

export const getMarketStatus = async (marketId) => {
  const market = await getMarketContract(marketId);
  return normalizeStatus(await market.getMarketStatus());
};

export const getMarketCreator = async (marketId) => {
  const market = await getMarketContract(marketId);
  return market.owner();
};

export const getUserDashboard = async (walletAddress) => {
  if (!walletAddress) {
    return { positions: [], createdMarkets: [], activity: [], totalStaked: 0, claimableCount: 0 };
  }

  const factory = getReadFactoryContract();
  const [marketAddresses, createdAddresses] = await Promise.all([
    factory.getAllMarkets(),
    factory.getUserMarkets(walletAddress),
  ]);

  const positions = await Promise.all(marketAddresses.map(async (address) => {
    const market = await getMarketContract(address);
    const tokenAddress = await market.token();
    const token = new Contract(tokenAddress, APMTokenABI, getReadProvider());
    const [decimals, question, stakes, statusText, hasClaimed, winningChoice, refundMode, yesValue, noValue] =
      await Promise.all([
        token.decimals(),
        market.question(),
        market.getUserStakes(walletAddress),
        market.getMarketStatus(),
        market.hasClaimed(walletAddress),
        market.winningChoice(),
        market.refundMode(),
        market.YES(),
        market.NO(),
      ]);

    const yesStake = Number(formatUnits(stakes.yesStake ?? stakes[0], decimals));
    const noStake = Number(formatUnits(stakes.noStake ?? stakes[1], decimals));
    if (yesStake === 0 && noStake === 0) return null;

    const status = normalizeStatus(statusText);
    const isWinningStake = refundMode
      ? yesStake > 0 || noStake > 0
      : (winningChoice === yesValue && yesStake > 0) || (winningChoice === noValue && noStake > 0);

    return {
      id: address,
      question,
      yesStake,
      noStake,
      totalStake: yesStake + noStake,
      status,
      hasClaimed,
      claimable: status === "Resolved" && !hasClaimed && isWinningStake,
    };
  }));

  const createdMarkets = await Promise.all(createdAddresses.map(readMarket));
  const activePositions = positions.filter(Boolean);

  // Historical event queries can be limited by public RPC providers. Keep
  // dashboard positions available even if an RPC refuses a large log range.
  const activityGroups = await Promise.all(marketAddresses.map(async (address) => {
    try {
      const market = await getMarketContract(address);
      const tokenAddress = await market.token();
      const token = new Contract(tokenAddress, APMTokenABI, getReadProvider());
      const decimals = Number(await token.decimals());
      const [bets, rewards, question] = await Promise.all([
        market.queryFilter(market.filters.BetPlaced(walletAddress)),
        market.queryFilter(market.filters.RewardClaimed(walletAddress)),
        market.question(),
      ]);
      return [
        ...bets.map((log) => ({
          id: log.transactionHash + "-bet",
          market: question,
          marketId: address,
          type: "Stake",
          amount: Number(formatUnits(log.args.amount, decimals)),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })),
        ...rewards.map((log) => ({
          id: log.transactionHash + "-reward",
          market: question,
          marketId: address,
          type: "Reward claimed",
          amount: Number(formatUnits(log.args.payout, decimals)),
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        })),
      ];
    } catch (error) {
      console.warn("Could not load historical activity for market", address, error);
      return [];
    }
  }));

  const activity = activityGroups.flat()
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, 30);

  return {
    positions: activePositions,
    createdMarkets,
    activity,
    totalStaked: activePositions.reduce((sum, item) => sum + item.totalStake, 0),
    claimableCount: activePositions.filter((item) => item.claimable).length,
  };
};

export const getFactoryOwner = async () => {
  const factory = await getFactoryContract();
  return factory.owner();
};

export const stakeOnMarket = async (marketId, outcome, amount) => {
  const market = await getWritableMarketContract(marketId);
  const tokenAddress = await market.token();
  const { signer: activeSigner } = await getWalletContext();
  const token = new Contract(tokenAddress, APMTokenABI, activeSigner);
  const decimals = Number(await token.decimals());
  const value = parseUnits(String(amount), decimals);
  if (value <= 0n) throw new Error("Stake amount must be greater than zero.");

  const account = await activeSigner.getAddress();
  const currentAllowance = await token.allowance(account, marketId);
  if (currentAllowance < value) {
    const approval = await token.approve(marketId, value);
    await approval.wait();
  }

  const yesValue = await market.YES();
  const noValue = await market.NO();
  const choice = outcome === "YES" ? yesValue : noValue;
  const tx = await market.placeBet(choice, value);
  return tx.wait();
};

export const resolveMarket = async (marketId, outcome) => {
  const factory = await getFactoryContract();
  const market = await getWritableMarketContract(marketId);
  const choice = outcome === "YES" ? await market.YES() : await market.NO();
  const tx = await factory.resolveMarket(marketId, choice);
  return tx.wait();
};

export const createMarket = async ({ question, deadline }) => {
  if (!question || !question.trim()) {
    throw new Error("Enter a market question before creating the market.");
  }

  const deadlineValue = BigInt(deadline);
  if (deadlineValue <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("The market deadline must be in the future.");
  }

  const factory = await getFactoryContract();
  const { signer: activeSigner } = await getWalletContext();

  // Read the fee token from the deployed factory itself. This avoids
  // approving a token address that may differ from the factory's token.
  const [factoryTokenAddress, creationFee, feeBps] = await Promise.all([
    factory.token(),
    factory.CREATION_FEE(),
    factory.defaultFeeBps(),
  ]);

  if (!factoryTokenAddress || /^0x0{40}$/i.test(factoryTokenAddress)) {
    throw new Error("The MarketFactory has no valid APM token configured.");
  }

  const token = new Contract(factoryTokenAddress, APMTokenABI, activeSigner);
  const account = await activeSigner.getAddress();
  const fee = BigInt(creationFee);

  if (fee > 0n) {
    const [balance, currentAllowance] = await Promise.all([
      token.balanceOf(account),
      token.allowance(account, await factory.getAddress()),
    ]);

    if (BigInt(balance) < fee) {
      throw new Error(
        `Insufficient APM token balance for the market creation fee. Required: ${formatUnits(fee, await token.decimals())} APM; available: ${formatUnits(balance, await token.decimals())} APM.`
      );
    }

    if (BigInt(currentAllowance) < fee) {
      const approvalTx = await token.approve(await factory.getAddress(), fee);
      const approvalReceipt = await approvalTx.wait();
      if (!approvalReceipt || approvalReceipt.status !== 1) {
        throw new Error("APM token approval did not complete successfully.");
      }
    }

    const confirmedAllowance = await token.allowance(account, await factory.getAddress());
    if (BigInt(confirmedAllowance) < fee) {
      throw new Error("APM token allowance is still below the required market creation fee.");
    }
  }

  // Simulate first so a contract revert can be reported before asking the
  // wallet to submit the market-creation transaction.
  await factory.createMarket.staticCall(question.trim(), deadlineValue, feeBps);

  const tx = await factory.createMarket(question.trim(), deadlineValue, feeBps);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error("The market-creation transaction was not confirmed successfully.");
  }
  return receipt;
};

export const getContractAddresses = () => ({ ...addresses });

export const claimWinnings = async (marketId) => {
  const market = await getWritableMarketContract(marketId);
  const tx = await market.claim();
  return tx.wait();
};

export const getTokenBalance = async (walletAddress) => {
  const token = await getTokenContract();
  const { signer: activeSigner } = await getWalletContext();
  const address = walletAddress || await activeSigner.getAddress();
  const [balance, decimals, symbol] = await Promise.all([
    token.balanceOf(address),
    token.decimals(),
    token.symbol(),
  ]);
  return { balance: formatUnits(balance, decimals), symbol };
};

export const getVestingPosition = async (beneficiary) => {
  const manager = await getVestingManagerContract();
  const [position, claimable, outstanding] = await Promise.all([
    manager.vestings(beneficiary),
    manager.calculatableVest(beneficiary),
    manager.totalOutstanding(),
  ]);
  return { position, claimable, outstanding };
};

export const getLiquidityLock = async (lockId) => {
  const locker = await getLiquidityLockerContract();
  return locker.getLock(lockId);
};
