import { downloadBlob } from '../file';

describe('downloadBlob: the browser saves the file with the given name', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    jest.useFakeTimers();
    URL.createObjectURL = jest.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    jest.restoreAllMocks();
  });

  it('clicks a temporary download link with the file name and then frees the object URL', () => {
    const clicked: HTMLAnchorElement[] = [];
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    const blob = new Blob(['x']);

    downloadBlob(blob, 'planilla_evento_2026-11-08_0905.xlsx');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('planilla_evento_2026-11-08_0905.xlsx');
    expect(clicked[0].getAttribute('href')).toBe('blob:fake-url');
    expect(document.querySelector('a[download]')).toBeNull();

    jest.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});
