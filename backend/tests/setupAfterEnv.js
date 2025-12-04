// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test matchers
expect.extend({
  toBeUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },
  toBeValidDate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid date`,
      pass,
    };
  },
  toHaveErrorStructure(received) {
    const pass = received && 
      typeof received === 'object' &&
      'success' in received &&
      received.success === false &&
      'error' in received;
    return {
      message: () => `expected response to have error structure, got ${JSON.stringify(received)}`,
      pass,
    };
  },
});