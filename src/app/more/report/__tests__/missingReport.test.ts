import { missingReportComment, missingReportHref } from '../missingReport';

describe('missingReportHref', () => {
  it('preloads box and selected game ids', () => {
    expect(missingReportHref({
      boxId: 392,
      boxNumber: 16,
      originName: 'Salta',
      items: [{ item_id: 88, title: 'Catan', assigned_trade_code: 501 }],
    })).toBe('/more/report?kind=missing&box=392&boxNumber=16&origin=Salta&item=88&code=501&title=Catan');
  });

  it('keeps box id when no game is selected', () => {
    expect(missingReportHref({ boxId: 392, boxNumber: 16 })).toBe(
      '/more/report?kind=missing&box=392&boxNumber=16',
    );
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
});
