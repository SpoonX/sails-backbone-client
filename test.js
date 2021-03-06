'use strict';

var assert = require('assert');
var path = require('path');
var SailsApp = require('sails').Sails;
var _ = require('lodash');
var BackboneClient;

describe('sails-backbone-client', function () {
  var url = 'http://localhost:1337/api/v1/backbonemodel';
  var schema;
  var app = new SailsApp();
  var hashpanel;
  var ns = {
    Miner: {
      foo: function () {
        return 'bar';
      },
      whoami: function () {
        return this.name;
      }
    }
  };

  var config = {
    appPath: path.dirname(require.resolve('hashware-api')),
    hooks: {
      grunt: false
    },
    config: {
      permissions: {
        adminUsername: 'admin@hashpanel.io',
        adminPassword: 'admin1234',
        adminEmail: 'admin@hashpanel.io'
      }
    }
  };

  before(function (done) {
    this.timeout(60 * 1000);

    var Backbone = require('backbone');
    Backbone.ajax = require('backbone.ajax');
    BackboneClient = require('./');

    app.lift(config, function (error, sails) {
      app = sails;

      done(error);
    });
  });

  describe('#create()', function () {
    it('should run without error', function (done) {
      this.timeout(20 * 1000);

      BackboneClient.create(url, ns)
        .then(function (api) {
          hashpanel = api;
          done();
        })
        .catch(function (error) {
          done(error);
        });

      //global.Backbone.Relational.store.addModelScope(hashpanel);
    });
    it.skip('should be fast (t < 20ms) * 100', function () {
      this.timeout(2000);
      for (var i = 0; i < 100; i++) {
        BackboneClient.create(url);
      }
    });
    it('can instantiate new model without error', function () {
      var account = new hashpanel.Miner();
      assert(_.isObject(account));
    });
    it('should define Collections for the models', function () {
      assert(hashpanel.MinerCollection);
      assert(hashpanel.MinerDeviceCollection);
    });
    it('should mixin any existing models of the same name', function () {

      var account = new hashpanel.Miner();
      assert(_.isFunction(account.foo));
      assert(_.isFunction(account.whoami));
      assert(account.foo() === 'bar');
      assert(account.whoami() === hashpanel.Miner.prototype.name, account.whoami());
    });
  });
  describe('#validate()', function () {
    it('should invalidate an invalid model using default validators', function (done) {
      var role = new hashpanel.Role({
        name: 1,
        active: 'hello'
      });
      role.once('validated', function (isValid, model, errors) {
        assert(!isValid);
        if (!_.isEmpty(errors)) {
          assert(_.isString(errors.name));
          assert(_.isString(errors.active));
          return done();
        }
        else {
          done(new Error('should be invalid'));
        }
      });
      role.validate();
    });
    it('should validate a valid model using default validators', function (done) {
      var role = new hashpanel.Role({
        name: 'role1',
        active: true
      });
      role.once('validated', function (isValid, model, errors) {
        assert(isValid, errors);
        done(_.isEmpty(errors) ? undefined : errors);
      });
      role.validate();
    });
    it('should invalidate an invalid model using default validators', function (done) {
      var role = new hashpanel.Role({
        name: 123,
        active: true
      });
      role.once('validated', function (isValid, model, errors) {
        assert(_.isObject(errors));
        assert.equal(errors.name, 'failed "string" validation');
        //assert(errors.
        done(_.isEmpty(errors) ? 'should fail invalidation' : undefined);
      });
      role.validate();
    });
    it('should validate a valid model with associations', function () {
      var miner = new hashpanel.Miner({
        name: 'testminer1',
        device: new hashpanel.MinerDevice({
          name: 'testdevice'
        })
      });
      assert(miner.isValid([ 'device' ]));
    });
  });
});
