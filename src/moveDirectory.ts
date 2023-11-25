/* @file Move to an adjacent directory
 * @arg 0 {number} - Direction of move. "0":previous | "1":next
 */

import {isError} from '@ppmdev/modules/guard.ts';
import {readLines} from '@ppmdev/modules/io.ts';
import {tmp, useLanguage} from '@ppmdev/modules/data.ts';
import {type SortDetail, type PathDetail, core} from './mod/core.ts';

const ROOT_MSG = '<<Root>>';
const TOP_MSG = '<Top>';
const BOTTOM_MSG = '<Bottom>';
const lang = {
  en: {
    noItem: 'No adjacent directories',
    notSupport: 'Not supported'
  },
  jp: {
    noItem: '隣接ディレクトリはありません',
    notSupport: '非対象'
  }
}[useLanguage()];

const main = (): void => {
  const arg = PPx.Arguments.length > 0 ? PPx.Arguments.Item(0) : '1';
  const sort = core.sortDetail(arg, TOP_MSG, BOTTOM_MSG);
  const [pwd, namespace] = getPwd();
  const target = core.pathDetail(pwd);

  if (!target) {
    PPx.linemessage(`!"${ROOT_MSG}`);
    PPx.Quit(1);
  }

  const items = candidates(target, sort);

  if (typeof items === 'string') {
    PPx.linemessage(`!"${items}`);
    PPx.Quit(1);
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
};

/**
 * Get current working directory.
 * @return ["working directory", "shell's namespace'"]
 */
const getPwd = (): [string, string?] => {
  const parent = PPx.Extract('%FDVN');

  return parent.indexOf('#:') === 0 ? [PPx.Extract('%FDN'), parent] : [parent];
};

/**
 * Sort directory paths
 * @return Error message or sorted directory paths
 */
const sortItems = (pwd: string, sort: SortDetail, mask: string): string | string[] => {
  const tempFile = tmp().file;
  const opts = `-mask:"${mask}" -utf8 -dir:on -subdir:off -listfile:${tempFile} -name`;
  PPx.Execute(`*whereis -path:"${pwd}\\" ${opts}`);
  const [error, data] = readLines({path: tempFile});

  if (isError(error, data)) {
    return data;
  }

  if (data.lines.length <= 1) {
    return lang.noItem;
  }

  return data.lines.sort((a: string, b: string): number => (a.toLowerCase() < b.toLowerCase() ? sort.l : sort.r));
};

const candidates = (path: PathDetail, sort: SortDetail): string | string[] => {
  switch (path.type) {
    case 0:
    // return 'DirectoryType: 0, unknown';

    // create a list in consideration of attributes
    case 1:
    case 3:
      return sortItems(path.pwd, sort, 'a:d+s-');

    // create a list in consideration of the extension
    case 4:
    case 63:
    case 64:
    case 96:
      path.path = path.path.slice(0, -1);
      return sortItems(path.pwd, sort, path.ext);

    default:
      return `DirectoryType: ${path.type}, ${lang.notSupport}`;
  }
};

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
