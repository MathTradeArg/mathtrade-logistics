import '@testing-library/jest-dom';
require('jest-fetch-mock').enableMocks();

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  })
);