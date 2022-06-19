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

const quitMsg = (msg) => {
  PPx.SetPopLineMessage(`!"${msg}`);
  PPx.Quit(1);
};

const g_tempfile = PPx.Extract('%*temp()\\movedir');
const g_dest = (() => {
  if (PPx.Arguments.Length === 0) {
    errors('arg');
  }

  return PPx.Arguments(0) | 0;
})();

const g_wd = (() => {
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

  wd.pwd === undefined && quitMsg('<<Root>>');
  return wd;
})();

{
  const whereIs = (mask) => {
    PPx.Execute(
      `*whereis -path:"${g_wd.pwd}%\\" -mask:"${mask}" -dir:on -subdir:off -listfile:${g_tempfile} -name`
    );
  };

  switch (g_wd.type) {
    case 0:
      quitMsg('DirectoryType: 0, unknown');
      break;

    // Create a list in consideration of attributes
    case 1:
      whereIs('a:d+s-');
      break;

    // Create a list in consideration of the extension
    case 4:
    case 63:
    case 64:
    case 96:
      whereIs(g_wd.ext);
      g_wd.path = g_wd.path.slice(0, -1);
      break;

    default:
      quitMsg(`DirectoryType : ${g_wd.type}, Not supported`);
      break;
  }
}

const moveDir = (valA, valB, message) => {
  const fso = PPx.CreateObject('Scripting.FileSystemObject');
  const readFile = fso.OpenTextFile(g_tempfile, 1, false, -1);
  const dirList = [];

  readFile.AtEndOfLine && quitMsg('Empty');

  while (!readFile.AtEndOfStream) {
    dirList.push(readFile.ReadLine());
  }

  readFile.Close();

  if (dirList.length === 1) {
    quitMsg('Not found');
  }

  dirList.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? valA : valB));

  // Get the target directory name
  const i = dirList.indexOf(g_wd.path);
  const nextDir = dirList[Math.max(i - 1, 0)];

  // Display the message at the end
  if (dirList[i - 2] === undefined) {
    PPx.SetPopLineMessage(`!"<${message}>`);
  }

  if (dirList[i - 1] !== undefined) {
    PPx.Execute(`*jumppath "${nextDir}"`);
  }
};

g_dest === 0 ? moveDir(-1, 1, 'Top') : moveDir(1, -1, 'Bottom');
