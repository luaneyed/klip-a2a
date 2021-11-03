import axios, { AxiosError } from 'axios';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Result = { status: 'prepared' | 'canceled' | 'error' } | { status: 'success' | 'fail' | 'pending', tx_hash: string };

class ContractExecution {
  constructor(readonly requestKey: string, readonly expirationTime: number) {}
  
  readonly approvalLink = `https://klipwallet.com/?target=/a2a?request_key=${this.requestKey}`;

  async tryResult(): Promise<Result> {
    try {
      const { data: { status, result } } = await axios.get(`https://a2a-api.klipwallet.com/v2/a2a/result?request_key=${this.requestKey}`);

      return status === 'requested' || status === 'completed'
        ? result
        : { status };
    } catch (e) {
      if ((e as AxiosError)?.response?.status === 400) {
        return { status: 'error' };
      }
      throw e;
    }
  }

  async waitResult(interval: number = 700): Promise<{ status: 'error' } | { status: 'success' | 'fail', tx_hash: string }> {
    while (true) {
      const result = await this.tryResult();
      if (['error', 'success', 'fail'].includes(result.status)) {
        return result as any;
      }
      await sleep(interval);
    }
  }
}

export const executeContractWithKlip = async (
  bappName: string,
  transaction: { abi: string, params: string, to: string, value: string, from?: string },
) => {
  const { data: { request_key, expiration_time } } = await axios.post(
    'https://a2a-api.klipwallet.com/v2/a2a/prepare',
    {
      bapp: { name: bappName },
      type: 'execute_contract',
      transaction,
    },
  );

  return new ContractExecution(request_key, expiration_time);
};
