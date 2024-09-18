/* @file Move to an adjacent directory
 * @arg 0 {number} - Direction of move. "0":previous | "1":next
 * @arg 1 {number} - Specify a debounce time greater than 1000(ms) to enable StayMode
 * @arg 2 {string} - Displays debug messages when "DEBUG" is specified
 */

import '@ppmdev/polyfills/arrayIndexOf.ts';
import {validArgs} from '@ppmdev/modules/argument.ts';
import {tmp, useLanguage} from '@ppmdev/modules/data.ts';
import {isError} from '@ppmdev/modules/guard.ts';
import {readLines} from '@ppmdev/modules/io.ts';
import {pathSelf} from '@ppmdev/modules/path.ts';
import {atDebounce, getStaymodeId} from '@ppmdev/modules/staymode.ts';
import type {NlCodes} from '@ppmdev/modules/types.ts';
import {type PathDetail, type SortDetail, core} from './mod/core.ts';
import {langMoveDirectory} from './mod/language.ts';

const STAYMODE_ID = 80140;
const MSG = {ROOT: '<<root>>', TOP: '<top>', BOTTOM: '<bottom>'};
const lang = langMoveDirectory[useLanguage()];
const {scriptName} = pathSelf();

type PathData = {lines: string[]; nl: NlCodes};
const cache = {wd: '', ext: '', debounce: '0', isStaymode: false, isDebug: false, data: {} as PathData};

const main = () => {
  const [direction, debounce, debugMode] = validArgs();
  cache.isStaymode = hasDebounceTime(debounce);
  cache.isDebug = debugMode === 'DEBUG';

  if (cache.isStaymode) {
    const instance = getStaymodeId(scriptName) || STAYMODE_ID;
    PPx.StayMode = instance;
    cache.debounce = debounce;
    debugMsg('linemessage', `start ${instance}`);
    atDebounce.hold(instance, debugMode);
  }

  ppx_resume(direction, debounce);
};

const ppx_resume = (direction = '1', debounce: string): void => {
  const sort = core.sortDetail(Number(direction), MSG.TOP, MSG.BOTTOM);
  const [pwd, namespace] = getPwd();
  const target = core.pathDetail(pwd);

  if (!target) {
    PPx.linemessage(`!"${MSG.ROOT}`);
    return;
  }

  const items = candidates(target, sort);

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

  if (items[num - 1]) {
    PPx.Execute(`*jumppath "${adjacentDir}"`);
  }

  // update value of the debounce time
  if (cache.isStaymode) {
    cache.debounce = debounce;
  }
};

const ppx_finally = (): void => {
  debugMsg('Echo', 'instance remain moveDirectory.stay.js');
};

/**
 * Whether to enable StayMode
 * @return boolean
 */
const hasDebounceTime = (debounce: string): boolean => {
  const n = Number(debounce);

  return !Number.isNaN(n) && n >= 1000;
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
const sortItems = (path: PathDetail, sort: SortDetail, mask: string): string | string[] => {
  let data: string | PathData;

  if (cache.isStaymode && cache.wd === path.wd && path.type < 61) {
    data = cache.data;
  } else if (cache.isStaymode && cache.wd === path.wd && path.type >= 61 && cache.ext === path.ext) {
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

    cache.wd = path.wd;
    cache.ext = path.ext;
    cache.data = data;
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
const candidates = (path: PathDetail, sort: SortDetail): string | string[] => {
  switch (path.type) {
    case 0:
    // return 'DirectoryType: 0, unknown';

    // create a list in consideration of attributes
    case 1:
    case 3:
      return sortItems(path, sort, 'a:d+s-');

    // create a list in consideration of the extension
    case 4:
    case 61:
    case 62:
    case 63:
    case 64:
    case 96:
      path.path = path.path.slice(0, -1);
      return sortItems(path, sort, path.ext);

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

/**
 * Display a debug message
 * @arg 0 {string} Specify PPx method
 * @arg 1 {string} Specify debug message
 */
const debugMsg = (method: 'linemessage' | 'Echo', msg: string): void => {
  cache.isDebug && PPx[method](`[DEBUG] ${msg}`);
};

main();
