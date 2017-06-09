
// memory-store.js - A memory-backed store for simple-acl
module.exports = (function () {
  require('permission');
  var defer = process.nextTick;

  class PermissionCollection {
    constructor(permissions) {
      this.permissions = [];
      this.addPermissions(permissions);
    }
    addPermissions(permissions) {
      if (Array.isArray(permissions))
        permissions.forEach(this.addPermissions);
      else if (!this.hasPermission(permissions))
        this.permissions.push(permissions);
    }
    hasPermission(permission) {
      for (var i = 0; i < this.permissions.length; i++)
        if (this.permissions[i].isIdentical(permission))
          return true;
      return false;
    }
    assert(resource, method) {
      for (var i = 0; i < this.permissions.length; i++)
        if (this.permissions[i].isAllowed(resource, method))
          return true;
      return false;
    }
  }

  class Permission {
    constructor(resource, methods) {
      this.resource = resource;
      this.methods = [];
      this.addMethods(methods);
    }
    addMethods(methods) {
      if (Array.isArray(methods)){
        this.methods = this.methods.concat(methods);
        this.methods = arrayUnique(this.methods);
      }
      else if (!this.hasMethod(methods))
        this.methods.push(methods);
    }
    hasMethod(method) {
      if (this.methods.indexOf(method) != -1)
        return true;
      else return false;
    }
    isAllowed(resource, method) {
      console.log(resource + " is being tested for: " + this.resource);
      if (this.hasMethod(method) && resource.match("^" + this.resource + "$"))
        return true;
      else return false;
    }
    isIdentical(permission) {						// Check to see if the permission being compared against offers a UNIQUE ADDITION to this.methods
      return ((permission.resource == this.resource) && arrayUnique(this.methods.concat(permission.methods)).length == this.methods.length);
    }
  }

  function arrayUnique(array) {
    var a = array.concat();
    for (var i = 0; i < a.length; ++i) {
      for (var j = i + 1; j < a.length; ++j) {
        if (a[i] === a[j])
          a.splice(j--, 1);
      }
    }
    return a;
  }


  var MemoryStore = function () {
    this.rights = {};
  };

  MemoryStore.prototype =
    {
      'grant':
      function (grantee, resource, methods, callback) {
        //console.log("Giving " + grantee + " rights to " + methods + " " + resource);
        if (!(grantee in this.rights))
          this.rights[grantee] = new PermissionCollection([]);
        var permission = new Permission(resource, methods);
        this.rights[grantee].addPermissions(permission);
        defer(callback);
      }

      , 'assert':
      function (req, callback) {
        console.log(req.session.user + " is being asserted to have rights to " + req.method + " " + req.url);
        var list = this.rights[req.session.user];
        console.log(JSON.stringify(list));
        var ok;
        if ("undefined" === typeof list) {
          ok = false;
        } else
          ok = list.assert(req.url, req.method);
        console.log("Assert = " + ok);
        defer(function () { callback(null, ok); });
      }
      , 'revoke':
      function (grantee, resource, method, callback) {
        var permission = [resource, method];
        if (!(grantee in this.rights))
          return defer(callback);

        var list = this.rights[grantee]
          , index = list.indexOf(JSON.stringify(permission));

        if (index !== -1)
          list.splice(index, 1);

        defer(callback); // always succeeds
      }
    };
  return MemoryStore;
})();
