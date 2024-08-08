/* @file Move to an adjacent directory
 * @arg 0 {number} - Direction of move. "0":previous | "1":next
 * @arg 1 {number} - Specifies the debounce time before discarding Stay-Mode
 * @arg 2 {string} - Displays debug messages when "DEBUG" is specified
 */

import '@ppmdev/polyfills/arrayIndexOf.ts';
import type {NlCodes} from '@ppmdev/modules/types.ts';
import {isError} from '@ppmdev/modules/guard.ts';
import {readLines} from '@ppmdev/modules/io.ts';
import {tmp, useLanguage} from '@ppmdev/modules/data.ts';
import {validArgs} from '@ppmdev/modules/argument.ts';
import {atDebounce} from '@ppmdev/modules/staymode.ts';
import {langMoveDirectory} from './mod/language.ts';
import {type SortDetail, type PathDetail, core} from './mod/core.ts';

const MSG = {root: '<<root>>', top: '<top>', bottom: '<bottom>'};
const lang = langMoveDirectory[useLanguage()];

type PathData = {lines: string[]; nl: NlCodes};
let cache = {wd: '', ext: '', data: {} as PathData};

const main = () => {
  const [direction, debounce, debugMode] = validArgs();
  const isStaymode = hasDebounceTime(debounce);

  if (!!isStaymode) {
    PPx.StayMode = 2;
    debugMode === 'DEBUG' && PPx.linemessage(`[DEBUG] start ${PPx.StayMode}`);
    atDebounce.hold(debounce, debugMode);
  }

  ppx_resume(direction, '0', isStaymode);
};

const ppx_finally = (): void => PPx.Echo('[WARN] instance remain moveDirectory.stay.js');
const ppx_resume = (direction = '1', debounce = '5000', staymode = true): void => {
  const sort = core.sortDetail(Number(direction), MSG.top, MSG.bottom);
  const [pwd, namespace] = getPwd();
  const target = core.pathDetail(pwd);

  if (!target) {
    PPx.linemessage(`!"${MSG.root}`);
    return;
  }

  const items = candidates(target, sort, staymode);

  if (typeof items === 'string') {
    PPx.linemessage(`!"${items}`);
    return;
  }

  const num = items.indexOf(target.path);
  const adjacentDir = getAdjacentPath(num, items, pwd, namespace);

  // display the message at the end
  if (!items[num - 2]) {
    PPx.linemessage(`!"${sort.msg}`);
  }

  if (!!items[num - 1]) {
    PPx.Execute(`*jumppath "${adjacentDir}"`);
  }

  // init of debounce time
  if (!!staymode) {
    const propName = `ppm_sm${PPx.StayMode}`;
    PPx.Execute(`*string u,${propName}=${debounce}`);
  }
};

/**
 * Whether to enable StayMode
 * @return boolean
 */
const hasDebounceTime = (debounce: string): boolean => {
  const n = Number(debounce);

  return !isNaN(n) && n >= 1000;
};

/**
 * Get current working directory.
 * @return ["<working directory>", "<shell's namespace>"]
 */
const getPwd = (): [string, string?] => {
  const pwd = PPx.Extract('%FDVN');

  return pwd.indexOf('#:') === 0 ? [PPx.Extract('%FDN'), pwd] : [pwd];
};

/**
 * Sort directory paths
 * @return Error message or sorted directory paths
 */
const sortItems = (path: PathDetail, sort: SortDetail, mask: string, staymode: boolean): string | string[] => {
  let data: string | PathData;

  if (staymode && cache.wd === path.wd && path.type < 61) {
    data = cache.data;
  } else if (staymode && cache.wd === path.wd && path.type >= 61 && cache.ext === path.ext) {
    data = cache.data;
  } else {
    const tempFile = tmp().file;
    const opts = `-mask:"${mask}" -utf8 -dir:on -subdir:off -listfile:${tempFile} -name`;
    PPx.Execute(`*whereis -path:"${path.wd}\\" ${opts}`);
    let error: boolean;
    [error, data] = readLines({path: tempFile});

    if (isError(error, data)) {
      return data;
    }

    cache = {wd: path.wd, ext: path.ext, data};
  }

  if (data.lines.length <= 1) {
    return lang.noItem;
  }

  return data.lines.sort((a: string, b: string): number => (a.toLowerCase() < b.toLowerCase() ? sort.l : sort.r));
};

/**
 * Get list of adjacent directories
 * @return Error message or sorted directory paths
 */
const candidates = (path: PathDetail, sort: SortDetail, staymode: boolean): string | string[] => {
  switch (path.type) {
    case 0:
    // return 'DirectoryType: 0, unknown';

    // create a list in consideration of attributes
    case 1:
    case 3:
      return sortItems(path, sort, 'a:d+s-', staymode);

    // create a list in consideration of the extension
    case 4:
    case 61:
    case 62:
    case 63:
    case 64:
    case 96:
      path.path = path.path.slice(0, -1);
      return sortItems(path, sort, path.ext, staymode);

    default:
      return `DirectoryType: ${path.type}, ${lang.notSupport}`;
  }
};

/**
 * Get the path to move
 * @return path
 */
const getAdjacentPath = (num: number, items: string[], pwd: string, namespace?: string): string => {
  let path = items[Math.max(num - 1, 0)];

  if (!namespace) {
    return path;
  }

  const rgx = /[/\\][^/\\]+$/;
  pwd = pwd.replace(rgx, '');
  namespace = namespace.replace(rgx, '');
  return path.replace(pwd, namespace);
};

main();
