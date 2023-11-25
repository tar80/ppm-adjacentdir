//!*script
/**
 * Move to an adjacent directory
 *
 * @arg 0 Destination. 0:previous | 1:next
 */

'use strict';

/* Initial */
const io = NETAPI.System.IO;
const module_dir = PPx.Extract('%*getcust(S_ppm#global:module)');

const {error} = await import(`${module_dir}/errors.mjs`);

const quitLinemsg = (msg) => {
  PPx.SetPopLineMessage(`!"${msg}`);
  PPx.Quit(1);
};

const sort_order = ((arg = PPx.Arguments) => {
  if (arg.length === 0) {
    error();
    PPx.Quit(-1);
  }

  return {
    '0': {l: -1, r: 1, msg: 'Top'},
    '1': {l: 1, r: -1, msg: 'Bottom'}
  }[arg.Item(0)];
})();

const parent_dir = (() => {
  let wd = {};
  PPx.Extract('%FDVN').replace(/^(.*\\)((?:.*\.)?(?!$)(.*))/, (p0, p1, p2, p3) => {
    wd = {
      path: p0,
      pwd: p1,
      name: p2,
      ext: p3,
      type: PPx.DirectoryType
    };
  });

  wd.pwd === undefined && quitLinemsg('<<Root>>');
  return wd;
})();

const candidates = (() => {
  const sortPath = (method = 'GetDirectories', pattern = '*') => {
    const path_list = io.Directory[method](parent_dir.pwd, pattern);
    const paths = [];

    for (const path of path_list) {
      paths.push(path);
    }

    return paths.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? sort_order.l : sort_order.r));
  };

  switch (parent_dir.type) {
    case 0:
      // return quitLinemsg('DirectoryType: 0, unknown');

    // Create a list in consideration of attributes
    case 1:
      return sortPath();

    // Create a list in consideration of the extension
    case 4:
    case 63:
    case 64:
    case 96:
      return sortPath('GetFiles', `*.${parent_dir.ext}`);

    default:
      return quitLinemsg(`DirectoryType : ${parent_dir.type}, Not supported`);
  }
})();

if (candidates.length <= 1) {
  quitLinemsg('No adjacent directory');
}

// Get the target directory name
const i = candidates.indexOf(parent_dir.path);
const target_path = candidates[Math.max(i - 1, 0)];

// Display the message at the end
if (candidates[i - 2] === undefined) {
  PPx.SetPopLineMessage(`!"<${sort_order.msg}>`);
}

if (candidates[i - 1] !== undefined) {
  PPx.Execute(`*jumppath "${target_path}"`);
}
