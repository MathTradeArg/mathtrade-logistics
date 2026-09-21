import { missingReportComment, missingReportHref, parseMissingItems } from '../missingReport';

describe('missingReportHref', () => {
  it('preloads box and selected game ids', () => {
    expect(missingReportHref({
      boxId: 392,
      boxNumber: 16,
      originName: 'Salta',
      items: [{ item_id: 88, title: 'Catan', assigned_trade_code: 501 }],
    })).toBe('/more/report?kind=missing&box=392&boxNumber=16&origin=Salta&item=88&code=501&title=Catan');
  });

  it('encodes every selected game when reporting several missing items', () => {
    const href = missingReportHref({
      boxId: 392,
      boxNumber: 16,
      originName: 'Salta',
      items: [
        { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
        { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
      ],
    });
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('kind')).toBe('missing');
    expect(params.get('box')).toBe('392');
    expect(JSON.parse(params.get('items') || '[]')).toEqual([
      { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
      { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
    ]);
  });

  it('keeps box id when no game is selected', () => {
    expect(missingReportHref({ boxId: 392, boxNumber: 16 })).toBe(
      '/more/report?kind=missing&box=392&boxNumber=16',
    );
  });
});

describe('parseMissingItems', () => {
  it('reads the multi-item payload', () => {
    const params = new URLSearchParams();
    params.set('items', JSON.stringify([
      { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
      { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
    ]));
    expect(parseMissingItems(params)).toEqual([
      { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
      { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
    ]);
  });
});

describe('missingReportComment', () => {
  it('includes game and box ids', () => {
    expect(missingReportComment({
      boxId: 392,
      boxNumber: 16,
      originName: 'Salta',
      itemId: 88,
      title: 'Catan',
      code: '501',
    })).toContain('Item id 88');
  });

  it('lists every selected game', () => {
    const comment = missingReportComment({
      boxId: 392,
      boxNumber: 16,
      originName: 'Salta',
      items: [
        { item_id: 88, title: 'Catan', assigned_trade_code: 501 },
        { item_id: 89, title: 'Earth', assigned_trade_code: 502 },
      ],
    });
    expect(comment).toContain('Item id 88');
    expect(comment).toContain('Item id 89');
    expect(comment).toContain('Catan (#501)');
    expect(comment).toContain('Earth (#502)');
  });
});
