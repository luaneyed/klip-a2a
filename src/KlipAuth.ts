import axios, { AxiosError } from 'axios';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type AuthResponse = { status: 'prepared' | 'canceled' | 'error' } | { status: 'completed', address: string };

class AuthRequest {
  constructor(readonly requestKey: string, readonly expirationTime: number) {}
  
  readonly authorizeLink = `https://klipwallet.com/?target=/a2a?request_key=${this.requestKey}`;

  async tryResult(): Promise<AuthResponse> {
    try {
      const { data: { status, result } } = await axios.get(`https://a2a-api.klipwallet.com/v2/a2a/result?request_key=${this.requestKey}`);

      return status === 'completed'
        ? { status, address: result.klaytn_address }
        : { status };
    } catch (e) {
      if ((e as AxiosError)?.response?.status === 400) {
        return { status: 'error' };
      }
      throw e;
    }
  }

  async waitResult(interval: number = 700): Promise<string | null> {
    while (true) {
      const response = await this.tryResult();
      if (response.status === 'error') {
        return null;
      }
      if (response.status === 'completed') {
        return response.address;
      }
      await sleep(interval);
    }
  }
}

export const authenticateKlip = async (bappName: string) => {
  const { data: { request_key, expiration_time } } = await axios.post(
    'https://a2a-api.klipwallet.com/v2/a2a/prepare',
    { bapp: { name: bappName }, type: 'auth' },
  );

  return new AuthRequest(request_key, expiration_time);
};
