//!*script
/**
 * Move to an adjacent directory
 *
 * @arg 0 Destination. 0:previous | 1:next
 */

var script_name = PPx.scriptName;

var errors = function (method) {
  PPx.Execute('*script "%*name(D,"' + script_name + '")\\errors.js",' + method + ',' + script_name);
  PPx.Quit(-1);
};

var quitMsg = function (msg) {
  PPx.SetPopLineMessage('!"' + msg);
  PPx.Quit(1);
};

var g_dest = (function () {
  if (PPx.Arguments.Length === 0) {
    errors('arg');
  }

  return PPx.Arguments(0) | 0;
})();

var g_wd = (function () {
  var wd = {};
  PPx.Extract('%FDVN').replace(/^(.*)\\((?:.*\.)?(?!$)(.*))/, function (p0, p1, p2, p3) {
    wd = {
      path: p0 + '\\',
      pwd: p1,
      name: p2,
      ext: p3.toLowerCase(),
      type: PPx.DirectoryType
    };
    return;
  });

  typeof wd.pwd === 'undefined' && quitMsg('<<Root>>');

  return wd;
})();

var fso = PPx.CreateObject('Scripting.FileSystemObject');
var enumDir;
var g_subDir = [];
var g_pwd;
var moveDir;
var makeList = function (callback) {
  return function (value1, value2, message) {
    for (enumDir.moveFirst(); !enumDir.atEnd(); enumDir.moveNext()) {
      callback();
    }

    g_subDir.sort(function (a, b) {
      return a.toLowerCase() < b.toLowerCase() ? value1 : value2;
    });

    for (var i = g_subDir.length; i--; ) {
      if (g_subDir[i] === g_wd.name) {
        break;
      }
    }

    // Get the target directory name
    var dirName = g_subDir[Math.max(i - 1, 0)];
    if (typeof g_subDir[i - 1] !== 'undefined') {
      PPx.Execute('*jumppath "' + fso.BuildPath(g_pwd.Path, dirName) + '"');

      // Display the message at the end
      if (typeof g_subDir[i - 2] === 'undefined') {
        quitMsg('<' + message + '>');
      }
    }
  };
};

switch (g_wd.type) {
  case 0:
    quitMsg('DirectoryType: 0, unknown');
    break;

  // Create a list in consideration of attributes
  case 1:
    g_pwd = fso.GetFolder(g_wd.path).ParentFolder;
    enumDir = new Enumerator(g_pwd.SubFolders);
    moveDir = makeList(function () {
      var thisFile = fso.GetFolder(fso.BuildPath(g_pwd.Path, enumDir.item().Name));
      if (thisFile.Attributes <= 17) {
        g_subDir.push(enumDir.item().Name);
      }
    });
    break;

  // Create a list in consideration of the extension
  case 4:
  case 63:
  case 64:
  case 96:
    g_pwd = fso.GetFolder(g_wd.pwd);
    enumDir = new Enumerator(g_pwd.Files);
    moveDir = makeList(function () {
      var thisExt = fso
        .GetExtensionName(fso.BuildPath(g_pwd.Path, enumDir.item().Name))
        .toLowerCase();
      if (thisExt === g_wd.ext) {
        g_subDir.push(enumDir.item().Name);
      }
    });
    break;

  default:
    quitMsg('DirectoryType : ' + g_wd.dirType + ', Not supported');
    break;
}

g_dest === 0 ? moveDir(-1, 1, 'Top') : moveDir(1, -1, 'Bottom');
