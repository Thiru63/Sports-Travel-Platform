// Mock uuid for integration tests too
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));