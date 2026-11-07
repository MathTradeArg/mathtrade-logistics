import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddByCodeField, { type AddByCodeResult } from '../AddByCodeField';

const submit = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input.closest('form') as HTMLFormElement);
};

describe('AddByCodeField: typing the label code and Enter adds the copy and leaves the field ready for the next', () => {
  it('does not take the focus when the box opens', () => {
    render(<AddByCodeField onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Código de la etiqueta')).not.toHaveFocus();
  });

  it('Enter with a code sends it, empties the field and keeps the focus', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: true, message: 'Agregado: 00012 · Catan' });
    render(<AddByCodeField onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Código de la etiqueta');

    submit(input, '12');

    expect(await screen.findByRole('status')).toHaveTextContent('Agregado: 00012 · Catan');
    expect(onSubmit).toHaveBeenCalledWith('12');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('a failure is shown as an alert and keeps the typed code to fix it', async () => {
    const onSubmit = jest.fn().mockResolvedValue({ ok: false, message: 'Ese juego ya está en esta caja.' });
    render(<AddByCodeField onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Código de la etiqueta');

    submit(input, '12');

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese juego ya está en esta caja.');
    expect(input).toHaveValue('12');
    expect(input).toHaveFocus();
  });

  it('an empty field does nothing on Enter', () => {
    const onSubmit = jest.fn();
    render(<AddByCodeField onSubmit={onSubmit} />);
    submit(screen.getByLabelText('Código de la etiqueta'), '   ');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('codes entered while an add is still running are queued in order, none lost or duplicated, and the screen refreshes once at the end', async () => {
    const onIdle = jest.fn();
    const resolvers: Array<(result: AddByCodeResult) => void> = [];
    const onSubmit = jest.fn(
      () => new Promise<AddByCodeResult>((resolve) => { resolvers.push(resolve); }),
    );
    render(<AddByCodeField onSubmit={onSubmit} onIdle={onIdle} />);
    const input = screen.getByLabelText('Código de la etiqueta');

    submit(input, '12');
    submit(input, '13');
    submit(input, '14');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenNthCalledWith(1, '12');

    await act(async () => { resolvers[0]({ ok: true, message: 'Agregado: 00012' }); });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit).toHaveBeenNthCalledWith(2, '13');

    expect(onIdle).not.toHaveBeenCalled();
    await act(async () => { resolvers[1]({ ok: true, message: 'Agregado: 00013' }); });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3));
    expect(onSubmit).toHaveBeenNthCalledWith(3, '14');

    await act(async () => { resolvers[2]({ ok: true, message: 'Agregado: 00014' }); });
    expect(await screen.findByRole('status')).toHaveTextContent('Agregado: 00014');
    expect(onSubmit).toHaveBeenCalledTimes(3);
    expect(input).toHaveValue('');
    await waitFor(() => expect(onIdle).toHaveBeenCalledTimes(1));
  });
});
