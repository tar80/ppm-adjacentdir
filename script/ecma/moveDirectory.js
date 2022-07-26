//!*script
/**
 * Move to an adjacent directory
 *
 * @arg 0 Destination. 0:previous | 1:next
 */

'use strict';

const script_name = PPx.scriptName;

const errors = (method) => {
  PPx.Execute(`*script "%*name(D,"${script_name}")\\errors.js",${method},${script_name}`);
  PPx.Quit(-1);
};

const quitLinemsg = (msg) => {
  PPx.SetPopLineMessage(`!"${msg}`);
  PPx.Quit(1);
};

const g_tempfile = PPx.Extract('%*temp()\\movedir');
const sort_order = ((arg = PPx.Arguments) => {
  if (arg.length === 0) {
    errors('arg');
  }

  return {
    0: {l: -1, r: 1, msg: 'top'},
    1: {l: 1, r: -1, msg: 'bottom'}
  }[arg.Item(0)];
})();

const parent_dir = (() => {
  let wd = {};
  PPx.Extract('%FDVN').replace(/^(.*)\\((?:.*\.)?(?!$)(.*))/, (p0, p1, p2, p3) => {
    wd = {
      path: `${p0}\\`,
      pwd: p1,
      name: p2,
      ext: `.${p3.toLowerCase()}`,
      type: PPx.DirectoryType
    };
    return;
  });

  wd.pwd === undefined && quitLinemsg('<<Root>>');
  return wd;
})();

const fso = PPx.CreateObject('Scripting.FileSystemObject');
const candidates = (() => {
  const paths = [];
  const sortPath = (mask) => {
    PPx.Execute(
      `*whereis -path:"${parent_dir.pwd}\\" -mask:"${mask}" -dir:on -subdir:off -listfile:${g_tempfile} -name`
    );
    const readFile = fso.OpenTextFile(g_tempfile, 1, false, -1);

    readFile.AtEndOfLine && quitLinemsg('Empty');

    while (!readFile.AtEndOfStream) {
      paths.push(readFile.ReadLine());
    }

    readFile.Close();

    if (paths.length === 1) {
      quitLinemsg('No adjacent directories');
    }

    return paths.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? sort_order.l : sort_order.r));
  };

  switch (parent_dir.type) {
    case 0:
//       quitLinemsg('DirectoryType: 0, unknown');
//       break;

    // Create a list in consideration of attributes
    case 1:
      return sortPath('a:d+s-');

    // Create a list in consideration of the extension
    case 4:
    case 63:
    case 64:
    case 96:
      parent_dir.path = parent_dir.path.slice(0, -1);
      return sortPath(parent_dir.ext);

    default:
      quitLinemsg(`DirectoryType : ${parent_dir.type}, Not supported`);
      break;
  }
})();

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
