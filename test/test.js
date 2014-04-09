
var nano = require('nano');
var pwd = require('../');

describe('couch-pwd', function() {

  it('should generate a salt and hash', function(done){
    pwd.hash('foobar', function(err, salt, hash){
      if (err) return done(err);
      salt.should.be.a.String;
      hash.should.be.a.String;
      done();
    });
  });

  it('should pass an error when pass is missing', function(done){
    pwd.hash(null, function(err, salt, hash){
      err.message.should.include('password missing');
      done();
    });
  });

  it('should generate a hash', function(done){
    pwd.hash('foobar', function(err, salt, hash){
      pwd.hash('foobar', salt, function(err, cpm){
        cpm.should.equal(hash);
        done();
      });
    });
  });

  it('should pass an error when pass is missing', function(done){
    pwd.hash(null, 'asdf', function(err, salt, hash){
      err.message.should.include('password missing');
      done();
    });
  });

  it('should pass an error when salt is missing', function(done){
    pwd.hash('asdf', null, function(err, salt, hash){
      err.message.should.include('salt missing');
      done();
    });
  });

  it('should work with salt and hash from CouchDB', function(done) {

    var db = require('nano')('http://localhost:5984/_users');

    // create dummy user
    var dummy = {
      name: 'john',
      password: 'secret',
      roles: [],
      type: 'user'
    };

    // add dummy user to db
    db.insert(dummy, 'org.couchdb.user:john', function(err, body) {
      if (err) console.log(err);

      // get user from db
      db.get('org.couchdb.user:john', function(err, user) {
        if (err) console.log(err);

        // test
        pwd.hash('secret', user.salt, function(err, hash) {
          hash.should.equal(user.derived_key);
          done();
        });

      });
    });


  });

  // make sure CouchDB doesn't override salt and derived_salt with its own values
  it('should allow manual updates for salt and derived_key', function(done) {

    var db = require('nano')('http://localhost:5984/_users');

    // get user from db
    db.get('org.couchdb.user:john', function(err, user) {
      if (err) console.log(err);

      // create salt and hash for new password
      pwd.hash('awesome', function(err, salt, hash) {
        if (err) console.log(err);

        // save values for later test
        var salt1 = salt;
        var hash1 = hash;

        // override existing values
        user.salt = salt;
        user.derived_key = hash;

        // update user in db
        db.insert(user, function(err, res) {
          if (err) console.log(err);

          // get updated user from db with hopefully old salt and key values
          db.get('org.couchdb.user:john', function(err, user) {

            user.salt.should.equal(salt1);
            user.derived_key.should.equal(hash1);

            // remove user
            db.destroy('org.couchdb.user:john', user._rev, done);

          });

        });

      });

    });

  });

  it('should set iterations', function(done){
    pwd.iterations().should.equal(10);
    pwd.iterations(20);
    pwd.iterations().should.equal(20);
    done();
  });

  it('should set keylen', function(done){
    pwd.keylen().should.equal(20);
    pwd.keylen(30);
    pwd.keylen().should.equal(30);
    done();
  });

  it('should set size', function(done){
    pwd.size().should.equal(16);
    pwd.size(32);
    pwd.size().should.equal(32);
    done();
  });

  it('should set encoding', function(done){
    pwd.encoding().should.equal('hex');
    pwd.encoding('base64');
    pwd.encoding().should.equal('base64');
    done();
  });

});
