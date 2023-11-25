type Direction = '0' | '1';
export type SortDetail = {l: number; r: number; msg: string};
const sortDetail = (direction: string, top: string, bottom: string): SortDetail => {
  if (!/^[01]$/.test(direction)) {
    direction = '1';
  }

  return {
    0: {l: -1, r: 1, msg: top},
    1: {l: 1, r: -1, msg: bottom}
  }[direction as Direction];
};

export type PathDetail = {path: string; pwd: string; name: string; ext: string; type: number};
const pathDetail = (path: string): PathDetail | undefined => {
  const wd = {path: '', pwd: '', name: '', ext: '', type: 0};
  const rgx = /^(.*)\\((?:.*\.)?(?!$)(.*))/;
  PPx.Extract(path).replace(rgx, (match, p1, p2, p3) => {
    wd.path = `${match}\\`;
    wd.pwd = p1;
    wd.name = p2;
    wd.ext = `.${p3.toLowerCase()}`;
    wd.type = PPx.DirectoryType;
    return '';
  });

  return wd.pwd ? wd : undefined;
};

export const core = {sortDetail, pathDetail};
