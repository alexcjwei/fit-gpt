import { createTokenCounter } from '../../../src/services/tokenCounter.service';

describe('TokenCounterService', () => {
  it('should start with zero tokens', () => {
    const counter = createTokenCounter();
    const usage = counter.getUsage();

    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
  });

  it('should increment tokens correctly', () => {
    const counter = createTokenCounter();

    counter.increment(100, 50);

    const usage = counter.getUsage();
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });

  it('should accumulate tokens across multiple increments', () => {
    const counter = createTokenCounter();

    counter.increment(100, 50);
    counter.increment(200, 75);
    counter.increment(50, 25);

    const usage = counter.getUsage();
    expect(usage.inputTokens).toBe(350);
    expect(usage.outputTokens).toBe(150);
  });

  it('should reset tokens to zero', () => {
    const counter = createTokenCounter();

    counter.increment(100, 50);
    counter.increment(200, 75);

    counter.reset();

    const usage = counter.getUsage();
    expect(usage.inputTokens).toBe(0);
    expect(usage.outputTokens).toBe(0);
  });

  it('should track tokens independently across multiple counters', () => {
    const counter1 = createTokenCounter();
    const counter2 = createTokenCounter();

    counter1.increment(100, 50);
    counter2.increment(200, 75);

    const usage1 = counter1.getUsage();
    const usage2 = counter2.getUsage();

    expect(usage1.inputTokens).toBe(100);
    expect(usage1.outputTokens).toBe(50);
    expect(usage2.inputTokens).toBe(200);
    expect(usage2.outputTokens).toBe(75);
  });

  it('should handle zero increments', () => {
    const counter = createTokenCounter();

    counter.increment(0, 0);
    counter.increment(100, 50);

    const usage = counter.getUsage();
    expect(usage.inputTokens).toBe(100);
    expect(usage.outputTokens).toBe(50);
  });

  it('should allow resetting and incrementing again', () => {
    const counter = createTokenCounter();

    counter.increment(100, 50);
    counter.reset();
    counter.increment(200, 75);

    const usage = counter.getUsage();
    expect(usage.inputTokens).toBe(200);
    expect(usage.outputTokens).toBe(75);
  });

  it('should return a snapshot of usage (not a live reference)', () => {
    const counter = createTokenCounter();

    counter.increment(100, 50);
    const usage1 = counter.getUsage();

    counter.increment(200, 75);
    const usage2 = counter.getUsage();

    // usage1 should not have changed
    expect(usage1.inputTokens).toBe(100);
    expect(usage1.outputTokens).toBe(50);

    // usage2 should reflect the accumulated total
    expect(usage2.inputTokens).toBe(300);
    expect(usage2.outputTokens).toBe(125);
  });
});
