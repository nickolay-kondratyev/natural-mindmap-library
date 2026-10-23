import { DEMO_REJECTION_REASON, describeDelay, toHostSimulation } from './demoHost';

describe('GIVEN the host simulation settings', () => {
  it('WHEN rejecting is on THEN the in-memory host rejects with the demo reason', () => {
    expect(toHostSimulation({ delayMs: 0, rejectEdits: true }).rejectReason).toBe(DEMO_REJECTION_REASON);
  });

  it('WHEN rejecting is off THEN the in-memory host does not reject', () => {
    expect(toHostSimulation({ delayMs: 0, rejectEdits: false }).rejectReason).toBeNull();
  });

  it('WHEN a delay is set THEN the in-memory host waits that long', () => {
    expect(toHostSimulation({ delayMs: 1500, rejectEdits: false }).delayMs).toBe(1500);
  });
});

describe('GIVEN an answer delay', () => {
  it('WHEN it is zero THEN it reads as instant', () => {
    expect(describeDelay(0)).toBe('Instant');
  });

  it('WHEN it is positive THEN it reads in seconds', () => {
    expect(describeDelay(1500)).toBe('1.5 s');
  });
});
