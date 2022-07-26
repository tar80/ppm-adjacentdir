//!*script
// deno-lint-ignore-file no-var
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

var quitLinemsg = function (msg) {
  PPx.SetPopLineMessage('!"' + msg);
  PPx.Quit(1);
};

var sort_order = (function (arg) {
  if (arg.length === 0) {
    errors('arg');
  }

  return {
    0: {l: -1, r: 1, msg: 'top'},
    1: {l: 1, r: -1, msg: 'bottom'}
  }[arg.Item(0)];
})(PPx.Arguments);

var parent_dir = (function () {
  var wd = {};
  PPx.Extract('%FDVN').replace(/^(.*\\)((?:.*\.)?(?!$)(.*))/, function (p0, p1, p2, p3) {
    wd = {
      path: p0 + '\\',
      pwd: p1,
      name: p2,
      ext: p3.toLowerCase(),
      type: PPx.DirectoryType
    };
    return;
  });

  typeof wd.pwd === 'undefined' && quitLinemsg('<<Root>>');
  return wd;
})();

var fso = PPx.CreateObject('Scripting.FileSystemObject');
var candidates = (function () {
  var sortPath = function (prop, method, callback) {
    var paths = [];
    var pwd = fso.GetFolder(parent_dir.pwd);
    var e = new Enumerator(pwd[prop]);

    for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
      var thisItem = fso[method](fso.BuildPath(pwd.Path, e.item().Name));

      callback(paths, thisItem, e);
    }

    if (paths.length === 1) {
      quitLinemsg('No adjacent directories');
    }

    return paths.sort(function (a, b) {
      return a.toLowerCase() < b.toLowerCase() ? sort_order.l : sort_order.r;
    });
  };

  switch (parent_dir.type) {
//     case 0:
//       quitLinemsg('DirectoryType: 0, unknown');
//       break;

    // Create a list in consideration of attributes
    case 1:
      return sortPath('SubFolders', 'GetFolder', function (paths, thisPath, e) {
        if (thisPath.Attributes <= 48) {
          return paths.push(e.item().Name);
        }
      });

    // Create a list in consideration of the extension
    case 4:
    case 63:
    case 64:
    case 96:
      return sortPath('Files', 'GetExtensionName', function (paths, thisExt, e) {
        if (thisExt.toLowerCase() === parent_dir.ext) {
          return paths.push(e.item().Name);
        }
      });

    default:
      quitLinemsg('DirectoryType : ' + parent_dir.dirType + ', Not supported');
      break;
  }
})();

// Get the target directory name
var i = candidates.length;
for (; i--; ) {
  if (candidates[i] === parent_dir.name) {
    break;
  }
}

var target_path = candidates[Math.max(i - 1, 0)];

// Display the message at the end
if (typeof candidates[i - 2] === 'undefined') {
  PPx.SetPopLineMessage('!"<' + sort_order.msg + '>');
}

if (typeof candidates[i - 1] !== 'undefined') {
  PPx.Execute('*jumppath "' + fso.BuildPath(parent_dir.pwd, target_path) + '"');
}
