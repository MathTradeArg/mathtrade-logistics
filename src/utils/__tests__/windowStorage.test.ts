import {
  getCallSlots,
  getGlobalDisplayConfig,
  getQueueMode,
  setCallSlots,
  setQueueMode,
  updateGlobalMaxUsers,
  updateGlobalPollingInterval,
} from '../windowStorage';

const stored = () => JSON.parse(localStorage.getItem('globalDisplayConfig') as string);

describe('windowStorage queue config', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to queue mode on with 4 call slots', () => {
    expect(getQueueMode()).toBe(true);
    expect(getCallSlots()).toBe(4);
  });

  it('completes an old stored config with the new defaults', () => {
    localStorage.setItem('globalDisplayConfig', JSON.stringify({ maxUsers: 5, pollingInterval: 20 }));
    expect(getGlobalDisplayConfig()).toEqual({ maxUsers: 5, pollingInterval: 20, queueMode: true, callSlots: 4 });
  });

  it('persists queue mode', () => {
    setQueueMode(false);
    expect(getQueueMode()).toBe(false);
    expect(stored().queueMode).toBe(false);
  });

  it('persists call slots and clamps them', () => {
    setCallSlots(6);
    expect(getCallSlots()).toBe(6);
    expect(stored().callSlots).toBe(6);
    setCallSlots(0);
    expect(getCallSlots()).toBe(1);
    setCallSlots(99);
    expect(getCallSlots()).toBe(12);
    setCallSlots(2.7);
    expect(getCallSlots()).toBe(3);
    expect(stored().callSlots).toBe(3);
    setCallSlots(NaN);
    expect(getCallSlots()).toBe(4);
  });

  it('does not overwrite the other settings', () => {
    setQueueMode(false);
    setCallSlots(9);
    updateGlobalMaxUsers(7);
    updateGlobalPollingInterval(30);
    expect(getGlobalDisplayConfig()).toEqual({ maxUsers: 7, pollingInterval: 30, queueMode: false, callSlots: 9 });
  });

  it('falls back to defaults on corrupt JSON', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('globalDisplayConfig', '{not json');
    expect(getGlobalDisplayConfig()).toEqual({ maxUsers: 10, pollingInterval: 10, queueMode: true, callSlots: 4 });
    expect(getQueueMode()).toBe(true);
    expect(getCallSlots()).toBe(4);
    spy.mockRestore();
  });
});
