(function() {
  var async, coffee, diff, fs, help, ls, path, pull, request, resolveFiles, root, run, status, _, _buffers_equal, _get_remote, _ls, _status;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  }, __slice = Array.prototype.slice;
  fs = require("fs");
  path = require("path");
  coffee = require("coffee-script");
  request = require("request");
  require("bufferjs");
  async = require("async");
  _ = require("underscore")._;
  require("colors");
  resolveFiles = function(urls, cb) {
    var files;
    files = [];
    return async.forEach(urls, function(_arg, cb) {
      var buffers, name, r, url;
      name = _arg[0], url = _arg[1];
      buffers = [];
      r = request(url);
      r.on("data", function(data) {
        return buffers.push(data);
      });
      return r.on("end", function() {
        files.push([name, Buffer.concat(buffers)]);
        return cb();
      });
    }, function() {
      return cb(files);
    });
  };
  _ls = function(param, cb) {
    return async.map([path.resolve(__dirname, "../register/"), "."], fs.readdir, function(err, files) {
      var isvalid, register, results, _i, _len, _ref;
      results = [];
      _ref = files[0];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        register = _ref[_i];
        register = register.replace(/\.coffee$/, "");
        if (param.length && __indexOf.call(param, register) < 0) {
          continue;
        }
        isvalid = function(name) {
          return name.match(new RegExp("^" + register + "\.", "i"));
        };
        if (_.any(files[1], isvalid)) {
          results.push({
            name: register,
            files: _.filter(files[1], isvalid)
          });
        }
      }
      return cb(results);
    });
  };
  ls = function(param) {
    return _ls(param, function(results) {
      var files, name, _i, _len, _ref, _results;
      _results = [];
      for (_i = 0, _len = results.length; _i < _len; _i++) {
        _ref = results[_i], name = _ref.name, files = _ref.files;
        _results.push(console.log("" + name.bold + ": " + files));
      }
      return _results;
    });
  };
  _get_remote = function(name, cb) {
    var filename;
    filename = path.resolve(__dirname, "../register/" + name + ".coffee");
    return path.exists(filename, function(exists) {
      if (exists) {
        return fs.readFile(filename, function(err, data) {
          var asset;
          if (err) {
            throw err;
          }
          asset = coffee.eval(data.toString('utf8'), {
            sandbox: {
              resolveFiles: resolveFiles,
              console: console
            }
          });
          return asset.getLatest(cb);
        });
      } else {
        return console.log("No package " + name + " found.");
      }
    });
  };
  _buffers_equal = function(b1, b2) {
    var b, i, _len;
    if (b1.length !== b2.length) {
      return false;
    }
    for (i = 0, _len = b1.length; i < _len; i++) {
      b = b1[i];
      if (b !== b2[i]) {
        return false;
      }
    }
    return true;
  };
  _status = function(param, cb) {
    var results;
    results = [];
    return _ls(param, function(list) {
      return async.forEach(list, function(_arg, cb) {
        var fdata, files, name;
        name = _arg.name, files = _arg.files;
        fdata = [];
        results.push({
          name: name,
          files: fdata
        });
        return _get_remote(name, function(files) {
          return async.forEach(files, function(_arg2, cb) {
            var data, fname, res;
            fname = _arg2[0], data = _arg2[1];
            res = {
              name: fname,
              remotedata: data.length,
              localdata: [],
              changed: true
            };
            fdata.push(res);
            return path.exists(fname, function(exists) {
              if (!exists) {
                return cb();
              }
              return fs.readFile(fname, function(err, localdata) {
                if (err) {
                  return cb();
                }
                res.localdata = localdata.length;
                if (_buffers_equal(data, localdata)) {
                  res.changed = false;
                }
                return cb();
              });
            });
          }, function() {
            return cb();
          });
        });
      }, function() {
        return cb(results);
      });
    });
  };
  status = function(param) {
    return _status(param, function(results) {
      return console.log(JSON.stringify(results));
    });
  };
  pull = function(names) {
    var name, _i, _len, _results;
    if (!names.length) {
      throw "You have to specify a name for pull command.";
    }
    _results = [];
    for (_i = 0, _len = names.length; _i < _len; _i++) {
      name = names[_i];
      _results.push(_get_remote(name, function(files) {
        return _.each(files, function(_arg) {
          var data, file;
          file = _arg[0], data = _arg[1];
          return fs.writeFile(file, data, function(err) {
            if (err) {
              throw err;
            }
            return console.log("Loaded file " + file);
          });
        });
      }));
    }
    return _results;
  };
  diff = function(param) {
    throw "diff not implemented";
  };
  run = function(opts) {
    var cmd, param;
    cmd = opts[0], param = 2 <= opts.length ? __slice.call(opts, 1) : [];
    try {
      switch (cmd) {
        case "ls":
          return ls(param);
        case "pull":
          return pull(param);
        case "status":
          return status(param);
        case "diff":
          return diff(param);
        case cmd:
          throw "No such command " + cmd;
          break;
        default:
          return help();
      }
    } catch (e) {
      console.log("Error: " + e);
      return help();
    }
  };
  help = function(e) {
    return console.log("Usage: \n  vendor ls [name]      - list assets loaded in current dir\n  vendor pull name      - download asset\n  vendor status [name]  - check if there are updates\n  vendor diff name      - diff current version with latest possible");
  };
  root = module.exports = {
    run: run,
    help: help,
    resolveFiles: resolveFiles
  };
}).call(this);