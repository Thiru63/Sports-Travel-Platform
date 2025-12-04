import { jest } from "@jest/globals";

export const mockRequest = (overrides = {}) => {
  return {
    body: overrides.body || {},
    params: overrides.params || {},
    query: overrides.query || {},
    headers: overrides.headers || {},
  };
};

export const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
