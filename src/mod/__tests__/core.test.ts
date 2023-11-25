import PPx from '@ppmdev/modules/ppx';
global.PPx = Object.create(PPx)
import {core} from '../core'

describe('sortDetail()', function () {
  it('pass direction "1". the return object must be the next item details', () => {
    expect(core.sortDetail('1', 't', 'b')).toEqual({l: 1, r: -1, msg: 'b'})
  });
  it('pass invalid argument. the direction must be "1"', () => {
    expect(core.sortDetail('invalid value', 't', 'b')).toEqual({l: 1, r: -1, msg: 'b'})
  });
});

describe('pathDetail()', function () {
  it('pass general path', () => {
    const path = 'C:\\bin\\some app\\app.exe';
    expect(core.pathDetail(path)).toEqual({path: `${path}\\`, pwd: 'C:\\bin\\some app', name: 'app.exe', ext: '.exe', type: 0})
  });
  it('pass shell\'s namespace', () => {
    const path = '#:\\favorites'
    expect(core.pathDetail(path)).toEqual({path: `${path}\\`, pwd: '#:', name: 'favorites', ext: '.favorites', type: 0})
  });
});
